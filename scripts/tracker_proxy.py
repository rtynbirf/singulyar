#!/usr/bin/env python3
"""
СИНГУЛЯР — Локальный P2P Proxy Server
======================================

Запуск:
    python3 /home/z/my-project/scripts/tracker_proxy.py

Порт: 8765 (http://localhost:8765)

Маршруты:
    /                   → redirect → streaming.html
    /streaming.html     → каталог тайтлов
    /title.html         → страница тайтла (?id=N)
    /webtorrent.min.js  → WebTorrent SDK (локально)
    /known_magnets.js   → кэш проверенных magnet'ов (23 тайтла)
    /api/search?q=...   → поиск свежих magnet'ов на rutor.info (через curl_cffi)
    /api/health         → статус
    /api/magnets        → отдать весь known_magnets как JSON

Cookies: НЕ нужны для rutor.info (он публичный, без Cloudflare).
Cookies для rutracker.org — НЕ используются (Cloudflare блокирует).

Архитектура суверенна:
- Код запущен локально у пользователя (PID = 1 = КОМАНДИР)
- Никаких внешних API, никакой третьей стороны
- Magnet'ы кэшируются в known_magnets.js (регенерируется при /api/search)
"""
import os
import sys
import json
import re
import urllib.parse
import urllib.request
import http.server
import socketserver
import threading
import time
import datetime
import concurrent.futures
from pathlib import Path

# Ensure curl_cffi is available
try:
    from curl_cffi import requests as curl_requests
    HAS_CURL_CFFI = True
except ImportError:
    HAS_CURL_CFFI = False
    print("[WARN] curl_cffi not installed — /api/search won't work. Run:")
    print("       /home/z/.venv/bin/python3 -m pip install curl_cffi")

# === Config ===
ROOT = Path("/home/z/my-project/download")
PORT = 8765
COOKIES_FILE = "/home/z/.rt_cookies.txt"  # not used by rutor (no Cloudflare)
KNOWN_MAGNETS_PATH = ROOT / "known_magnets.js"
AUTOPILOT_CACHE_PATH = Path("/home/z/my-project/scripts/autopilot_cache.json")

# Piped instances for YouTube search proxy (no API key needed)
PIPED_INSTANCES = [
    'https://api.piped.private.coffee',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.r4fo.com',
    'https://pipedapi.leptons.xyz',
]

AUTOPILOT_EXCLUDE_RE = re.compile(
    r'trailer|reaction|reacci[óo]n|reaktion|r[eé]action|recap|fmv|highlight|'
    r'kissing|ost\b|music video|mv\b|'
    r'preview|teaser|promo|behind the scene|bts|'
    r'interview|compilation|fan made|fanmade|cover|'
    r'gameplay|walkthrough|lets play|speed ?run|'
    r'review[^s]|обзор(?! дорам)',
    re.IGNORECASE
)
AUTOPILOT_INCLUDE_RE = re.compile(r'ep[\s.\-]?\d|episode|сери[яи]|full\s*ep|полная\s*серия|озвучка|дубляж|дубл|перевод', re.IGNORECASE)
AUTOPILOT_MIN_DURATION = 600  # 10 min — skip clips

# In-memory cache: {cache_key: {data, expires_at}}
_autopilot_cache = {}
AUTOPILOT_TTL = 600  # 10 minutes

# wss trackers — added to every magnet link so browser WebTorrent can connect to swarm
WSS_TRACKERS = [
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.files.market',
]


def dice_coefficient(a, b):
    if not a or not b: return 0.0
    a = re.sub(r'\s+', ' ', a.lower().strip())
    b = re.sub(r'\s+', ' ', b.lower().strip())
    if a == b: return 1.0
    def bigrams(s):
        if len(s) < 2: return set()
        return set(s[i:i+2] for i in range(len(s)-1))
    bg_a, bg_b = bigrams(a), bigrams(b)
    if not bg_a or not bg_b: return 0.0
    return 2.0 * len(bg_a & bg_b) / (len(bg_a) + len(bg_b))


def _piped_fetch(query):
    """Try multiple Piped instances in parallel."""
    def _try(inst):
        url = f'{inst}/search?q={urllib.parse.quote(query)}&filter=videos'
        try:
            req = urllib.request.Request(url, headers={
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            })
            with urllib.request.urlopen(req, timeout=12) as r:
                d = json.loads(r.read().decode('utf-8', errors='replace'))
                items = d.get('items', []) or []
                for it in items:
                    it['_instance'] = inst
                return items
        except Exception:
            return []

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(PIPED_INSTANCES)) as ex:
        futures = [ex.submit(_try, inst) for inst in PIPED_INSTANCES]
        results = []
        for fut in concurrent.futures.as_completed(futures):
            try:
                items = fut.result()
                if items:
                    results.extend(items)
            except Exception:
                pass
    seen = set()
    deduped = []
    for it in results:
        vid = (it.get('url', '') or '').replace('/watch?v=', '')
        if vid and vid not in seen:
            seen.add(vid)
            deduped.append(it)
    return deduped


def _rutube_fetch(query):
    """DISABLED — Rutube shows ads (99₽/month paywall). Returns empty list.
    Replaced by sovereign sources: Rutor + Nyaa + Archive.org."""
    return []


def _rutor_fetch(query):
    """Search rutor.info — open Russian torrent tracker, no ads in magnet links.
    Returns list of {title, magnet, hash, size, seeds, leechers}."""
    url = f'https://rutor.info/search/{urllib.parse.quote(query)}/0/0/0/0'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
            'Accept-Language': 'ru-RU,ru;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        })
        with urllib.request.urlopen(req, timeout=12) as r:
            html = r.read().decode('utf-8', errors='replace')
        # Parse magnets + titles
        # Each result: <a href="magnet:?xt=urn:btih:HASH..." ...>...
        # Title: <a href="/torrent/NNN/..." ...>TITLE</a>
        magnets = re.findall(r'href="(magnet:\?xt=urn:btih:([a-fA-F0-9]{40})[^"]*)"', html)
        titles = re.findall(r'href="/torrent/(\d+)/[^"]+"[^>]*>([^<]+)</a>', html)
        results = []
        seen = set()
        for magnet_url, info_hash in magnets:
            if info_hash.lower() in seen: continue
            seen.add(info_hash.lower())
            title = ''
            for tid, t in titles:
                if tid and t:
                    title = t.strip()
                    break
            results.append({
                'id': info_hash.lower(),
                'title': title or query,
                'magnet': magnet_url,
                'info_hash': info_hash.lower(),
                'source': 'rutor',
            })
        return results
    except Exception:
        return []


def _nyaa_fetch(query):
    """Search nyaa.si — Asian BL/GL content tracker (anime/manga/drama).
    Returns list of dicts with magnet links."""
    url = f'https://nyaa.si/?f=0&c=0_0&q={urllib.parse.quote(query)}&s=seeders&o=desc'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
        })
        with urllib.request.urlopen(req, timeout=12) as r:
            html = r.read().decode('utf-8', errors='replace')
        # Parse result rows
        results = []
        row_re = re.compile(r'<tr class="(?:default|success|danger)">.*?</tr>', re.DOTALL)
        for row in row_re.findall(html):
            tm = re.search(r'<a href="/view/(\d+)"[^>]*>([^<]+)</a>', row)
            mm = re.search(r'href="(magnet:\?xt=urn:btih:([a-fA-F0-9]{40})[^"]*)"', row, re.IGNORECASE)
            if not (tm and mm): continue
            tid = tm.group(1)
            title = tm.group(2).strip()
            magnet_url = mm.group(1)
            info_hash = mm.group(2).lower()
            size_m = re.search(r'<td class="text-center[^"]*">(\d+(?:\.\d+)?\s*[KMGT]?i?B)</td>', row)
            size = size_m.group(1) if size_m else None
            seed_m = re.search(r'<span class="text-success">(\d+)</span>', row)
            seeds = int(seed_m.group(1)) if seed_m else 0
            results.append({
                'id': info_hash,
                'title': title,
                'magnet': magnet_url,
                'info_hash': info_hash,
                'size': size,
                'seeds': seeds,
                'source': 'nyaa',
            })
        return results
    except Exception:
        return []


def _archive_fetch(query):
    """Search archive.org — public domain, no ads, direct video URLs."""
    url = f'https://archive.org/advancedsearch.php?q={urllib.parse.quote(query + " AND medatype:(movies)")}&fl[]=identifier&fl[]=title&fl[]=description&fl[]=downloads&sort[]=downloads desc&rows=10&output=json'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
            'Accept': 'application/json',
        })
        with urllib.request.urlopen(req, timeout=12) as r:
            d = json.loads(r.read().decode('utf-8', errors='replace'))
        docs = d.get('response', {}).get('docs', [])
        results = []
        for doc in docs:
            ident = doc.get('identifier', '')
            title = doc.get('title', '') or ''
            if isinstance(title, list):
                title = title[0] if title else ''
            results.append({
                'id': ident,
                'title': title,
                'embed_url': f'https://archive.org/embed/{ident}',
                'archive_id': ident,
                'source': 'archive',
            })
        return results
    except Exception:
        return []


# === NNM-Club integration ===
NNM_COOKIES_FILE = '/home/z/.nnm_cookies.txt'
NNM_PORTAL_CATEGORIES = {
    3: 'Зарубежные сериалы',
    4: 'Зарубежное кино',
    6: 'Наше кино',
    10: 'Аниме',
    11: 'Мультфильмы',
}


def _nnm_load_cookies():
    """Load NNM-Club cookies from Netscape file."""
    if not os.path.exists(NNM_COOKIES_FILE):
        return {}
    cookies = {}
    try:
        with open(NNM_COOKIES_FILE) as f:
            for line in f:
                if line.startswith('#') or not line.strip(): continue
                parts = line.strip().split('\t')
                if len(parts) >= 7 and parts[0] == '.nnmclub.to':
                    cookies[parts[5]] = parts[6]
    except Exception:
        return {}
    return cookies


def _nnm_fetch_portal(cat_id):
    """Browse NNM-Club portal.php?c=N, extract torrents with magnet links."""
    # Use curl_cffi for TLS impersonation
    try:
        from curl_cffi import requests as cf_requests
        cookies = _nnm_load_cookies()
        if not cookies:
            return []
        url = f'https://nnmclub.to/forum/portal.php?c={cat_id}'
        r = cf_requests.get(url, impersonate='chrome', timeout=20, cookies=cookies,
            headers={'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
                     'Accept-Language': 'ru-RU,ru;q=0.9'})
        if r.status_code != 200:
            return []
        html = r.text
    except Exception:
        return []

    # Split by download.php?id= anchors
    blocks = re.split(r'href="download\.php\?id=(\d+)"', html)
    torrents = []

    for i in range(1, len(blocks) - 1, 2):
        download_id = blocks[i]
        content = blocks[i + 1]

        # Magnet — use case-insensitive [a-fA-F0-9]
        mag_m = re.search(r'href="(magnet:\?xt=urn:btih:([a-fA-F0-9]{40}))[^"]*"', content)
        if not mag_m:
            continue
        magnet_url = mag_m.group(1)
        info_hash = mag_m.group(2).lower()

        # Size
        size_m = re.search(r'<span class="pcomm bold">\s*(\d+(?:\.\d+)?)\s*(ГБ|МБ|ТБ|КБ|GB|MB|TB|KB)\s*</span>', content)
        size = f"{size_m.group(1)} {size_m.group(2)}" if size_m else None

        # Seeds
        seed_m = re.search(r'<span class="seed[^"]*"[^>]*>\s*(\d+)\s*</span>', content)
        seeds = int(seed_m.group(1)) if seed_m else 0
        leech_m = re.search(r'<span class="leech[^"]*"[^>]*>\s*(\d+)\s*</span>', content)
        leechers = int(leech_m.group(1)) if leech_m else 0

        # Title — look for the <a class="pgenmed" href="viewtopic.php?t=N" title="TITLE">
        # pattern (this is the actual torrent title, not "Читать дальше...")
        backward = blocks[i - 1][-6000:] if i > 0 else ''
        # First, try the specific class pattern
        title_m = re.search(r'<a\s+class="pgenmed"\s+href="viewtopic\.php\?t=(\d+)"\s+title="([^"]+)"', backward)
        if title_m:
            topic_id = title_m.group(1)
            # Title is HTML-encoded — decode entities
            title = title_m.group(2).replace('&amp;', '&').replace('&quot;', '"').replace('&#039;', "'").replace('&#39;', "'").replace('&lt;', '<').replace('&gt;', '>').replace('&nbsp;', ' ').strip()
        else:
            # Fallback: any viewtopic link with significant title text (>20 chars)
            titles_before = re.findall(r'<a[^>]*href="viewtopic\.php\?t=(\d+)"[^>]*>([^<]{20,})</a>', backward)
            topic_id, title = (None, '')
            if titles_before:
                topic_id, title = titles_before[-1]
                title = title.strip()

        # Russian dub detection
        is_russian = 'Язык озвучки</b>: Русский' in backward
        has_russian_kw = bool(re.search(r'русск|озвучк|дубл|Rus\s*sub|RU\b', backward, re.IGNORECASE))

        torrents.append({
            'download_id': download_id,
            'topic_id': topic_id,
            'title': title,
            'magnet': magnet_url,
            'info_hash': info_hash,
            'size': size,
            'seeds': seeds,
            'leechers': leechers,
            'is_russian_dub': is_russian or has_russian_kw,
            'download_url': f'https://nnmclub.to/forum/download.php?id={download_id}',
            'category': cat_id,
            'source': 'nnmclub',
        })

    return torrents


# Patterns indicating Russian dubbing (boost score if found)
RU_DUB_RE = re.compile(
    r'озвучка|русск|русская|русский|рус\.|dub|дубл|дубляж|перевод|амаред|студия',
    re.IGNORECASE
)
# Pattern indicating the video is in Russian language content
RU_LANG_RE = re.compile(r'рус|ru\b|ru[\s/]|sub\s*ru', re.IGNORECASE)


def autopilot_resolve(target_title, episode_num, query_override=None, russian_name=None):
    """Find video sources for given title+episode.

    Searches YouTube (via Piped) AND Rutube in parallel.
    Russian-dubbed sources get a score boost.
    """
    if query_override:
        query = query_override
    else:
        clean = re.sub(r'\s*\(.*?\)\s*', ' ', target_title).strip()
        if re.search(r'[а-яА-Я]', clean):
            query = f'{clean} ep {episode_num}'
        else:
            query = f'{clean} episode {episode_num}'

    # Cache key — also includes russian_name for proper cache differentiation
    cache_key = f'{query}|{target_title}|{episode_num}|{russian_name or ""}'
    now = time.time()
    if cache_key in _autopilot_cache:
        entry = _autopilot_cache[cache_key]
        if entry['expires_at'] > now:
            entry['data']['cached'] = True
            return entry['data']

    # Build multiple search queries in parallel
    queries_yt = [
        query,  # original (English/Thai)
        f'{target_title} ep {episode_num}',  # by Russian name
        f'{target_title} озвучка серия {episode_num}' if russian_name or re.search(r'[а-яА-Я]', target_title) else None,
        f'{target_title} русская озвучка' if re.search(r'[а-яА-Я]', target_title) else None,
    ]
    queries_yt = [q for q in queries_yt if q]

    # Rutor queries — open Russian tracker, magnet links (no ads)
    rutor_queries = [f'{target_title} {episode_num}']

    # Nyaa queries — Asian content, magnet links
    nyaa_queries = [f'{target_title} ep {episode_num}', target_title]

    # Archive.org — public domain videos
    archive_queries = [target_title, f'{target_title} {episode_num}']

    # Run ALL searches in parallel — 12+ workers
    yt_futures = []
    rutor_futures = []
    nyaa_futures = []
    archive_futures = []
    nnm_futures = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
        for q in queries_yt[:3]:
            yt_futures.append(ex.submit(_piped_fetch, q))
        for q in rutor_queries[:2]:
            rutor_futures.append(ex.submit(_rutor_fetch, q))
        for q in nyaa_queries[:2]:
            nyaa_futures.append(ex.submit(_nyaa_fetch, q))
        for q in archive_queries[:2]:
            archive_futures.append(ex.submit(_archive_fetch, q))
        nnm_futures.append(ex.submit(_nnm_fetch_portal, 3))
        nnm_futures.append(ex.submit(_nnm_fetch_portal, 4))

        yt_items = []
        for fut in yt_futures:
            try:
                items = fut.result()
                if items:
                    yt_items.extend(items)
            except Exception:
                pass

        rutor_items = []
        for fut in rutor_futures:
            try:
                items = fut.result()
                if items:
                    rutor_items.extend(items)
            except Exception:
                pass

        nyaa_items = []
        for fut in nyaa_futures:
            try:
                items = fut.result()
                if items:
                    nyaa_items.extend(items)
            except Exception:
                pass

        archive_items = []
        for fut in archive_futures:
            try:
                items = fut.result()
                if items:
                    archive_items.extend(items)
            except Exception:
                pass

        nnm_items = []
        for fut in nnm_futures:
            try:
                items = fut.result()
                if items:
                    nnm_items.extend(items)
            except Exception:
                pass

    # Dedupe YT items
    seen_yt = set()
    yt_deduped = []
    for it in yt_items:
        vid = (it.get('url', '') or '').replace('/watch?v=', '')
        if vid and vid not in seen_yt:
            seen_yt.add(vid)
            yt_deduped.append(it)

    # Dedupe Rutor items
    seen_rutor = set()
    rutor_deduped = []
    for it in rutor_items:
        h = it.get('info_hash', '')
        if h and h not in seen_rutor:
            seen_rutor.add(h)
            rutor_deduped.append(it)

    # Dedupe Nyaa items
    seen_nyaa = set()
    nyaa_deduped = []
    for it in nyaa_items:
        h = it.get('info_hash', '')
        if h and h not in seen_nyaa:
            seen_nyaa.add(h)
            nyaa_deduped.append(it)

    # Dedupe Archive items
    seen_archive = set()
    archive_deduped = []
    for it in archive_items:
        aid = it.get('archive_id', '')
        if aid and aid not in seen_archive:
            seen_archive.add(aid)
            archive_deduped.append(it)

    # Dedupe NNM items by info_hash
    seen_nnm = set()
    nnm_deduped = []
    for it in nnm_items:
        h = it.get('info_hash', '')
        if h and h not in seen_nnm:
            seen_nnm.add(h)
            nnm_deduped.append(it)

    candidates = []

    # Process YouTube (via Piped) results — embed via Piped (sovereign)
    for it in yt_deduped:
        title = it.get('title', '') or ''
        dur = it.get('duration', 0) or 0
        vid = (it.get('url', '') or '').replace('/watch?v=', '')
        if not vid: continue
        if AUTOPILOT_EXCLUDE_RE.search(title): continue
        if dur and dur < AUTOPILOT_MIN_DURATION: continue

        ep_match = False
        if episode_num:
            patterns = [
                rf'\bep[.\s\-]?0?{episode_num}\b',
                rf'\bepisode\s+{episode_num}\b',
                rf'\bсери[яи]\s+{episode_num}\b',
                rf'\b{episode_num}/\d+\b',
            ]
            for pat in patterns:
                if re.search(pat, title, re.IGNORECASE):
                    ep_match = True
                    break

        if not (AUTOPILOT_INCLUDE_RE.search(title) or ep_match):
            continue

        rel = dice_coefficient(target_title.lower(), title.lower())
        dur_bonus = min(dur / 3600, 1.0)
        ep_bonus = 0.3 if ep_match else 0.0
        # Russian dub bonus — prefer Russian-dubbed videos
        ru_bonus = 0.4 if RU_DUB_RE.search(title) else 0.0
        score = rel + dur_bonus * 0.2 + ep_bonus + ru_bonus

        inst = it.get('_instance', '')
        # Use PIPED embed (sovereign, no Google ads) — piped.video is the official frontend
        # Fallback: youtube embed (only if piped fails — player will watchdog-switch)
        candidates.append({
            'video_id': vid,
            'title': title,
            'duration': dur,
            'duration_str': f"{dur//60}:{dur%60:02d}" if dur else "?",
            'score': round(score, 3),
            'ep_match': ep_match,
            'russian_dub': bool(RU_DUB_RE.search(title)),
            # PRIMARY: piped embed (sovereign, no ads)
            'embed_url': f'https://piped.video/embed/{vid}',
            # FALLBACK chain: other Piped instances
            'embed_url_piped': f'{inst}/embed/{vid}',
            'fallback_embeds': [
                f'https://piped.video/embed/{vid}',
                f'https://piped.kavin.rocks/embed/{vid}',
                f'https://pipedapi.private.coffee/embed/{vid}',
            ],
            'thumbnail': it.get('thumbnail', '') or f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg',
            'source': 'piped',  # was 'youtube' — now sovereign Piped
        })

    # Process Rutor results — open Russian tracker, magnet links (sovereign P2P)
    for it in rutor_deduped:
        title = it.get('title', '') or ''
        if not title: continue
        if AUTOPILOT_EXCLUDE_RE.search(title): continue

        ep_match = False
        if episode_num:
            patterns = [
                rf'\bсери[яи]\s+{episode_num}\b',
                rf'\b{episode_num}\s*сери[яи]',
                rf'серии\s+\d*-{episode_num}\b',
                rf'серии\s+{episode_num}\b',
                rf'\bep[\s.\-]?0?{episode_num}\b',
                rf'\bepisode\s+{episode_num}\b',
                rf'\b{episode_num}/\d+\b',
            ]
            for pat in patterns:
                if re.search(pat, title, re.IGNORECASE):
                    ep_match = True
                    break

        rel = dice_coefficient(target_title.lower(), title.lower())
        if rel < 0.10 and not ep_match: continue

        # Word match filter
        target_words = set(re.findall(r'\w{3,}', target_title.lower()))
        result_words = set(re.findall(r'\w{3,}', title.lower()))
        if target_words:
            missing = target_words - result_words
            if len(missing) > (0 if ep_match else 1):
                continue

        # Russian-dub detection
        ru_dub = bool(RU_DUB_RE.search(title))

        magnet_url = it.get('magnet', '')
        if magnet_url:
            for tr in WSS_TRACKERS:
                if tr not in magnet_url:
                    magnet_url += '&tr=' + urllib.parse.quote(tr)

        score = rel + (0.3 if ep_match else 0) + (0.4 if ru_dub else 0)
        candidates.append({
            'video_id': it.get('info_hash', ''),
            'title': title,
            'duration': 0,
            'duration_str': '?',
            'magnet': magnet_url,
            'info_hash': it.get('info_hash', ''),
            'score': round(score, 3),
            'ep_match': ep_match,
            'russian_dub': ru_dub,
            'embed_url': '',
            'thumbnail': '',
            'source': 'rutor',
        })

    # Process Nyaa results — Asian tracker, magnet links
    for it in nyaa_deduped:
        title = it.get('title', '') or ''
        if not title: continue
        if AUTOPILOT_EXCLUDE_RE.search(title): continue

        ep_match = False
        if episode_num:
            patterns = [
                rf'\bep[\s.\-]?0?{episode_num}\b',
                rf'\bepisode\s+{episode_num}\b',
                rf'\b{episode_num}\b',
            ]
            for pat in patterns:
                if re.search(pat, title, re.IGNORECASE):
                    ep_match = True
                    break

        rel = dice_coefficient(target_title.lower(), title.lower())
        if rel < 0.10 and not ep_match: continue

        target_words = set(re.findall(r'\w{3,}', target_title.lower()))
        result_words = set(re.findall(r'\w{3,}', title.lower()))
        if target_words:
            missing = target_words - result_words
            if len(missing) > (0 if ep_match else 1):
                continue

        ru_dub = bool(RU_DUB_RE.search(title))
        magnet_url = it.get('magnet', '')
        if magnet_url:
            for tr in WSS_TRACKERS:
                if tr not in magnet_url:
                    magnet_url += '&tr=' + urllib.parse.quote(tr)

        seeds = it.get('seeds', 0) or 0
        seed_bonus = min(seeds / 50, 0.5)
        score = rel + (0.3 if ep_match else 0) + (0.4 if ru_dub else 0) + seed_bonus

        candidates.append({
            'video_id': it.get('info_hash', ''),
            'title': title,
            'duration': 0,
            'duration_str': '?',
            'size': it.get('size', ''),
            'seeds': seeds,
            'magnet': magnet_url,
            'info_hash': it.get('info_hash', ''),
            'score': round(score, 3),
            'ep_match': ep_match,
            'russian_dub': ru_dub,
            'embed_url': '',
            'thumbnail': '',
            'source': 'nyaa',
        })

    # Process Archive.org results — public domain, direct embed URLs (no ads)
    for it in archive_deduped:
        title = it.get('title', '') or ''
        if not title: continue

        rel = dice_coefficient(target_title.lower(), title.lower())
        if rel < 0.15: continue

        candidates.append({
            'video_id': it.get('archive_id', ''),
            'title': title,
            'duration': 0,
            'duration_str': '?',
            'score': round(rel, 3),
            'ep_match': False,
            'russian_dub': False,
            'embed_url': it.get('embed_url', ''),
            'thumbnail': '',
            'source': 'archive',
        })

    # Process NNM-Club results — these are P2P torrents (magnet links)
    for it in nnm_deduped:
        title = it.get('title', '') or ''
        if not title:
            continue
        # NNM-Club results are torrents, not videos. Apply same filters:
        if AUTOPILOT_EXCLUDE_RE.search(title):
            continue
        # Episode match — NNM titles often include "(сезон N, серии N-M из K)" or "Серия N"
        ep_match = False
        if episode_num:
            patterns = [
                rf'\bсери[яи]\s+{episode_num}\b',
                rf'\b{episode_num}\s*сери[яи]',
                rf'серии\s+\d*-{episode_num}\b',
                rf'серии\s+{episode_num}\b',
                rf'\bep[\s.\-]?0?{episode_num}\b',
                rf'\bepisode\s+{episode_num}\b',
                rf'\b{episode_num}/\d+\b',
            ]
            for pat in patterns:
                if re.search(pat, title, re.IGNORECASE):
                    ep_match = True
                    break

        rel = dice_coefficient(target_title.lower(), title.lower())
        # NNM-Club relevance — only include if some words match
        target_words = set(re.findall(r'\w{3,}', target_title.lower()))
        result_words = set(re.findall(r'\w{3,}', title.lower()))
        if target_words:
            missing = target_words - result_words
            if len(missing) > (0 if ep_match else 1):
                continue
        # Also require minimum relevance
        if rel < 0.10 and not ep_match:
            continue

        seeds = it.get('seeds', 0) or 0
        leechers = it.get('leechers', 0) or 0
        size = it.get('size', '')

        # Score: relevance + seed bonus + russian bonus + ep bonus
        # For NNM, seeds are very important — torrent needs to have seeders to work
        seed_bonus = min(seeds / 50, 0.5)  # up to +0.5 for 50+ seeders
        ru_bonus = 0.6 if it.get('is_russian_dub') else 0.0  # NNM is Russian platform
        ep_bonus = 0.3 if ep_match else 0.0
        score = rel + seed_bonus + ru_bonus + ep_bonus

        # Augment magnet with wss trackers for browser WebTorrent compatibility
        magnet_url = it.get('magnet', '')
        if magnet_url:
            for tr in WSS_TRACKERS:
                if tr not in magnet_url:
                    magnet_url += '&tr=' + urllib.parse.quote(tr)

        candidates.append({
            'video_id': it.get('info_hash', ''),
            'title': title,
            'duration': 0,  # torrents don't have duration
            'duration_str': '?',
            'size': size,
            'seeds': seeds,
            'leechers': leechers,
            'score': round(score, 3),
            'ep_match': ep_match,
            'russian_dub': it.get('is_russian_dub', False),
            'embed_url': '',  # magnet — handled by player via WebTorrent
            'magnet': magnet_url,
            'info_hash': it.get('info_hash', ''),
            'download_url': it.get('download_url', ''),
            'thumbnail': '',
            'source': 'nnmclub',
        })

    candidates.sort(key=lambda x: (-x['score'], -x.get('duration', 0)))
    result = {
        'query': query,
        'target_title': target_title,
        'episode': episode_num,
        'total_raw_piped': len(yt_deduped),
        'total_raw_rutor': len(rutor_deduped),
        'total_raw_nyaa': len(nyaa_deduped),
        'total_raw_archive': len(archive_deduped),
        'total_raw_nnm': len(nnm_deduped),
        'count': len(candidates),
        'sources': candidates[:12],  # Top 12
        'fetched_at': datetime.datetime.now().isoformat(),
        'cached': False,
    }
    _autopilot_cache[cache_key] = {'data': result, 'expires_at': now + AUTOPILOT_TTL}
    return result

# Public trackers added to every generated magnet link
PUBLIC_TRACKERS = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.demonii.com:1337/announce",
    "udp://tracker.openbittorrent.com:80/announce",
    "udp://exodus.desync.com:6969/announce",
    "wss://tracker.openwebtorrent.com",
    "wss://tracker.btorrent.xyz",
]

# === Magnet helpers ===
def make_magnet(h, name):
    params = ['xt=urn:btih:' + h, 'dn=' + urllib.parse.quote(name)]
    for tr in PUBLIC_TRACKERS:
        params.append('tr=' + urllib.parse.quote(tr))
    return 'magnet:?' + '&'.join(params)

def search_rutor(query):
    """Search rutor.info — public, no Cloudflare, no auth needed."""
    if not HAS_CURL_CFFI:
        return {"error": "curl_cffi not installed", "torrents": []}
    if not query or len(query) < 2:
        return {"error": "query too short", "torrents": []}
    
    url = f'https://rutor.info/search/{urllib.parse.quote(query)}'
    try:
        r = curl_requests.get(url, impersonate='chrome', timeout=20,
                              headers={'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.7',
                                       'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8'})
    except Exception as e:
        return {"error": f"rutor request failed: {e}", "torrents": []}
    
    if r.status_code != 200:
        return {"error": f"rutor HTTP {r.status_code}", "torrents": []}
    
    # Parse magnet links + titles
    magnets = re.findall(
        r'href="(magnet:\?xt=urn:btih:([a-f0-9]{40})[^"]*)"',
        r.text, re.IGNORECASE
    )
    titles = re.findall(r'href="/torrent/(\d+)/[^"]+"[^>]*>([^<]+)</a>', r.text)
    # Sizes from <td>...</td> with size patterns
    sizes = re.findall(r'<td[^>]*>(\d+(?:[.,]\d+)?)\s*(GB|MB|TB|KB)</td>', r.text, re.IGNORECASE)
    # Seeds: green td, leechers: red td
    seed_cells = re.findall(r'<td[^>]*class="[^"]*green[^"]*"[^>]*>(\d+)</td>', r.text, re.IGNORECASE)
    leech_cells = re.findall(r'<td[^>]*class="[^"]*red[^"]*"[^>]*>(\d+)</td>', r.text, re.IGNORECASE)
    
    seen = set()
    torrents = []
    for magnet_url, h in magnets:
        if h in seen: continue
        seen.add(h)
        # Find title by order
        title = ''
        for tid, t in titles:
            if tid and t:
                title = t.strip()
                break
        size_str = ''
        if len(sizes) > len(torrents):
            sz, unit = sizes[len(torrents)]
            size_str = f"{sz} {unit}"
        seeds = int(seed_cells[len(torrents)]) if len(seed_cells) > len(torrents) else None
        leechers = int(leech_cells[len(torrents)]) if len(leech_cells) > len(torrents) else None
        torrents.append({
            'hash': h,
            'title': title or query,
            'magnet': make_magnet(h, title or query),
            'size': size_str,
            'seeds': seeds,
            'leechers': leechers,
            'source': 'rutor',
        })
    
    return {
        "query": query,
        "count": len(torrents),
        "torrents": torrents,
        "fetched_at": datetime.datetime.now().isoformat(),
    }

def update_known_magnets_file(title_key, magnet_data):
    """Append/update a magnet in known_magnets.js by regenerating the file from JSON."""
    json_path = Path("/home/z/my-project/scripts/known_magnets.json")
    if json_path.exists():
        existing = json.load(open(json_path, encoding='utf-8'))
    else:
        existing = {}
    existing[title_key] = magnet_data
    json.dump(existing, open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    
    # Regenerate JS file
    js = [f"// {len(existing)} known working magnets from rutor.info",
          f"// Last updated: {datetime.datetime.now().isoformat()}",
          "const KNOWN_MAGNETS = {"]
    for k, v in existing.items():
        title_escaped = k.replace('\\', '\\\\').replace("'", "\\'")
        magnet = v['magnet'].replace('\\', '\\\\').replace("'", "\\'")
        title_orig = v.get('orig_title', v.get('title', '')).replace('\\', '\\\\').replace("'", "\\'")
        js.append(f"  '{title_escaped}': {{ hash: '{v['hash']}', magnet: '{magnet}', source: 'rutor', orig_title: '{title_orig}' }},")
    js.append("};")
    KNOWN_MAGNETS_PATH.write_text('\n'.join(js), encoding='utf-8')

# === HTTP Handler ===
class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    
    def end_headers(self):
        # CORS for /api routes (so streaming.html can call from any origin)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # FORCE NO-CACHE for HTML/JS so user always gets fresh version
        # (prevents browser from serving old streaming.html from disk cache)
        if self.path.endswith('.html') or self.path.endswith('.js'):
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        else:
            self.send_header('Cache-Control', 'public, max-age=3600')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query_params = urllib.parse.parse_qs(parsed.query)
        
        # API routes
        if path.startswith('/api/'):
            return self.handle_api(path, query_params)
        
        # Root → redirect to streaming
        if path == '/' or path == '':
            self.send_response(302)
            self.send_header('Location', '/streaming.html')
            self.end_headers()
            return
        
        # Default: serve static file from ROOT
        return super().do_GET()
    
    def handle_api(self, path, params):
        if path == '/api/health':
            self.send_json({
                "status": "ok",
                "service": "СИНГУЛЯР P2P Proxy",
                "version": "1.0",
                "curl_cffi": HAS_CURL_CFFI,
                "port": PORT,
                "known_magnets_count": self.count_known_magnets(),
                "autopilot_cache_size": len(_autopilot_cache),
                "piped_instances": len(PIPED_INSTANCES),
                "time": datetime.datetime.now().isoformat(),
            })
            return

        if path == '/api/autopilot':
            title = params.get('title', [''])[0]
            ep_str = params.get('ep', ['1'])[0]
            query_override = params.get('query', [None])[0]
            russian_name = params.get('russian_name', [None])[0]
            if not title:
                self.send_json({"error": "missing 'title' parameter", "sources": []})
                return
            try:
                ep = int(ep_str)
            except ValueError:
                ep = 1
            try:
                result = autopilot_resolve(title, ep, query_override, russian_name)
                self.send_json(result)
            except Exception as e:
                self.send_json({"error": str(e), "sources": []}, status=500)
            return
        
        if path == '/api/magnets':
            # Return all known magnets as JSON
            try:
                if KNOWN_MAGNETS_PATH.exists():
                    content = KNOWN_MAGNETS_PATH.read_text(encoding='utf-8')
                    # Extract the JS object — parse between { and }
                    # crude extraction
                    m = re.search(r'const KNOWN_MAGNETS = (\{.*?\});', content, re.DOTALL)
                    if m:
                        # This is JS object literal — try eval-like parsing
                        # For safety, just return raw text
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/javascript; charset=utf-8')
                        self.end_headers()
                        self.wfile.write(content.encode('utf-8'))
                        return
            except Exception as e:
                self.send_json({"error": str(e)})
                return
            self.send_json({"error": "known_magnets.js not found"})
            return
        
        if path == '/api/search':
            q = params.get('q', [''])[0]
            if not q:
                self.send_json({"error": "missing 'q' parameter", "torrents": []})
                return
            
            # Optional: title_key param to persist result to known_magnets.js
            title_key = params.get('title_key', [None])[0]
            
            result = search_rutor(q)
            
            # If title_key is provided AND we found results, persist best to known_magnets.js
            if title_key and result.get('torrents'):
                best = result['torrents'][0]
                update_known_magnets_file(title_key, {
                    'hash': best['hash'],
                    'title': best['title'],
                    'magnet': best['magnet'],
                    'source': 'rutor',
                    'orig_title': best['title'],
                })
                result['persisted_to'] = title_key
            
            self.send_json(result)
            return
        
        if path == '/api/all_known':
            # Return known_magnets.json as JSON
            json_path = Path("/home/z/my-project/scripts/known_magnets.json")
            if json_path.exists():
                data = json.load(open(json_path, encoding='utf-8'))
                self.send_json(data)
            else:
                self.send_json({})
            return
        
        self.send_json({"error": f"unknown API route: {path}"}, status=404)
    
    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    
    def count_known_magnets(self):
        try:
            if not KNOWN_MAGNETS_PATH.exists(): return 0
            content = KNOWN_MAGNETS_PATH.read_text(encoding='utf-8')
            return content.count("hash: '")
        except:
            return 0
    
    def log_message(self, format, *args):
        # Suppress default logging; show only API calls
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write(f"[{datetime.datetime.now().strftime('%H:%M:%S')}] {args[0]}\n")
        elif '404' in (args[1] if len(args) > 1 else ''):
            sys.stderr.write(f"[404] {args[0]}\n")


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main():
    print(f"""
╔════════════════════════════════════════════════════════════════╗
║  ⚡ СИНГУЛЯР — Локальный P2P Proxy Server                        ║
║  ЧЕЛОВЕК = PID = 1 · КОМАНДИР КОРАБЛЯ                            ║
╚════════════════════════════════════════════════════════════════╝

  Listening:  http://localhost:{PORT}/
  
  Routes:
    /                      → streaming.html (каталог)
    /streaming.html        → каталог тайтлов
    /title.html?id=N       → страница тайтла с P2P плеером
    /webtorrent.min.js     → WebTorrent SDK (local)
    /known_magnets.js      → 23 проверенных magnet'а (rutor.info)
    
  API:
    /api/health            → статус proxy
    /api/search?q=...      → свежий поиск magnet'ов на rutor.info
    /api/search?q=...&title_key=... → поиск + сохранить результат в known_magnets.js
    /api/all_known         → отдать весь кэш magnet'ов (JSON)

  Cookies: rutor.info — публичный, БЕЗ Cloudflare, БЕЗ cookies.
           rutracker.org — Cloudflare, не используется (cookies работают только в браузере).

  Architecture:
    • Static files: /home/z/my-project/download/
    • Magnet cache: /home/z/my-project/scripts/known_magnets.json + .js
    • Local process, no third party. Swarm = источник.

  Press Ctrl+C to stop.
""")
    server = ThreadedHTTPServer(('0.0.0.0', PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[stopped]")
        server.shutdown()


if __name__ == '__main__':
    main()
