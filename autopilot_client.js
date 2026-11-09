// Client-side autopilot — runs in browser WITHOUT local proxy
// Calls Piped (CORS) + Archive.org (CORS) + Rutor/Nyaa (via allorigins.win CORS proxy)
// All in parallel, ranks by relevance + Russian dub bonus + episode match
const PIPED_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.r4fo.com',
];
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

const EXCLUDE_RE = /trailer|reaction|reacci[oó]n|reaktion|recap|fmv|highlight|kissing|ost\b|music video|mv\b|preview|teaser|promo|behind the scene|bts|interview|compilation|fan made|fanmade|cover|gameplay|walkthrough|lets play|speed ?run|review[^s]/i;
const INCLUDE_RE = /ep[\s.\-]?\d|episode|сери[яи]|full\s*ep|полная\s*серия|озвучка|дубляж|дубл|перевод/i;
const RU_DUB_RE = /озвучка|русск|русская|русский|рус\.|dub|дубл|дубляж|перевод|амаред|студия/i;
const WSS_TRACKERS = ['wss://tracker.openwebtorrent.com', 'wss://tracker.btorrent.xyz'];

function dice(a, b) {
  if (!a || !b) return 0;
  a = a.toLowerCase().replace(/\s+/g, ' ').trim();
  b = b.toLowerCase().replace(/\s+/g, ' ').trim();
  if (a === b) return 1;
  const bg = s => s.length < 2 ? new Set() : new Set(Array.from({length: s.length-1}, (_,i) => s.substr(i, 2)));
  const ba = bg(a), bb = bg(b);
  if (!ba.size || !bb.size) return 0;
  return 2 * [...ba].filter(x => bb.has(x)).length / (ba.size + bb.size);
}

async function fetchJSON(url, timeout) {
  timeout = timeout || 12000;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const r = await fetch(url, { signal: ctrl.signal, headers: {'Accept':'application/json'} });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

async function fetchText(url, timeout) {
  timeout = timeout || 15000;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return null;
    return await r.text();
  } catch (e) { return null; }
}

async function searchPiped(query) {
  const results = await Promise.all(PIPED_INSTANCES.map(async (inst) => {
    const d = await fetchJSON(inst + '/search?q=' + encodeURIComponent(query) + '&filter=videos');
    return (d && d.items) ? d.items.map(it => Object.assign({}, it, {_instance: inst})) : [];
  }));
  const flat = results.flat();
  const seen = new Set();
  const out = [];
  for (const it of flat) {
    const vid = (it.url || '').replace('/watch?v=', '');
    if (vid && !seen.has(vid)) { seen.add(vid); out.push(it); }
  }
  return out;
}

async function searchRutor(query) {
  const url = 'https://rutor.info/search/' + encodeURIComponent(query) + '/0/0/0/0';
  const html = await fetchText(CORS_PROXY + encodeURIComponent(url));
  if (!html) return [];
  const magnets = [...html.matchAll(/href="(magnet:\?xt=urn:btih:([a-fA-F0-9]{40})[^"]*)"/ig)];
  const titles = [...html.matchAll(/href="\/torrent\/(\d+)\/[^"]+"[^>]*>([^<]+)<\/a>/g)];
  const seen = new Set();
  const out = [];
  for (const m of magnets) {
    const hash = m[2].toLowerCase();
    if (seen.has(hash)) continue;
    seen.add(hash);
    let title = '';
    for (const t of titles) if (t[1] && t[2]) { title = t[2].trim(); break; }
    out.push({ magnet: m[1], info_hash: hash, title: title || query, source: 'rutor' });
  }
  return out;
}

async function searchNyaa(query) {
  const url = 'https://nyaa.si/?f=0&c=0_0&q=' + encodeURIComponent(query) + '&s=seeders&o=desc';
  const html = await fetchText(CORS_PROXY + encodeURIComponent(url));
  if (!html) return [];
  const rows = [...html.matchAll(/<tr class="(?:default|success|danger)">([\s\S]*?)<\/tr>/g)];
  const out = [];
  for (const r of rows) {
    const row = r[1];
    const tm = row.match(/<a href="\/view\/(\d+)"[^>]*>([^<]+)<\/a>/);
    const mm = row.match(/href="(magnet:\?xt=urn:btih:([a-fA-F0-9]{40})[^"]*)"/i);
    if (!tm || !mm) continue;
    const sm = row.match(/<td class="text-center[^"]*">(\d+(?:\.\d+)?\s*[KMGT]?i?B)<\/td>/);
    const sdm = row.match(/<span class="text-success">(\d+)<\/span>/);
    out.push({
      magnet: mm[1], info_hash: mm[2].toLowerCase(), title: tm[2].trim(),
      size: sm ? sm[1] : '', seeds: sdm ? parseInt(sdm[1]) : 0, source: 'nyaa'
    });
  }
  return out;
}

async function searchArchive(query) {
  const url = 'https://archive.org/advancedsearch.php?q=' + encodeURIComponent(query + ' AND mediatype:(movies)') + '&fl[]=identifier&fl[]=title&sort[]=downloads desc&rows=10&output=json';
  const d = await fetchJSON(url);
  if (!d || !d.response) return [];
  return (d.response.docs || []).map(doc => ({
    title: Array.isArray(doc.title) ? (doc.title[0] || '') : (doc.title || ''),
    embed_url: 'https://archive.org/embed/' + doc.identifier,
    archive_id: doc.identifier, source: 'archive'
  }));
}

async function runAutopilot(targetTitle, episode, searchQuery) {
  const queries = [
    searchQuery + ' ep ' + episode,
    targetTitle + ' ep ' + episode,
    targetTitle + ' серия ' + episode,
    targetTitle + ' озвучка'
  ];

  // Run all in parallel: 3 Piped + 2 Rutor + 2 Nyaa + 1 Archive = 8 parallel requests
  const tasks = [];
  for (const q of queries.slice(0, 3)) tasks.push(searchPiped(q));
  for (const q of queries.slice(0, 2)) tasks.push(searchRutor(q));
  for (const q of queries.slice(0, 2)) tasks.push(searchNyaa(q));
  tasks.push(searchArchive(targetTitle));

  await Promise.all(tasks);
  const results = [];
  for (let i = 0; i < tasks.length; i++) {
    try {
      const r = await tasks[i];
      if (r) results.push(...r);
    } catch (e) {}
  }

  // Dedupe
  const seen = new Set();
  const deduped = [];
  for (const it of results) {
    const id = it.info_hash || it.archive_id || (it.url || '').replace('/watch?v=', '');
    if (id && !seen.has(id)) { seen.add(id); deduped.push(it); }
  }

  // Rank + filter
  const candidates = [];
  for (const it of deduped) {
    const t = it.title || '';
    if (!t) continue;
    if (EXCLUDE_RE.test(t)) continue;

    let ep_match = false;
    if (episode) {
      const patterns = [
        new RegExp('\\bep[.\\s\\-]?0?' + episode + '\\b', 'i'),
        new RegExp('\\bepisode\\s+' + episode + '\\b', 'i'),
        new RegExp('\\bсери[яи]\\s+' + episode + '\\b', 'i'),
        new RegExp('\\b' + episode + '/\\d+\\b', 'i'),
      ];
      for (const p of patterns) if (p.test(t)) { ep_match = true; break; }
    }

    // Word match filter
    const targetWords = new Set((targetTitle.toLowerCase().match(/\w{3,}/g) || []));
    const resultWords = new Set((t.toLowerCase().match(/\w{3,}/g) || []));
    if (targetWords.size) {
      const missing = [...targetWords].filter(w => !resultWords.has(w));
      if (missing.length > (ep_match ? 0 : 1)) continue;
    }

    const rel = dice(targetTitle, t);
    const ru_dub = RU_DUB_RE.test(t);

    if (it.source === 'rutor' || it.source === 'nyaa') {
      if (rel < 0.10 && !ep_match) continue;
      let magnet = it.magnet;
      for (const tr of WSS_TRACKERS) {
        if (!magnet.includes(encodeURIComponent(tr))) magnet += '&tr=' + encodeURIComponent(tr);
      }
      const seeds = it.seeds || 0;
      const seed_bonus = Math.min(seeds / 50, 0.5);
      const score = rel + (ep_match ? 0.3 : 0) + (ru_dub ? 0.4 : 0) + seed_bonus;
      candidates.push({
        video_id: it.info_hash, title: t, duration: 0,
        duration_str: '?', size: it.size || '', seeds: seeds,
        magnet: magnet, info_hash: it.info_hash,
        score: Math.round(score * 1000) / 1000,
        ep_match: ep_match, russian_dub: ru_dub,
        embed_url: '', source: it.source
      });
    } else if (it.source === 'archive') {
      if (rel < 0.15) continue;
      candidates.push({
        video_id: it.archive_id, title: t, duration: 0,
        duration_str: '?', score: Math.round(rel * 1000) / 1000,
        ep_match: false, russian_dub: false,
        embed_url: it.embed_url, source: 'archive'
      });
    } else if (it._instance) {
      // Piped result
      const vid = (it.url || '').replace('/watch?v=', '');
      if (!vid) continue;
      const dur = it.duration || 0;
      if (dur && dur < 600) continue;
      if (!INCLUDE_RE.test(t) && !ep_match) continue;
      const dur_bonus = Math.min(dur / 3600, 1.0);
      const score = rel + dur_bonus * 0.2 + (ep_match ? 0.3 : 0) + (ru_dub ? 0.4 : 0);
      candidates.push({
        video_id: vid, title: t, duration: dur,
        duration_str: dur ? Math.floor(dur/60) + ':' + String(dur%60).padStart(2,'0') : '?',
        score: Math.round(score * 1000) / 1000,
        ep_match: ep_match, russian_dub: ru_dub,
        embed_url: 'https://piped.video/embed/' + vid,
        fallback_embeds: [
          'https://piped.video/embed/' + vid,
          'https://piped.kavin.rocks/embed/' + vid,
          'https://pipedapi.private.coffee/embed/' + vid,
        ],
        thumbnail: it.thumbnail || ('https://i.ytimg.com/vi/' + vid + '/hqdefault.jpg'),
        source: 'piped'
      });
    }
  }

  candidates.sort((a, b) => b.score - a.score || (b.duration || 0) - (a.duration || 0));
  return candidates.slice(0, 12);
}

// === Autopilot UI integration ===
async function runAutopilotUI() {
  const ep = window.currentEp || 1;
  const targetTitle = window.title.t;
  const searchQuery = window.title.q || window.title.t;

  const statusEl = document.getElementById('autopilotStatus');
  const bar = document.getElementById('autopilotBar');
  const setStatus = (text, cls) => {
    const s = document.getElementById('status');
    s.textContent = text;
    s.className = 'status' + (cls ? ' ' + cls : '');
  };

  setStatus('🤖 Autopilot ищет источники для эп. ' + ep + ' (Piped + Rutor + Nyaa + Archive, параллельно)...', 'warn');
  if (statusEl) statusEl.textContent = '🤖 Ищу источники для эп. ' + ep + '...';
  if (bar) {
    bar.style.display = 'block';
    bar.innerHTML = '<b>🤖 Autopilot:</b> параллельный поиск по 4 источникам (Piped×3, Rutor, Nyaa, Archive)...';
  }

  try {
    const sources = await runAutopilot(targetTitle, ep, searchQuery);
    window.autopilotSources = sources;
    window.currentSourceIdx = 0;

    if (!sources.length) {
      setStatus('🤖 Autopilot: 0 источников. Найди вручную (Telegram/Mega/RuTracker).', 'warn');
      if (statusEl) statusEl.textContent = '⚠ Источников не найдено — вставь URL вручную';
      if (bar) bar.innerHTML = '<b>🤖 Autopilot:</b> 0 источников для эп. ' + ep + '. Вставь magnet/URL вручную из Telegram/Mega/RuTracker.';
      return;
    }

    const select = document.getElementById('sourceSelect');
    const switcher = document.getElementById('sourceSwitcher');
    if (select && switcher) {
      select.innerHTML = sources.map((s, i) => {
        const ru = s.russian_dub ? '🇷🇺 ' : '';
        const meta = ['nnmclub','rutor','nyaa'].includes(s.source)
          ? ('S:' + (s.seeds||0) + ' ' + (s.size||''))
          : s.duration_str;
        return '<option value="' + i + '">' + ru + '[' + s.source + '] ' + escapeHtml(s.title).substring(0,75) + ' (' + meta + ', sc ' + s.score + ')</option>';
      }).join('');
      switcher.style.display = 'flex';
      const countEl = document.getElementById('sourceCount');
      if (countEl) countEl.textContent = sources.length + ' источн.';
    }

    const best = sources[0];
    setStatus('🤖 Autopilot нашёл ' + sources.length + ' источников. Лучший: "' + best.title.substring(0,60) + '" (score ' + best.score + '). Стримлю...', 'ok');
    if (statusEl) statusEl.innerHTML = '✓ Найдено <b>' + sources.length + '</b> источников<br>Лучший: ' + escapeHtml(best.title).substring(0,70) + '<br><span style="color:var(--muted)">score ' + best.score + ' · ' + best.source + '</span>';
    if (bar) bar.innerHTML = '<b>🤖 Autopilot:</b> ' + sources.length + ' источников для эп. ' + ep + '. Лучший: <i>' + escapeHtml(best.title).substring(0,80) + '</i> (score ' + best.score + '). Источник ниже ↓';

    if (typeof playAutopilotSource === 'function') playAutopilotSource(0);
  } catch (e) {
    setStatus('Autopilot error: ' + e.message + '. Вставь URL вручную.', 'err');
    if (statusEl) statusEl.textContent = '⚠ Ошибка autopilot';
  }
}

window.runAutopilotUI = runAutopilotUI;
