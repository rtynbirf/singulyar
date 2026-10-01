// ==UserScript==
// @name         RUVSON GRABBER — транскрипт + превью + АУДИО/ВИДЕО все форматы
// @namespace    ruvson.grabber
// @version      1.5.0
// @description  На YouTube: .srt/.txt (реальные тайминги), превью Max HD, 157 языков, АУДИО ×2 .WEBM (best+worst) и ВСЕ ФОРМАТЫ в меню-как-у-премиума: вкладки СТАНДАРТ (видео+звук парой одним кликом) / ВИДЕО / АУДИО / ВСЁ, размеры в строках, до 4K. v1.5 «КОНВЕЙЕР»: одна кнопка — объёмная закачка АУДИО всех 61 песни RUVSON с автопереходом между видео. Универсально для любого видео. На YouTubeGrab: дёргает API с твоей сессией. Как юзать — см. КАК_ЮЗАТЬ_GRABBER.md.
// @author       RUVSON × Super Z
// @match        *://www.youtube.com/*
// @match        *://m.youtube.com/*
// @match        *://music.youtube.com/*
// @match        *://youtubegrab.com/*
// @match        *://www.youtubegrab.com/*
// @grant        unsafeWindow
// @grant        GM_xmlhttpRequest
// @connect      i.ytimg.com
// @connect      googlevideo.com
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  /* ================================================================
     0. ОБЩЕЕ: сохранение файлов, статусы, утилиты
     ================================================================ */

  let panel = null;
  let curMode = '';
  let curVid = '';
  let busy = false;

  // 157 языков автоперевода YouTube (список снят с youtubegrab.com, «код:название»)
  const LANGS_RAW = 'ab:Abkhazian,aa:Afar,af:Afrikaans,ak:Akan,sq:Albanian,am:Amharic,ar:Arabic,hy:Armenian,as:Assamese,ay:Aymara,az:Azerbaijani,bn:Bangla,ba:Bashkir,eu:Basque,be:Belarusian,bho:Bhojpuri,bs:Bosnian,br:Breton,bg:Bulgarian,my:Burmese,ca:Catalan,ceb:Cebuano,zh-Hans:Chinese (Simplified),zh-Hant:Chinese (Traditional),co:Corsican,hr:Croatian,cs:Czech,da:Danish,dv:Divehi,nl:Dutch,dz:Dzongkha,en:English,eo:Esperanto,et:Estonian,ee:Ewe,fo:Faroese,fj:Fijian,fil:Filipino,fi:Finnish,fr:French,gaa:Ga,gl:Galician,lg:Ganda,ka:Georgian,de:German,el:Greek,gn:Guarani,gu:Gujarati,ht:Haitian Creole,ha:Hausa,haw:Hawaiian,iw:Hebrew,hi:Hindi,hmn:Hmong,hu:Hungarian,is:Icelandic,ig:Igbo,id:Indonesian,iu:Inuktitut,ga:Irish,it:Italian,ja:Japanese,jv:Javanese,kl:Kalaallisut,kn:Kannada,kk:Kazakh,kha:Khasi,km:Khmer,rw:Kinyarwanda,ko:Korean,kri:Krio,ku:Kurdish,ky:Kyrgyz,lo:Lao,la:Latin,lv:Latvian,ln:Lingala,lt:Lithuanian,lua:Luba-Lulua,luo:Luo,lb:Luxembourgish,mk:Macedonian,mg:Malagasy,ms:Malay,ml:Malayalam,mt:Maltese,gv:Manx,mi:Māori,mr:Marathi,mn:Mongolian,mfe:Morisyen,ne:Nepali,new:Newari,nso:Northern Sotho,no:Norwegian,ny:Nyanja,oc:Occitan,or:Odia,om:Oromo,os:Ossetic,pam:Pampanga,ps:Pashto,fa:Persian,pl:Polish,pt:Portuguese,pt-PT:Portuguese (Portugal),pa:Punjabi,qu:Quechua,ro:Romanian,rn:Rundi,ru-orig:Russian (Original),ru:Russian,sm:Samoan,sg:Sango,sa:Sanskrit,gd:Scottish Gaelic,sr:Serbian,crs:Seselwa Creole French,sn:Shona,sd:Sindhi,si:Sinhala,sk:Slovak,sl:Slovenian,so:Somali,st:Southern Sotho,es:Spanish,su:Sundanese,sw:Swahili,ss:Swati,sv:Swedish,tg:Tajik,ta:Tamil,tt:Tatar,te:Telugu,th:Thai,bo:Tibetan,ti:Tigrinya,to:Tongan,ts:Tsonga,tn:Tswana,tum:Tumbuka,tr:Turkish,tk:Turkmen,uk:Ukrainian,ur:Urdu,ug:Uyghur,uz:Uzbek,ve:Venda,vi:Vietnamese,war:Waray,cy:Welsh,fy:Western Frisian,wo:Wolof,xh:Xhosa,yi:Yiddish,yo:Yoruba,zu:Zulu';
  const LANGS = (() => {
    const seen = new Set();
    return LANGS_RAW.split(',').map(p => {
      const i = p.indexOf(':');
      return i > 0 ? { code: p.slice(0, i), name: p.slice(i + 1) } : null;
    }).filter(x => x && x.code && x.name && !seen.has(x.code) && seen.add(x.code));
  })();

  /* ═══ v1.5 КОНВЕЙЕР: очередь из 61 песни канала (лист владельца 30.09.2026) ═══ */
  const CONV_IDS = ['shs0TiOwx-M','KFnJwNv008s','KvzORszfsg8','EFaMUciH3Do','t9h3cCPCKoo','VfnGUIhaK2Y','z3RcsfHajP8','Y7Wy_JBkz7A','X_-M_cjCFVg','_gNbMCINv1Y','n5IFJ-g1Rtc','vUb40twffCI','fJwb931iJVg','V-IaCbDUKao','TkmSZp1dfBE','pervLR9m-vk','pv3GAlLG9Lk','2g5n6B0bc2Q','Qb8xb0vUYDg','1BZs_wUPn1s','lkXLeITEtGA','eA-fyeSkavI','WMU46n--Z-s','LCADfnI8F-s','9ys_TVEtda8','eOMrrezWEZM','JRTUNak53nU','ahmGGM-P0CA','PIyWwF0t4wQ','kziwaat2nu4','_PCJ6fMfeRM','POiQQ21I5n0','6woWDYcu1QY','HupAWAt7CmQ','YaY-ZJVXFjI','8zG2LBAn1AI','R0SOJreGbhM','X90mDPOhvKc','KfKHWdiX3S4','yK2aPehxmK8','GB31hcDi3lo','d2b72nYLiT8','LqMrrKqK3AE','G7L2d0Z5xfY','8RRRYysSIHg','WIrhIrDQvwY','TRcxZ7jfPsA','TobJGYOPlnw','_KwlGQNmC1Q','b_36rlzEIKk','QpeYJU83XiQ','q57MLk0Uf9c','cFHsQ-LP3ns','gMASVVNFr_A','_E91VEQ-8lM','ugjp6iaNplo','VwoK5U0qOys','OHaRQj9PLUY','MSqK5ig-alE','M9o3ZIlhHrU','pP3Kk2_FHbE'];
  const CONV_LS = 'rgConv';
  const convState = () => {
    try { return JSON.parse(localStorage.getItem(CONV_LS)) || { on:false, idx:0, done:{}, err:{} }; }
    catch (e) { return { on:false, idx:0, done:{}, err:{} }; }
  };
  const convSave = s => localStorage.setItem(CONV_LS, JSON.stringify(s));
  let convRunning = false;
  async function convStep(vid) {
    const st = convState();
    if (!st.on || convRunning) return;
    convRunning = true;
    const i = st.idx;
    try {
      setStatus(`КОНВЕЙЕР ${i + 1}/${CONV_IDS.length}: тяну аудио…`);
      await ytAudio2(vid);
      st.done[vid] = true;
    } catch (e) {
      st.err[vid] = String(e && e.message || e).slice(0, 120);
      setStatus('КОНВЕЙЕР: ошибка на ' + vid + ' — иду дальше', true);
    }
    st.idx = i + 1;
    convSave(st);
    convRunning = false;
    if (st.idx >= CONV_IDS.length) {
      st.on = false; convSave(st);
      const nOk = Object.keys(st.done).length, nErr = Object.keys(st.err).length;
      setStatus(`КОНВЕЙЕР ЗАВЕРШЁН: аудио ${nOk}/${CONV_IDS.length}, ошибок ${nErr}. Папка загрузок — и присылай архив!`, !nErr);
      return;
    }
    const next = CONV_IDS[st.idx];
    setStatus(`КОНВЕЙЕР ${st.idx + 1}/${CONV_IDS.length}: перехожу на следующее видео…`);
    setTimeout(() => { location.href = 'https://www.youtube.com/watch?v=' + next; }, 1500);
  }
  function convAutostart() {
    if (!isYT()) return;
    const vid = getVideoId();
    if (!vid) return;
    const st = convState();
    if (!st.on || convRunning) return;
    if (CONV_IDS[st.idx] !== vid) return;          // не наша страница — ждём
    if (st.done[vid] || st.err[vid]) {             // уже сделано — шагаем дальше
      st.idx = CONV_IDS.indexOf(CONV_IDS.find(x => !st.done[x] && !st.err[x]));
      convSave(st);
      if (st.idx < 0) { st.on = false; convSave(st); return; }
      setTimeout(() => { location.href = 'https://www.youtube.com/watch?v=' + CONV_IDS[st.idx]; }, 800);
      return;
    }
    setTimeout(() => convStep(vid), 3000);         // странице дать устаканиться
  }

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function setStatus(msg, isError) {
    if (!panel) return;
    const s = panel.querySelector('.rg-status');
    if (!s) return;
    s.textContent = msg;
    s.style.color = isError ? '#ff6b6b' : '#9fd8a4';
  }

  function slug(s) {
    return (s || 'video').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_').slice(0, 60);
  }

  function langSlug(s) {
    return (s || 'x').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');
  }

  function saveBlob(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 8000);
  }

  // GET → Blob через GM_xmlhttpRequest (обходит CORS) или обычный fetch
  function getBlob(url) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET', url, responseType: 'blob', timeout: 25000,
          onload: r => (r.status === 200 && r.response) ? resolve(r.response)
                                                       : reject(new Error('HTTP ' + r.status)),
          onerror: () => reject(new Error('сеть не ответила')),
          ontimeout: () => reject(new Error('таймаут'))
        });
      } else {
        fetch(url, { mode: 'cors' })
          .then(r => r.ok ? r.blob() : Promise.reject(new Error('HTTP ' + r.status)))
          .then(resolve, reject);
      }
    });
  }

  /* ================================================================
     1. КОНВЕРТЕРЫ: json3 / srv1 → SRT / TXT
        (та самая механика, которой собирался .srt для rWpYxmFjm9g)
     ================================================================ */

  function srtTime(ms) {
    ms = Math.max(0, Math.round(ms));
    const h = String(Math.floor(ms / 3600000)).padStart(2, '0');
    const m = String(Math.floor((ms % 3600000) / 60000)).padStart(2, '0');
    const s = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0');
    const x = String(ms % 1000).padStart(3, '0');
    return `${h}:${m}:${s},${x}`;
  }

  function json3ToCues(data) {
    const cues = [];
    for (const e of (data.events || [])) {
      if (!e.segs) continue;
      const text = e.segs.map(x => x.utf8 || '').join('').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      cues.push({ start: e.tStartMs || 0, dur: e.dDurationMs || 0, text });
    }
    return cues;
  }

  function srv1ToCues(xmlText) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const out = [];
    for (const t of doc.getElementsByTagName('text')) {
      const text = (t.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      out.push({
        start: Math.round(parseFloat(t.getAttribute('start') || '0') * 1000),
        dur: Math.round(parseFloat(t.getAttribute('dur') || '0') * 1000),
        text
      });
    }
    return out;
  }

  function cuesToSRT(cues) {
    return cues.map((c, i) =>
      `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.start + (c.dur || 2500))}\n${c.text}\n`
    ).join('\n');
  }

  function cuesToTXT(cues, title, vid, trackName) {
    const header =
      `${title}\n` +
      `https://www.youtube.com/watch?v=${vid}\n` +
      `Транскрипт (${trackName}, источник: страница YouTube)\n` +
      `=${'='.repeat(60)}\n\n`;
    return header + cues.map(c => c.text).join('\n') + '\n';
  }

  /* ================================================================
     2. РЕЖИМ YOUTUBE — титры прямо со страницы
        (домашний IP чистый, поэтому всё отвечает без 429/LOGIN_REQUIRED)
     ================================================================ */

  function getVideoId() {
    const u = new URL(location.href);
    const v = u.searchParams.get('v');
    if (v && /^[\w-]{11}$/.test(v)) return v;
    const m = location.pathname.match(/\/(?:shorts|embed)\/([\w-]{11})/);
    return m ? m[1] : '';
  }

  function extractBraces(s, from) {
    let depth = 0, inStr = false, esc = false;
    for (let i = from; i < s.length; i++) {
      const c = s[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (!depth) return JSON.parse(s.slice(from, i + 1));
      }
    }
    return null;
  }

  // резервный путь: официальный innertube-запрос прямо со страницы
  // (same-origin → CORS не мешает; ключ и версия — публичные константы клиента WEB)
  async function innertubePlayer(vid) {
    const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    const cfg = (W.ytcfg && typeof W.ytcfg.get === 'function') ? W.ytcfg : null;
    const key = (cfg && cfg.get('INNERTUBE_API_KEY')) || 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8';
    const ver = (cfg && cfg.get('INNERTUBE_CLIENT_VERSION')) || '2.20240702.01.00';
    const r = await fetch('/youtubei/v1/player?key=' + encodeURIComponent(key) + '&prettyPrint=false', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: vid,
        context: { client: { clientName: 'WEB', clientVersion: ver, hl: 'ru' } }
      })
    });
    if (!r.ok) throw new Error('innertube HTTP ' + r.status);
    return r.json();
  }

  async function getPlayerResponse(vid) {
    const W = (typeof unsafeWindow !== 'undefined') ? unsafeWindow : window;
    let pr = W.ytInitialPlayerResponse;
    if (pr && pr.videoDetails && pr.videoDetails.videoId === vid && (pr.captions || pr.streamingData)) return pr;
    // fallback 1: вытаскиваем из HTML страницы (same-origin, с куками сессии)
    try {
      const html = await (await fetch(location.href, { credentials: 'include' })).text();
      const m = html.match(/ytInitialPlayerResponse\s*=\s*/);
      if (m) {
        try { pr = extractBraces(html, m.index + m[0].length); } catch (e) { /* мимо */ }
        if (pr && pr.videoDetails && (pr.captions || pr.streamingData)) return pr;
      }
    } catch (e) { /* идём дальше */ }
    // fallback 2: innertube
    try { pr = await innertubePlayer(vid); if (pr && pr.videoDetails) return pr; } catch (e) { /* всё, сдались */ }
    return null;
  }

  function pickTrack(tracks) {
    // приоритет: Russian Original → русский любой → первый попавшийся
    const score = t =>
      (t.lang === 'ru' ? 2 : (t.lang || '').startsWith('ru') ? 1 : 0)
      - (t.kind === 'asr' ? 0.5 : 0);
    return [...tracks].sort((a, b) => score(b) - score(a))[0];
  }

  async function ytSubs(vid, fmt) {
    setStatus('читаю страницу…');
    const pr = await getPlayerResponse(vid);
    if (!pr) throw new Error('ytInitialPlayerResponse не найден — перезагрузи страницу');
    const tracks = ((pr.captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [];
    if (!tracks.length) throw new Error('у этого видео нет дорожек титров');
    const norm = tracks.map(t => ({
      name: (t.name && (t.name.simpleText || (t.name.runs || []).map(r => r.text).join(''))) || t.languageCode,
      lang: t.languageCode || '',
      kind: t.kind || '',
      baseUrl: t.baseUrl
    }));
    const tr = pickTrack(norm);
    setStatus(`дорожка: ${tr.name}${tr.kind === 'asr' ? ' (авто)' : ''}…`);

    let cues = [];
    try {
      const url = tr.baseUrl.includes('fmt=') ? tr.baseUrl : tr.baseUrl + '&fmt=json3';
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      cues = json3ToCues(await r.json());
    } catch (e) { /* fallback ниже */ }
    if (!cues.length) {
      const r = await fetch(tr.baseUrl, { credentials: 'include' });
      cues = srv1ToCues(await r.text());
    }
    if (!cues.length) throw new Error('титры пришли пустыми');

    const title = (pr.videoDetails && pr.videoDetails.title)
      || document.title.replace(/ - YouTube$/, '');
    const base = `${slug(title)}_${vid}_${tr.lang || 'xx'}`;
    const body = (fmt === 'srt')
      ? cuesToSRT(cues)
      : cuesToTXT(cues, title, vid, `${tr.name}${tr.kind === 'asr' ? ', авто' : ''}`);
    saveBlob(
      new Blob([body], { type: fmt === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/plain;charset=utf-8' }),
      `${base}.${fmt}`
    );
    return `ГОТОВО: ${cues.length} реплик → .${fmt}`;
  }

  async function ytThumb(vid) {
    setStatus('тяну превью с i.ytimg.com…');
    for (const v of ['maxresdefault', 'sddefault', 'hqdefault']) {
      try {
        const blob = await getBlob(`https://i.ytimg.com/vi/${vid}/${v}.jpg`);
        if (blob.size < 3000) continue; // серая заглушка 120×90
        saveBlob(blob, `RUVSON_${vid}_${v}.jpg`);
        return `ГОТОВО: ${v} · ${(blob.size / 1024).toFixed(0)} КБ`;
      } catch (e) { /* пробуем следующий размер */ }
    }
    throw new Error('превью не нашлось');
  }

  // --- РЕЖИМ «ВСЕ ЯЗЫКИ»: оригинальный baseUrl + &tlang={код} = автоперевод ---
  async function ytLangCues(vid, code) {
    const pr = await getPlayerResponse(vid);
    if (!pr) throw new Error('ytInitialPlayerResponse не найден — перезагрузи страницу');
    const tracks = ((pr.captions || {}).playerCaptionsTracklistRenderer || {}).captionTracks || [];
    if (!tracks.length) throw new Error('у этого видео нет дорожек титров');
    const norm = tracks.map(t => ({
      name: (t.name && (t.name.simpleText || (t.name.runs || []).map(r => r.text).join(''))) || t.languageCode,
      lang: t.languageCode || '', kind: t.kind || '', baseUrl: t.baseUrl
    }));
    const tr = pickTrack(norm);
    const tcode = code === 'ru-orig' ? '' : code; // ru-orig = сама оригинальная дорожка
    let url = tr.baseUrl + (tcode ? `&tlang=${encodeURIComponent(tcode)}` : '');
    let cues = [];
    try {
      const ju = url.includes('fmt=') ? url : url + '&fmt=json3';
      const r = await fetch(ju, { credentials: 'include' });
      if (r.ok) cues = json3ToCues(await r.json());
    } catch (e) { /* fallback ниже */ }
    if (!cues.length) {
      const r = await fetch(url, { credentials: 'include' });
      cues = srv1ToCues(await r.text());
    }
    return cues;
  }

  async function ytAllLangs(vid, fmts) {
    const pr = await getPlayerResponse(vid);
    const title = (pr && pr.videoDetails && pr.videoDetails.title)
      || document.title.replace(/ - YouTube$/, '');
    const base = `${slug(title)}_${vid}`;
    let done = 0;
    const skipped = [];
    for (let i = 0; i < LANGS.length; i++) {
      const { code, name } = LANGS[i];
      try {
        const cues = await ytLangCues(vid, code);
        if (!cues.length) { skipped.push(code); continue; }
        const fn = `${base}_${langSlug(code)}`;
        if (fmts.includes('srt'))
          saveBlob(new Blob([cuesToSRT(cues)], { type: 'application/x-subrip;charset=utf-8' }), `${fn}.srt`);
        if (fmts.includes('txt'))
          saveBlob(new Blob([cues.map(c => c.text).join('\n') + '\n'], { type: 'text/plain;charset=utf-8' }), `${fn}.txt`);
        done++;
      } catch (e) { skipped.push(code); }
      setStatus(`ВСЕ ЯЗЫКИ: ${done}/${LANGS.length} · ${name}`);
      await sleep(450); // пауза, чтобы браузер успевал сохранять и не ругался
    }
    const tail = skipped.length
      ? ` (без: ${skipped.slice(0, 4).join(', ')}${skipped.length > 4 ? '…' : ''})` : '';
    setStatus(`ГОТОВО: ${done} языков${tail}`, done === 0);
  }

  async function ytOneLang(vid, code, fmt) {
    setStatus(`язык ${code}…`);
    const cues = await ytLangCues(vid, code);
    if (!cues.length) throw new Error('дорожка пустая');
    const pr = await getPlayerResponse(vid);
    const title = (pr && pr.videoDetails && pr.videoDetails.title)
      || document.title.replace(/ - YouTube$/, '');
    const fn = `${slug(title)}_${vid}_${langSlug(code)}`;
    const body = fmt === 'srt'
      ? cuesToSRT(cues)
      : cues.map(c => c.text).join('\n') + '\n';
    saveBlob(new Blob([body], { type: fmt === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/plain;charset=utf-8' }), `${fn}.${fmt}`);
    return `ГОТОВО: ${code} · ${cues.length} реплик → .${fmt}`;
  }

  /* ================================================================
     2.5 АУДИО ×2 .WEBM — самое высокое и самое низкое качество
         Универсально: ЛЮБОЕ видео YouTube (не только RUVSON).
         Берём streamingData.adaptiveFormats, фильтруем audio/webm (Opus),
         сортируем по битрейту: максимум = BEST, минимум = WORST.
         Качаем blob'ом через GM_xmlhttpRequest (CORS не помеха),
         URL из подписи страницы валидны для твоего IP и сессии.
     ================================================================ */

  function audioFormats(pr) {
    const sd = (pr && pr.streamingData) || {};
    const all = [];
    for (const f of (sd.adaptiveFormats || [])) {
      if (!f || !f.mimeType || !/^audio\//i.test(f.mimeType) || !f.url) continue;
      all.push({
        itag: f.itag || 0,
        url: f.url,
        webm: /webm/i.test(f.mimeType),
        mime: f.mimeType.split(';')[0],
        bitrate: f.bitrate || f.averageBitrate || 0
      });
    }
    for (const a of all) a.kbps = Math.round(a.bitrate / 1000);
    const webmOnly = all.filter(x => x.webm);
    const pool = (webmOnly.length ? webmOnly : all).slice().sort((a, b) => a.bitrate - b.bitrate);
    return { worst: pool[0] || null, best: pool[pool.length - 1] || null, pool };
  }

  // универсальный GM-скачиватель: ArrayBuffer + прогресс-колбэк (для аудио и видео)
  function gmFetchBuffer(url, onProgress) {
    return new Promise((resolve, reject) => {
      if (typeof GM_xmlhttpRequest !== 'function')
        return reject(new Error('нужен Tampermonkey (GM_xmlhttpRequest)'));
      GM_xmlhttpRequest({
        method: 'GET', url, responseType: 'arraybuffer', timeout: 3600000,
        headers: { Referer: 'https://www.youtube.com/' },
        onprogress: e => { if (onProgress) onProgress(e); },
        onload: r => (r.status === 200 && r.response)
          ? resolve(r.response)
          : reject(new Error('HTTP ' + r.status)),
        onerror: () => reject(new Error('сеть не ответила')),
        ontimeout: () => reject(new Error('таймаут скачивания'))
      });
    });
  }

  function dlAudio(fmt, name, label) {
    return gmFetchBuffer(fmt.url, e => {
      const pct = e.total ? Math.round(e.loaded / e.total * 100) : 0;
      setStatus(`${label}: ${pct ? pct + '%' : (e.loaded / 1048576).toFixed(1) + ' МБ'}…`);
    }).then(buf => {
      const blob = new Blob([buf], { type: fmt.webm ? 'audio/webm' : fmt.mime });
      saveBlob(blob, name);
      return blob.size;
    });
  }

  async function ytAudio2(vid) {
    setStatus('читаю форматы…');
    const pr = await getPlayerResponse(vid);
    if (!pr) throw new Error('player response не найден — перезагрузи страницу');
    const sel = audioFormats(pr);
    if (!sel.best) throw new Error('аудио-дорожек нет — перезагрузи страницу и повтори');
    const title = (pr.videoDetails && pr.videoDetails.title)
      || document.title.replace(/ - YouTube$/, '');
    const single = sel.pool.length < 2;
    const items = single
      ? [{ f: sel.best, label: 'АУДИО' }]
      : [{ f: sel.best, label: 'BEST' }, { f: sel.worst, label: 'WORST' }];
    const report = [];
    for (const { f, label } of items) {
      const ext = f.webm ? 'webm' : 'm4a';
      const name = `${slug(title)}_${vid}_${label}_${f.kbps}kbps_itag${f.itag}.${ext}`;
      setStatus(`${label}: тяну ${f.kbps} кбит/с (${f.mime})…`);
      const size = await dlAudio(f, name, label);
      report.push(`${label} itag${f.itag} · ${f.kbps} кбит/с · ${(size / 1048576).toFixed(1)} МБ`);
      if (!single) await sleep(800);
    }
    const note = sel.pool[0] && sel.pool[0].webm ? '' : ' · webm не было — отдал доступное (.m4a)';
    return `ГОТОВО: ${report.join(' | ')}${note}`;
  }

  /* ================================================================
     2.6 ВСЕ ФОРМАТЫ — окно со всеми потоками: видео (до 4K), аудио,
         комбинированные. Человек сам решает: сегодня звук, завтра
         1080p на телефон или 4K на ТВ — скрипт просто служит.
     ================================================================ */

  function fmtRow(f, kind) {
    const mime = (f.mimeType || '').split(';')[0].toLowerCase();
    return {
      itag: f.itag || 0,
      url: f.url,
      kind,                                        // video | audio | muxed
      container: mime.split('/')[1] || mime,       // mp4 / webm
      codec: (f.mimeType.match(/codecs="?([^"]+)"?/) || [])[1] || '',
      bitrate: f.bitrate || f.averageBitrate || 0,
      kbps: Math.round((f.bitrate || f.averageBitrate || 0) / 1000),
      aq: (f.audioQuality || '').replace(/^AUDIO_QUALITY_/, '').toUpperCase(),
      h: f.height || 0,
      fps: f.fps || 0,
      q: f.qualityLabel || f.quality || '',
      size: f.contentLength ? parseInt(f.contentLength, 10) : 0
    };
  }

  function allFormats(pr) {
    const sd = (pr && pr.streamingData) || {};
    const out = { video: [], audio: [], muxed: [] };
    for (const f of (sd.adaptiveFormats || [])) {
      if (!f || !f.mimeType || !f.url) continue;
      if (/^video\//i.test(f.mimeType)) out.video.push(fmtRow(f, 'video'));
      else if (/^audio\//i.test(f.mimeType)) out.audio.push(fmtRow(f, 'audio'));
    }
    for (const f of (sd.formats || [])) { // комбинированные (обычно 360p со звуком)
      if (!f || !f.mimeType || !f.url) continue;
      if (/^video\//i.test(f.mimeType)) out.muxed.push(fmtRow(f, 'muxed'));
    }
    out.video.sort((a, b) => (b.h - a.h) || (b.fps - a.fps) || (b.bitrate - a.bitrate));
    out.audio.sort((a, b) => b.bitrate - a.bitrate);
    out.muxed.sort((a, b) => (b.h - a.h) || (b.bitrate - a.bitrate));
    return out;
  }

  function fmtDesc(x) {
    if (x.kind === 'audio') return `${x.container} ${x.codec} · ${x.kbps} кбит/с`;
    const res = x.h ? `${x.h}p` : (x.q || '?');
    const fps = x.fps ? ` ${x.fps}fps` : '';
    const snd = x.kind === 'muxed' ? 'со звуком' : 'без звука';
    return `${x.container} ${res}${fps} ${snd} · ${x.kbps} кбит/с`;
  }

  function fmtName(x, title, vid) {
    const t = slug(title);
    if (x.kind === 'audio') {
      const ext = x.container === 'mp4' ? 'm4a' : x.container;
      return `${t}_${vid}_AUDIO_${x.kbps}kbps_itag${x.itag}.${ext}`;
    }
    const res = x.h ? `${x.h}p` : (x.q || 'video');
    const fps = x.fps ? `_${x.fps}fps` : '';
    const tag = x.kind === 'muxed' ? 'MUXED' : 'VIDEO';
    return `${t}_${vid}_${tag}_${res}${fps}_itag${x.itag}.${x.container}`;
  }

  function fmtMb(n) {
    if (!n) return '≈ ?';
    const mb = n / 1048576;
    return '≈ ' + (mb < 100 ? mb.toFixed(1) : Math.round(mb)) + ' МБ';
  }

  const AQ_LABEL = { HIGH: 'высокое', MEDIUM: 'среднее', LOW: 'низкое', ULTRA_LOW: 'ультранизкое' };

  // лучший кандидат на разрешение: mp4 (h264) — максимальная совместимость
  // (Android/iOS/ТВ/монтажки), иначе самый жирный из оставшихся
  function pickPrefVideo(cands) {
    if (!cands || !cands.length) return null;
    const mp4 = cands.filter(x => x.container === 'mp4');
    return (mp4.length ? mp4 : cands).slice().sort((a, b) => b.bitrate - a.bitrate)[0];
  }

  // группировка видео по «разрешение [+ fps]» — как в меню премиума:
  // одна строка на качество, а не дюжина itagов; fps пишем только если он не 30
  function groupVideoRes(video) {
    const map = new Map();
    for (const x of video || []) {
      const key = (x.h ? x.h + 'p' : (x.q || '?')) + (x.fps && x.fps !== 30 ? x.fps : '');
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(x);
    }
    return [...map.entries()]
      .map(([key, cands]) => {
        const x = pickPrefVideo(cands);
        return { key, x, alts: cands.filter(c => c !== x) };
      })
      .sort((a, b) => (b.x.h - a.x.h) || (b.x.fps - a.x.fps));
  }

  // имена файлов для «СТАНДАРТ»: пара с общим префиксом — лежат рядом в загрузках
  function pairNames(v, a, title, vid, resKey) {
    const t = slug(title);
    return [
      `${t}_${vid}_PAIR_${resKey}_itag${v.itag}.${v.container}`,
      `${t}_${vid}_PAIR_${resKey}_AUDIO_itag${a.itag}.${a.container === 'mp4' ? 'm4a' : a.container}`
    ];
  }

  async function dlModalRow(row, x, title, vid, nameOverride) {
    if (row.classList.contains('dl')) return;
    const base = `itag ${x.itag} · ${fmtDesc(x)}`;
    row.classList.add('dl');
    try {
      const buf = await gmFetchBuffer(x.url, e => {
        const pct = e.total ? Math.round(e.loaded / e.total * 100) : 0;
        row.textContent = `${base} — ${pct ? pct + '%' : (e.loaded / 1048576).toFixed(1) + ' МБ'}`;
      });
      saveBlob(
        new Blob([buf], { type: (x.kind === 'audio' ? 'audio/' : 'video/') + x.container }),
        nameOverride || fmtName(x, title, vid)
      );
      row.textContent = `${base} — ГОТОВО · ${(buf.byteLength / 1048576).toFixed(1)} МБ`;
    } catch (e) {
      row.textContent = `${base} — ОШИБКА: ${e && e.message ? e.message : e} · обнови страницу и повтори`;
    } finally {
      row.classList.remove('dl');
    }
  }

  async function dlPair(row, v, a, title, vid, resKey) {
    if (row.classList.contains('dl')) return;
    const names = pairNames(v, a, title, vid, resKey);
    const base = `${resKey}: пара видео + звук`;
    row.classList.add('dl');
    try {
      const vbuf = await gmFetchBuffer(v.url, e => {
        const pct = e.total ? Math.round(e.loaded / e.total * 100) : 0;
        row.textContent = `${base} — видео ${pct ? pct + '%' : (e.loaded / 1048576).toFixed(1) + ' МБ'}`;
      });
      saveBlob(new Blob([vbuf], { type: 'video/' + v.container }), names[0]);
      row.textContent = `${base} — звук…`;
      const abuf = await gmFetchBuffer(a.url, e => {
        const pct = e.total ? Math.round(e.loaded / e.total * 100) : 0;
        row.textContent = `${base} — звук ${pct ? pct + '%' : (e.loaded / 1048576).toFixed(1) + ' МБ'}`;
      });
      saveBlob(new Blob([abuf], { type: 'audio/' + a.container }), names[1]);
      row.textContent = `${base} — ГОТОВО · видео ${(vbuf.byteLength / 1048576).toFixed(1)} МБ + звук ${(abuf.byteLength / 1048576).toFixed(1)} МБ`;
    } catch (e) {
      row.textContent = `${base} — ОШИБКА: ${e && e.message ? e.message : e} · обнови страницу и повтори`;
    } finally {
      row.classList.remove('dl');
    }
  }

  function showFormatModal(vid, title, sel) {
    const old = document.getElementById('rg-fmts');
    if (old) old.remove();
    const ov = document.createElement('div');
    ov.id = 'rg-fmts';
    const box = document.createElement('div');
    box.className = 'rg-fbox';
    const head = document.createElement('div');
    head.className = 'rg-fhead';
    head.innerHTML = `<span>ФОРМАТЫ · ${vid} · ${slug(title).slice(0, 30)}</span>`;
    const close = document.createElement('span');
    close.className = 'rg-fclose';
    close.textContent = '×';
    close.addEventListener('click', () => ov.remove());
    head.appendChild(close);

    const tabs = document.createElement('div');
    tabs.className = 'rg-ftabs';
    const list = document.createElement('div');
    list.className = 'rg-flist';

    const groups = groupVideoRes(sel.video);
    // звук для пары СТАНДАРТ: m4a (AAC) если есть — Android/iOS/ТВ едят без вопросов
    const pairAud = sel.audio.find(x => x.container === 'mp4') || sel.audio[0] || null;
    const recKey = groups.find(g => g.x.h === 720); // как у премиума: пометка на ~720p

    function mkRow(text, onclick) {
      const row = document.createElement('div');
      row.className = 'rg-frow';
      row.textContent = text;
      row.addEventListener('click', onclick);
      return row;
    }

    function mkMeta(text) {
      const m = document.createElement('div');
      m.className = 'rg-fmeta';
      m.textContent = text;
      return m;
    }

    function renderStd() {
      if (!groups.length) { list.appendChild(mkMeta('видео-потоков нет')); return; }
      for (const g of groups) {
        const total = (g.x.size || 0) + (pairAud && pairAud.size ? pairAud.size : 0);
        const row = mkRow(
          `${g.key} (${fmtMb(total)} с звуком)${g === recKey ? '  ·  РЕКОМЕНДУЮ' : ''}`,
          () => dlPair(row, g.x, pairAud, title, vid, g.key)
        );
        list.appendChild(row);
      }
      list.appendChild(mkMeta('Придёт ДВУМЯ файлами с общим префиксом PAIR — они лежат рядом в загрузках. Звук: ' +
        (pairAud ? `${pairAud.container} ${pairAud.kbps} кбит/с (максимальная совместимость)` : 'у видео нет аудио')));
    }

    function renderVid() {
      if (!groups.length) { list.appendChild(mkMeta('видео-потоков нет')); return; }
      for (const g of groups) {
        const row = mkRow(
          `${g.key} (${fmtMb(g.x.size)}) · ${g.x.container} ${g.x.codec || ''}`,
          () => dlModalRow(row, g.x, title, vid)
        );
        list.appendChild(row);
      }
      list.appendChild(mkMeta('Чистая картинка без звука — для монтажки или когда звук уже есть. mp4/h264 играет везде.'));
    }

    function renderAud() {
      if (!sel.audio.length) { list.appendChild(mkMeta('аудио-потоков нет')); return; }
      for (const x of sel.audio) {
        const q = x.aq ? (AQ_LABEL[x.aq] || x.aq.toLowerCase()) + ' · ' : '';
        const row = mkRow(
          `${q}${x.kbps} кбит/с (${fmtMb(x.size)}) · ${x.container} ${x.codec || ''}`,
          () => dlModalRow(row, x, title, vid)
        );
        list.appendChild(row);
      }
      list.appendChild(mkMeta('Opus (webm) — лучший звук на битрейт; AAC (m4a) — лучше совместимость со старой техникой.'));
    }

    function renderAdv() {
      const addSection = (name, arr) => {
        if (!arr || !arr.length) return;
        const sec = document.createElement('div');
        sec.className = 'rg-fsec';
        sec.textContent = `${name} (${arr.length})`;
        list.appendChild(sec);
        for (const x of arr) {
          const row = mkRow(`itag ${x.itag} · ${fmtDesc(x)} · ${fmtMb(x.size)}`,
            () => dlModalRow(row, x, title, vid));
          list.appendChild(row);
        }
      };
      addSection('ВИДЕО — все кодеки и itagи', sel.video);
      addSection('АУДИО — все itagи', sel.audio);
      addSection('СО ЗВУКОМ (готовые)', sel.muxed);
      if (!sel.video.length && !sel.audio.length && !sel.muxed.length)
        list.appendChild(mkMeta('форматов нет — обнови страницу'));
    }

    const TABS = [
      ['std', 'СТАНДАРТ', 'Одна строка = одно качество, как в премиум-меню: клик качает видео + звук парой (два файла с общим префиксом — плеер/ТВ/монтажка их склеят). Размер примерный: картинка + звук.', renderStd],
      ['vid', 'ВИДЕО', 'Видео без звука — полезно для редактирования. mp4/h264 — максимальная совместимость с телефонами и ТВ.', renderVid],
      ['aud', 'АУДИО', 'Музыка и подкасты — только звуковая дорожка, все битрейты.', renderAud],
      ['adv', 'ВСЁ', 'Сырой список всех потоков с itagами: каждый кодек, каждый битрейт, готовые файлы со звуком.', renderAdv]
    ];

    for (const t of TABS) {
      const b = document.createElement('span');
      b.className = 'rg-ftab';
      b.dataset.k = t[0];
      b.textContent = t[1];
      b.addEventListener('click', () => {
        list.innerHTML = '';
        list.appendChild(mkMeta(t[2]));
        t[3]();
        tabs.querySelectorAll('.rg-ftab').forEach(s => s.classList.toggle('on', s.dataset.k === t[0]));
      });
      tabs.appendChild(b);
    }

    box.appendChild(head);
    box.appendChild(tabs);
    box.appendChild(list);
    ov.appendChild(box);
    document.body.appendChild(ov);
    ov.addEventListener('click', e => { if (e.target === ov) ov.remove(); });
    tabs.querySelector('.rg-ftab').click(); // открываем СТАНДАРТ по умолчанию
  }

  async function ytFormats(vid) {
    setStatus('собираю форматы…');
    const pr = await getPlayerResponse(vid);
    if (!pr) throw new Error('player response не найден — перезагрузи страницу');
    const sel = allFormats(pr);
    const total = sel.video.length + sel.audio.length + sel.muxed.length;
    if (!total) throw new Error('форматов нет — перезагрузи страницу и повтори');
    const title = (pr.videoDetails && pr.videoDetails.title)
      || document.title.replace(/ - YouTube$/, '');
    showFormatModal(vid, title, sel);
    return `форматов: ${total} — выбирай в окне`;
  }

  /* ================================================================
     3. РЕЖИМ YOUTUBEGRAB — API с твоей сессией
        (эндпоинты подтверждены в бою: format=txt/vtt/json3 отдавались,
         srt блокировался только моему дата-центровому IP — у тебя пройдёт)
     ================================================================ */

  function isYG() { return /(^|\.)youtubegrab\.com$/.test(location.hostname); }
  function isYT() { return /(^|\.)youtube\.com$/.test(location.hostname); }

  function ygVid() {
    const v = new URL(location.href).searchParams.get('v');
    return (v && /^[\w-]{11}$/.test(v)) ? v : '';
  }

  async function ygSubs(vid, fmt) {
    const langs = ['ru-orig', 'ru', ''];
    let lastErr = null;
    for (const lang of langs) {
      const u = `/api/v1/videos/${vid}/captions?format=${fmt}` + (lang ? `&lang=${lang}` : '');
      try {
        const r = await fetch(u, { credentials: 'include' });
        if (r.status === 403) throw new Error('WAF 403 — открой сайт в обычной вкладке и жми родные кнопки');
        if (!r.ok) { lastErr = new Error('HTTP ' + r.status); continue; }
        let body = await r.text();
        if ((r.headers.get('content-type') || '').includes('json')) {
          try {
            const j = JSON.parse(body);
            if (typeof j.data === 'string') body = j.data;
          } catch (e) { /* оставляем как есть */ }
        }
        if (!body.trim()) { lastErr = new Error('пустой ответ'); continue; }
        saveBlob(
          new Blob([body], { type: fmt === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/plain;charset=utf-8' }),
          `RUVSON_${vid}_youtubegrab.${fmt}`
        );
        return `ГОТОВО: ${(body.length / 1024).toFixed(1)} КБ → .${fmt} (${lang || 'default'})`;
      } catch (e) {
        if (String(e.message).includes('403')) throw e;
        lastErr = e;
      }
    }
    throw lastErr || new Error('дорожка не найдена');
  }

  async function ygThumb(vid) {
    const targets = [
      `/api/v1/videos/${vid}/thumbnail?size=max`,
      `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`
    ];
    for (const u of targets) {
      try {
        const blob = await getBlob(u);
        if (blob.size < 3000) continue;
        saveBlob(blob, `RUVSON_${vid}_thumbnail_max.jpg`);
        return `ГОТОВО: ${(blob.size / 1024).toFixed(0)} КБ`;
      } catch (e) { /* следующий источник */ }
    }
    throw new Error('превью не нашлось');
  }

  async function ygLang(vid, code, fmt) {
    const langQ = code ? `&lang=${encodeURIComponent(code)}` : '';
    const r = await fetch(`/api/v1/videos/${vid}/captions?format=${fmt}${langQ}`, { credentials: 'include' });
    if (r.status === 403) throw new Error('WAF 403 — жми родные кнопки сайта');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    let body = await r.text();
    if ((r.headers.get('content-type') || '').includes('json')) {
      try { const j = JSON.parse(body); if (typeof j.data === 'string') body = j.data; } catch (e) {}
    }
    if (!body.trim()) throw new Error('пустой ответ');
    saveBlob(
      new Blob([body], { type: fmt === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/plain;charset=utf-8' }),
      `RUVSON_${vid}_${langSlug(code || 'default')}.${fmt}`
    );
    return body.length;
  }

  async function ygAllLangs(vid, fmts) {
    let done = 0;
    const skipped = [];
    for (let i = 0; i < LANGS.length; i++) {
      const { code, name } = LANGS[i];
      try {
        let any = false;
        for (const f of fmts) {
          try { await ygLang(vid, code, f); any = true; } catch (e) { /* пробуем дальше */ }
        }
        if (any) done++; else skipped.push(code);
      } catch (e) { skipped.push(code); }
      setStatus(`ВСЕ ЯЗЫКИ: ${done}/${LANGS.length} · ${name}`);
      await sleep(450);
    }
    const tail = skipped.length
      ? ` (без: ${skipped.slice(0, 4).join(', ')}${skipped.length > 4 ? '…' : ''})` : '';
    setStatus(`ГОТОВО: ${done} языков${tail}`, done === 0);
  }

  /* ================================================================
     4. ПАНЕЛЬ
     ================================================================ */

  const CSS = `
    #ruvson-grabber{position:fixed;right:16px;bottom:16px;z-index:999999;
      width:250px;background:#101014;border:1px solid #3f3f46;border-radius:10px;
      box-shadow:0 8px 30px rgba(0,0,0,.55);font:12px/1.4 ui-monospace,Consolas,monospace;
      color:#e8e8ec;user-select:none}
    #ruvson-grabber .rg-head{display:flex;align-items:center;justify-content:space-between;
      padding:7px 10px;cursor:pointer;border-bottom:1px solid #26262c}
    #ruvson-grabber .rg-logo{font-weight:700;letter-spacing:.5px;color:#f5a623}
    #ruvson-grabber .rg-fold{color:#888;font-weight:700;padding:0 2px}
    #ruvson-grabber .rg-body{padding:8px 10px 10px}
    #ruvson-grabber .rg-title{font-size:11px;color:#aaa;margin-bottom:7px;
      max-height:32px;overflow:hidden}
    #ruvson-grabber select{all:unset;width:100%;box-sizing:border-box;margin-bottom:7px;
      padding:5px 6px;border:1px solid #3f3f46;border-radius:6px;background:#191920;
      color:#e8e8ec;font:11px ui-monospace,Consolas,monospace;cursor:pointer}
    #ruvson-grabber .rg-btns{display:grid;grid-template-columns:1fr 1fr;gap:5px}
    #ruvson-grabber button{all:unset;cursor:pointer;text-align:center;padding:6px 4px;
      border:1px solid #f5a623;border-radius:6px;color:#f5a623;font:inherit;font-weight:700}
    #ruvson-grabber button:hover{background:#f5a623;color:#101014}
    #ruvson-grabber button[data-act="alllang"]{grid-column:1/3;border-color:#9fd8a4;color:#9fd8a4}
    #ruvson-grabber button[data-act="alllang"]:hover{background:#9fd8a4;color:#101014}
    #ruvson-grabber button[data-act="audio2"]{grid-column:1/3;border-color:#6bc1ff;color:#6bc1ff}
    #ruvson-grabber button[data-act="audio2"]:hover{background:#6bc1ff;color:#101014}
    #ruvson-grabber button[data-act="fmts"]{grid-column:1/3;border-color:#d3a4ff;color:#d3a4ff}
    #ruvson-grabber button[data-act="fmts"]:hover{background:#d3a4ff;color:#101014}
    #rg-fmts{position:fixed;inset:0;z-index:1000000;background:rgba(0,0,0,.72);
      display:flex;align-items:center;justify-content:center;
      font:12px/1.5 ui-monospace,Consolas,monospace}
    #rg-fmts .rg-fbox{width:min(580px,94vw);max-height:82vh;background:#101014;
      border:1px solid #3f3f46;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.55);
      display:flex;flex-direction:column;color:#e8e8ec}
    #rg-fmts .rg-fhead{display:flex;justify-content:space-between;align-items:center;
      padding:9px 12px;border-bottom:1px solid #26262c;color:#d3a4ff;font-weight:700;
      overflow:hidden;white-space:nowrap}
    #rg-fmts .rg-fclose{cursor:pointer;color:#888;padding:0 2px 0 12px;font-weight:700}
    #rg-fmts .rg-fclose:hover{color:#ff6b6b}
    #rg-fmts .rg-ftabs{display:flex;gap:4px;padding:8px 10px 0;flex-wrap:wrap}
    #rg-fmts .rg-ftab{cursor:pointer;padding:5px 9px;border:1px solid #3f3f46;
      border-radius:6px;color:#aaa;font-size:11px;font-weight:700}
    #rg-fmts .rg-ftab:hover{color:#d3a4ff;border-color:#d3a4ff}
    #rg-fmts .rg-ftab.on{background:#d3a4ff;border-color:#d3a4ff;color:#101014}
    #rg-fmts .rg-flist{overflow-y:auto;padding:6px 10px 12px}
    #rg-fmts .rg-fmeta{color:#777;font-size:10px;line-height:1.45;margin:6px 2px}
    #rg-fmts .rg-fsec{color:#888;font-size:10px;letter-spacing:.5px;margin:10px 2px 4px;
      text-transform:uppercase}
    #rg-fmts .rg-frow{cursor:pointer;padding:6px 8px;border:1px solid #26262c;
      border-radius:6px;margin:3px 0}
    #rg-fmts .rg-frow:hover{border-color:#d3a4ff;color:#d3a4ff}
    #rg-fmts .rg-frow.dl{border-color:#9fd8a4;color:#9fd8a4;cursor:wait}
    #rg-fmts .rg-frow.err{border-color:#ff6b6b;color:#ff6b6b}
    #ruvson-grabber button:disabled{opacity:.45;cursor:wait}
    #ruvson-grabber .rg-status{margin-top:7px;font-size:11px;color:#9fd8a4;
      max-height:42px;overflow:hidden}
    #ruvson-grabber.rg-folded .rg-body{display:none}
  `;

  function buildPanel(mode, vid) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.documentElement.appendChild(st);

    panel = document.createElement('div');
    panel.id = 'ruvson-grabber';
    panel.innerHTML =
      '<div class="rg-head"><span class="rg-logo">RUVSON GRABBER</span>' +
      '<span class="rg-fold">—</span></div>' +
      '<div class="rg-body"><div class="rg-title"></div>' +
      '<select class="rg-lang"><option value="auto">язык: авто (оригинал)</option></select>' +
      '<div class="rg-btns">' +
      '<button data-act="jpg">ПРЕВЬЮ JPG</button>' +
      '<button data-act="srt">.SRT</button>' +
      '<button data-act="txt">.TXT</button>' +
      '<button data-act="all">ВСЁ СРАЗУ</button>' +
      '<button data-act="audio2">АУДИО ×2 .WEBM (BEST+WORST)</button>' +
      '<button data-act="fmts">ВСЕ ФОРМАТЫ · АУДИО+ВИДЕО</button>' +
      '<button data-act="alllang">ВСЕ ЯЗЫКИ · SRT+TXT</button>' +
      '<button data-act="conv" style="border-color:#ffb74d;color:#ffb74d">КОНВЕЙЕР 61 · АУДИО</button>' +
      '<button data-act="convstop">СТОП КОНВЕЙЕР</button>' +
      '</div><div class="rg-status">готов =)</div></div>';
    document.body.appendChild(panel);

    const sel = panel.querySelector('.rg-lang');
    for (const l of LANGS) {
      const o = document.createElement('option');
      o.value = l.code;
      o.textContent = `${l.code} — ${l.name}`;
      sel.appendChild(o);
    }

    const title = panel.querySelector('.rg-title');
    title.textContent = mode === 'yg'
      ? `YouTubeGrab · ${vid || 'нет ?v= в адресе'}`
      : 'YouTube · ' + (document.title.replace(/ - YouTube$/, '') || vid);

    panel.querySelector('.rg-head').addEventListener('click', () =>
      panel.classList.toggle('rg-folded'));

    panel.querySelector('.rg-btns').addEventListener('click', async ev => {
      const act = ev.target && ev.target.dataset && ev.target.dataset.act;
      if (!act) return;
      if (act === 'conv') {
        if (mode !== 'yt') { setStatus('КОНВЕЙЕР работает на YouTube (страница watch)', true); return; }
        const st = convState();
        st.on = true; if (!st.idx) st.idx = 0; convSave(st);
        const nextId = CONV_IDS[st.idx];
        if (vid && vid === nextId) convStep(vid);
        else {
          setStatus('КОНВЕЙЕР СТАРТ: ' + (st.idx + 1) + '/' + CONV_IDS.length + ' — открываю видео…');
          location.href = 'https://www.youtube.com/watch?v=' + nextId;
        }
        return;
      }
      if (act === 'convstop') {
        const st = convState(); st.on = false; convSave(st);
        setStatus('КОНВЕЙЕР остановлен. Прогресс сохранён: ' + Object.keys(st.done).length + '/' + CONV_IDS.length);
        return;
      }
      if (busy) return;
      if (mode === 'yg' && !vid) { setStatus('нет ID видео в адресе', true); return; }
      if (act === 'audio2' && !vid) { setStatus('открой конкретное видео (страница watch)', true); return; }
      if (act === 'audio2' && mode === 'yg') {
        // у грабера аудио нет — аудио отдаёт сам YouTube: переносим в новую вкладку
        window.open('https://www.youtube.com/watch?v=' + vid, '_blank');
        setStatus('аудио отдаёт YouTube — открыл вкладку, жми АУДИО там');
        return;
      }
      if (act === 'fmts' && !vid) { setStatus('открой конкретное видео (страница watch)', true); return; }
      if (act === 'fmts' && mode === 'yg') {
        window.open('https://www.youtube.com/watch?v=' + vid, '_blank');
        setStatus('форматы отдаёт YouTube — открыл вкладку, жми там');
        return;
      }
      const langSel = panel.querySelector('.rg-lang');
      const chosen = langSel ? langSel.value : 'auto';
      busy = true;
      panel.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        if (act === 'audio2') {
          await ytAudio2(vid);
          return;
        }
        if (act === 'fmts') {
          const m = await ytFormats(vid);
          setStatus(m);
          return;
        }
        if (act === 'alllang') {
          if (mode === 'yg') await ygAllLangs(vid, ['srt', 'txt']);
          else await ytAllLangs(vid, ['srt', 'txt']);
          return;
        }
        const jobs = act === 'all' ? ['jpg', 'srt', 'txt'] : [act];
        for (const j of jobs) {
          try {
            setStatus('тяну…');
            let msg;
            if ((j === 'srt' || j === 'txt') && chosen !== 'auto') {
              msg = mode === 'yg'
                ? (await ygLang(vid, chosen, j), `ГОТОВО: ${chosen} → .${j}`)
                : await ytOneLang(vid, chosen, j);
            } else if (mode === 'yg') {
              msg = j === 'jpg' ? await ygThumb(vid) : await ygSubs(vid, j);
            } else {
              msg = j === 'jpg' ? await ytThumb(vid) : await ytSubs(vid, j);
            }
            setStatus(msg);
          } catch (e) {
            setStatus('ОШИБКА: ' + (e && e.message ? e.message : e), true);
            if (act !== 'all') return;
          }
          if (jobs.length > 1) await new Promise(r => setTimeout(r, 1200));
        }
      } finally {
        busy = false;
        panel.querySelectorAll('button').forEach(b => { b.disabled = false; });
      }
    });
  }

  function refresh() {
    const mode = isYG() ? 'yg' : (isYT() ? 'yt' : '');
    if (!mode) return;
    const vid = mode === 'yg' ? ygVid() : getVideoId();
    if (mode !== curMode || vid !== curVid || !document.getElementById('ruvson-grabber')) {
      if (panel) panel.remove();
      curMode = mode; curVid = vid;
      buildPanel(mode, vid);
    }
    convAutostart();
  }

  new MutationObserver(() => {}).observe(document.documentElement, { childList: true });
  document.addEventListener('yt-navigate-finish', () => setTimeout(refresh, 800));
  setInterval(refresh, 1500);
  refresh();
})();
