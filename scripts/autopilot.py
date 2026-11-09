#!/usr/bin/env python3
"""
СИНГУЛЯР РУМУ — Autopilot Source Resolver
==========================================

Given a title + episode, finds working video sources from:
- YouTube via Piped API (no key needed)
- (Future: Rutube, VK, Sibnet via browser-side search)

Returns ranked list of {embed_url, source, title, duration} for the player.

Architecture: parallel queries to multiple Piped instances, filter by:
- duration > 600s (skip trailers, FMVs, highlights)
- title contains "ep" or "episode" or "серия" or "full"
- exclude: trailer/reaction/recap/fmv/highlight/kissing/ost
- Dice coefficient on bigrams for relevance match
"""
import json
import urllib.parse
import urllib.request
import concurrent.futures
import re
import time
import datetime
from pathlib import Path

# Piped instances (tried in parallel, first winner per query wins)
PIPED_INSTANCES = [
    'https://api.piped.private.coffee',
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.r4fo.com',
    'https://pipedapi.leptons.xyz',
]

# Filter keywords
EXCLUDE_PATTERNS = re.compile(
    r'trailer|reaction|recap|fmv|highlight|kissing|ost\b|music video|mv\b|'
    r'short|preview|teaser|promo|announcement|behind the scene|bts|'
    r'interview|compilation|fan made|fanmade|cover',
    re.IGNORECASE
)
INCLUDE_PATTERNS = re.compile(r'ep[\s.\-]?\d|episode|серия|full\s*ep|полная\s*серия', re.IGNORECASE)

# Anti-spam: minimum duration for a full episode (10 min)
MIN_DURATION = 600

def fetch_url(url, timeout=10):
    """Plain fetch — no curl_cffi needed for JSON APIs."""
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        })
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.read().decode('utf-8', errors='replace'), r.status
    except Exception as e:
        return None, 0

def dice_coefficient(a, b):
    """Sørensen-Dice coefficient on bigrams — measure string similarity."""
    if not a or not b: return 0.0
    a = re.sub(r'\s+', ' ', a.lower().strip())
    b = re.sub(r'\s+', ' ', b.lower().strip())
    if a == b: return 1.0
    # Bigrams
    def bigrams(s):
        if len(s) < 2: return set()
        return set(s[i:i+2] for i in range(len(s)-1))
    bg_a = bigrams(a)
    bg_b = bigrams(b)
    if not bg_a or not bg_b: return 0.0
    intersection = bg_a & bg_b
    return 2.0 * len(intersection) / (len(bg_a) + len(bg_b))

def query_piped(query, instance, timeout=10):
    """Query one Piped instance, return list of video items."""
    url = f'{instance}/search?q={urllib.parse.quote(query)}&filter=videos'
    text, status = fetch_url(url, timeout=timeout)
    if status != 200 or not text:
        return []
    try:
        d = json.loads(text)
        items = d.get('items', [])
        # Tag with instance for embed URL fallback
        for it in items:
            it['_instance'] = instance
        return items
    except Exception:
        return []

def search_youtube_via_piped(query, max_results=20):
    """Try multiple Piped instances in parallel, return first non-empty result."""
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(PIPED_INSTANCES)) as ex:
        futures = {ex.submit(query_piped, query, inst, 12): inst for inst in PIPED_INSTANCES}
        results = []
        for fut in concurrent.futures.as_completed(futures):
            try:
                items = fut.result()
                if items:
                    results.extend(items)
                    # We have a winner — wait for any other results too, but cap
                    if len(results) >= max_results * 2:
                        break
            except Exception:
                pass
    # Deduplicate by videoId
    seen = set()
    deduped = []
    for it in results:
        vid = it.get('url', '').replace('/watch?v=', '')
        if vid and vid not in seen:
            seen.add(vid)
            deduped.append(it)
    return deduped[:max_results]

def rank_items(items, target_title, episode_num):
    """Filter + rank items by relevance for the target title + episode."""
    candidates = []
    for it in items:
        title = it.get('title', '') or ''
        dur = it.get('duration', 0) or 0
        vid = it.get('url', '').replace('/watch?v=', '')
        if not vid:
            continue
        
        # Hard filter: skip trailers/reactions/etc.
        if EXCLUDE_PATTERNS.search(title):
            continue
        
        # Hard filter: duration > 10 min (skip clips)
        if dur and dur < MIN_DURATION:
            continue
        
        # Soft filter: prefer "ep N" matches
        ep_match = False
        if episode_num:
            # Match patterns: "ep 1", "ep.1", "episode 1", "EP01", "серия 1", "1/4"
            ep_patterns = [
                rf'\bep[.\s\-]?0?{episode_num}\b',
                rf'\bepisode\s+{episode_num}\b',
                rf'\bсери[яи]\s+{episode_num}\b',
                rf'\b{episode_num}/\d+\b',
                rf'\b{episode_num}\s* серия\b',
            ]
            for pat in ep_patterns:
                if re.search(pat, title, re.IGNORECASE):
                    ep_match = True
                    break
        
        # Require INCLUDE pattern (ep/episode/full)
        has_include = bool(INCLUDE_PATTERNS.search(title)) or ep_match
        if not has_include:
            continue
        
        # Relevance score: dice on title + bonus for ep_match
        title_relevance = dice_coefficient(target_title.lower(), title.lower())
        # Boost longer videos (closer to full episode)
        duration_bonus = min(dur / 3600, 1.0)  # cap at 1 hour
        # Boost for episode match
        ep_bonus = 0.3 if ep_match else 0.0
        
        score = title_relevance + duration_bonus * 0.2 + ep_bonus
        
        candidates.append({
            'video_id': vid,
            'title': title,
            'duration': dur,
            'duration_str': f"{dur//60}:{dur%60:02d}" if dur else "?",
            'score': round(score, 3),
            'ep_match': ep_match,
            'embed_url': f'https://www.youtube.com/embed/{vid}',
            'embed_url_piped': f'{it.get("_instance","")}/embed/{vid}',
            'thumbnail': it.get('thumbnail', '') or f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg',
            'source': 'youtube',
        })
    
    # Sort by score descending, then by duration descending
    candidates.sort(key=lambda x: (-x['score'], -x['duration']))
    return candidates

def resolve_sources(target_title, episode_num=1, query_override=None):
    """Main entry: given a title and episode, return ranked sources."""
    # Build search query: title + "ep N"
    if query_override:
        query = query_override
    else:
        # Strip parentheses content from title for cleaner search
        clean_title = re.sub(r'\s*\(.*?\)\s*', ' ', target_title).strip()
        # Strip Cyrillic if title has it — YouTube search prefers Latin
        if re.search(r'[а-яА-Я]', clean_title):
            # Try original (often Thai/Russian) — might match better
            query = f'{clean_title} ep {episode_num}'
        else:
            query = f'{clean_title} episode {episode_num}'
    
    # Add "thai" or "bl" or "gl" if those words are in the title's catalog entry
    # (passed via query_override by caller)
    
    items = search_youtube_via_piped(query)
    if not items:
        return {
            'query': query,
            'count': 0,
            'sources': [],
            'fetched_at': datetime.datetime.now().isoformat(),
            'error': 'No results from any Piped instance'
        }
    
    candidates = rank_items(items, target_title, episode_num)
    
    return {
        'query': query,
        'total_raw_results': len(items),
        'count': len(candidates),
        'sources': candidates[:8],  # Top 8
        'fetched_at': datetime.datetime.now().isoformat(),
    }

# === CLI ===
if __name__ == '__main__':
    import sys
    if len(sys.argv) < 2:
        print("Usage: autopilot.py '<title>' [episode]")
        sys.exit(1)
    title = sys.argv[1]
    ep = int(sys.argv[2]) if len(sys.argv) > 2 else 1
    result = resolve_sources(title, ep)
    print(json.dumps(result, ensure_ascii=False, indent=2))
