/*! ПУЛЬС-СИНХРОН · ядро v1.0.0 — трек ПУЛЬС_СИНХРОН (кандидат в такт).
    Чистая логика: ни DOM, ни сети, ни хранилища, ни микрофона. Время везде — целые МИЛЛИСЕКУНДЫ.
    UMD: браузер → window.__ПС_ЯДРО · Node → module.exports.
    Что здесь НЕ заявлено: измерение точности «по абсолютной правде» (её нет без эталона) —
    только сравнение с эталоном, который принёс человек (см. сравнить()). */
(function(root, factory){
  if(typeof module==='object' && module.exports) module.exports = factory();
  else root.__ПС_ЯДРО = factory();
})(typeof self!=='undefined' ? self : this, function(){
'use strict';

var ВЕР = '1.0.0', СХЕМА = 'pulse-sync/1', МИН_МС = 20;

/* ═══════════ 1. время и форматы тегов ═══════════ */
function pad(n, w){ var s = String(n); while(s.length < w) s = '0' + s; return s; }
function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
function iso(){ return new Date().toISOString(); }

/* mm:ss.xx (цифр=2, как в LRC) или mm:ss.xxx (цифр=3) */
function msТег(ms, цифр){
  ms = Math.max(0, Math.round(ms));
  if(цифр === 3) return pad(Math.floor(ms/60000),2)+':'+pad(Math.floor(ms%60000/1000),2)+'.'+pad(ms%1000,3);
  var cs = Math.round(ms/10);
  return pad(Math.floor(cs/6000),2)+':'+pad(Math.floor(cs%6000/100),2)+'.'+pad(cs%100,2);
}
/* hh:mm:ss.mmm (TTML, WebVTT); для SRT разделитель — запятая */
function msЧЧ(ms, запятая){
  ms = Math.max(0, Math.round(ms));
  var h = Math.floor(ms/3600000), m = Math.floor(ms%3600000/60000), s = Math.floor(ms%60000/1000), r = ms%1000;
  return pad(h,2)+':'+pad(m,2)+':'+pad(s,2)+(запятая?',':'.')+pad(r,3);
}
/* '12:34.56' | '1:02:03.456' | '12:34' → мс; не тег → null */
function тегMs(т){
  var m = /^\s*(?:(\d+):)?(\d{1,3}):(\d{1,2})(?:[.,:](\d{1,3}))?\s*$/.exec(String(т));
  if(!m) return null;
  var h = m[1] ? +m[1] : 0, mm = +m[2], ss = +m[3], fr = m[4] || '0';
  var ms = fr.length === 1 ? +fr*100 : fr.length === 2 ? +fr*10 : +fr;
  return Math.round(((h*60 + mm)*60 + ss)*1000 + ms);
}

/* ═══════════ 2. слова и слоги ═══════════ */
function слова(т){ return String(т == null ? '' : т).split(/\s+/).filter(Boolean); }
function норм(т){ return String(т == null ? '' : т).toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]/gu,''); }

var ГЛАС = /[aeiouyаеёиоуыэюяіїє]/, ЗНАК = /[ьъй]/;
/* Слоговой разбор «приближённо» (черновик): честно пустой ответ для не-буквенных слов (CJK, цифры).
   Правило то же, что у слоги() Живого Контура v10.79: одна согласная — к следующей гласной,
   пара и больше — режем между «юнитами» (ь/ъ/й клеятся к своей согласной). */
function слоги(слово){
  var с = String(слово == null ? '' : слово).trim().toLowerCase().replace(/[^\p{L}\-]/gu, '');
  if(!с || !/^[a-zа-яёіїє\-]+$/.test(с)) return [];
  var вых = [];
  с.split('-').filter(Boolean).forEach(function(ч){
    var буф = '', куски = [], i = 0;
    while(i < ч.length){
      буф += ч[i];
      if(ГЛАС.test(ч[i])){
        var юниты = [], j = i + 1;
        while(j < ч.length && !ГЛАС.test(ч[j])){
          var юнит = ч[j]; j++;
          while(j < ч.length && ЗНАК.test(ч[j])){ юнит += ч[j]; j++; }
          юниты.push(юнит);
        }
        if(j >= ч.length){ буф += юниты.join(''); }
        else if(юниты.length === 0){ куски.push(буф); буф = ''; }
        else if(юниты.length === 1){ куски.push(буф); буф = юниты[0]; }
        else { var пол = Math.ceil(юниты.length/2); буф += юниты.slice(0,пол).join(''); куски.push(буф); буф = юниты.slice(пол).join(''); }
        i = j;
      } else i++;
    }
    if(буф) куски.push(буф);
    if(!куски.length) куски.push(ч);
    вых = вых.concat(куски);
  });
  return вых;
}
/* слоги с сохранением регистра исходного слова (для .harm: «Мы», «бе-жим») */
function слогиИсх(слово, внешние){
  var ядро = String(слово == null ? '' : слово).replace(/[^\p{L}\-]/gu, '');
  var сп = (typeof внешние === 'function' ? внешние(ядро) : null);
  if(!Array.isArray(сп) || !сп.length) сп = слоги(ядро);
  if(!сп.length) return [];
  var out = [], p = 0, плоскоДл = сп.join('').length;
  if(плоскоДл !== ядро.replace(/-/g,'').length) return [ядро.replace(/-/g,'')];  /* расхождение — не режем, честно целиком */
  var бездеф = ядро.replace(/-/g,'');
  сп.forEach(function(x){ out.push(бездеф.substr(p, x.length)); p += x.length; });
  return out;
}

/* ═══════════ 3. модель: черновик → SongSync ═══════════ */
function вес(слово){ return Math.max(1, слоги(слово).length) + (/[,;:.!?…—]$/.test(слово) ? 0.5 : 0); }

/* Черновик слов строки: время делится пропорционально слогам. ЭТО ЭВРИСТИКА, не измерение: src='draft'. */
function черновик(л){
  var сл = слова(л.t); if(!сл.length) return [];
  var a = л.a, b = Math.max(л.b, л.a + сл.length*МИН_МС);
  var w = сл.map(вес), tot = w.reduce(function(x,y){ return x+y; }, 0), cum = 0, t = a, out = [];
  for(var i = 0; i < сл.length; i++){
    cum += w[i];
    var e = (i === сл.length - 1) ? b : a + Math.round((b - a)*cum/tot);
    if(e < t + МИН_МС) e = t + МИН_МС;
    out.push({ t: сл[i], s: t, e: e, src: 'draft' });
    t = e;
  }
  return out;
}
/* Из window.SONG хоста (секунды → мс). Ось строк не меняется: правило «window.SONG.cues не трогаем». */
function изПесни(песня, опц){
  опц = опц || {};
  var lines = (песня && песня.cues || []).map(function(c, i){
    var л = { i: i, t: String(c.t == null ? '' : c.t), a: Math.round(c.a*1000), b: Math.round((c.b != null ? c.b : c.a + 4)*1000), units: [] };
    л.units = черновик(л); return л;
  });
  return { схема: СХЕМА, songId: опц.songId || null, title: (песня && (песня.t || песня.title)) || '', lang: опц.lang || 'ru',
           bpm: опц.bpm || 104, lines: lines, создано: iso(), изменено: iso(), инструмент: 'ПУЛЬС-СИНХРОН ' + ВЕР };
}
function клон(o){ return JSON.parse(JSON.stringify(o)); }
function коснись(s){ s.изменено = iso(); return s; }

/* ═══════════ 4. история (отмена/повтор) ═══════════ */
function История(макс){
  var st = [], p = -1; макс = макс || 100;
  return {
    поставь: function(s){ st = st.slice(0, p + 1); st.push(JSON.stringify(s)); if(st.length > макс) st.shift(); p = st.length - 1; },
    отмена: function(){ if(p <= 0) return null; p--; return JSON.parse(st[p]); },
    повтор: function(){ if(p >= st.length - 1) return null; p++; return JSON.parse(st[p]); },
    можноОтмену: function(){ return p > 0; }, можноПовтор: function(){ return p < st.length - 1; },
    глубина: function(){ return st.length; }
  };
}

/* ═══════════ 5. правки (все работают на переданной копии и возвращают её) ═══════════ */
function ед(s, i, j){ var л = s.lines[i]; return л && л.units[j] ? л.units[j] : null; }
function двигатьСтарт(s, i, j, новый, склей){
  var л = s.lines[i], u = ед(s,i,j); if(!u) return s;
  var пр = л.units[j-1], lo = пр ? пр.s + МИН_МС : 0, hi = u.e - МИН_МС;
  новый = clamp(Math.round(новый), lo, Math.max(lo, hi));
  if(пр && склей !== false && пр.e === u.s){ пр.e = новый; пр.src = 'human'; }
  u.s = новый; u.src = 'human'; return коснись(s);
}
function двигатьКонец(s, i, j, новый, склей){
  var л = s.lines[i], u = ед(s,i,j); if(!u) return s;
  var сл = л.units[j+1], lo = u.s + МИН_МС, hi = сл ? сл.e - МИН_МС : Infinity;
  новый = clamp(Math.round(новый), lo, Math.max(lo, hi));
  if(сл && склей !== false && сл.s === u.e){ сл.s = новый; сл.src = 'human'; }
  u.e = новый; u.src = 'human'; return коснись(s);
}
function сдвинутьДиапазон(s, i0, i1, δ){
  δ = Math.round(δ);
  for(var i = Math.max(0,i0); i <= Math.min(s.lines.length-1, i1); i++){
    var л = s.lines[i]; л.a = Math.max(0, л.a + δ); л.b = Math.max(л.a, л.b + δ);
    л.units.forEach(function(u){ u.s = Math.max(0, u.s + δ); u.e = Math.max(u.s + МИН_МС, u.e + δ); u.src = 'human'; });
  }
  return коснись(s);
}
function сдвинутьСтроку(s, i, δ){ return сдвинутьДиапазон(s, i, i, δ); }
function сдвинутьВсё(s, δ){ return сдвинутьДиапазон(s, 0, s.lines.length - 1, δ); }
function подтвердить(s, i, j){
  var л = s.lines[i]; if(!л) return s;
  л.units.forEach(function(u, k){ if(j == null || j === k) u.src = 'human'; });
  return коснись(s);
}
function слить(s, i, j){
  var л = s.lines[i]; if(!л || !л.units[j] || !л.units[j+1]) return s;
  var a = л.units[j], b = л.units[j+1];
  л.units.splice(j, 2, { t: a.t + ' ' + b.t, s: a.s, e: b.e, src: 'human' }); return коснись(s);
}
function разделить(s, i, j){
  var л = s.lines[i], u = ед(s,i,j); if(!u) return s;
  var сл = слова(u.t); if(сл.length < 2) return s;
  var w = сл.map(вес), tot = w.reduce(function(x,y){ return x+y; }, 0), cum = 0, t = u.s, out = [];
  сл.forEach(function(x, k){ cum += w[k]; var e = k === сл.length-1 ? u.e : u.s + Math.round((u.e - u.s)*cum/tot); out.push({ t: x, s: t, e: Math.max(e, t + МИН_МС), src: 'human' }); t = out[out.length-1].e; });
  л.units.splice.apply(л.units, [j, 1].concat(out)); return коснись(s);
}

/* ═══════════ 6. валидатор (честные метрики) ═══════════ */
/* «подтверждено» = человек коснулся (src='human'). Это доля РУЧНОЙ проверки, НЕ точность. */
function проверить(s){
  var ош = [], пр = [], n = 0, ч = 0, ии = 0, чер = 0, имп = 0, пред = -1;
  (s.lines || []).forEach(function(л, i){
    if(л.a < пред) ош.push('строка '+i+': начинается раньше предыдущей');
    пред = л.a; var п = null;
    if(!л.units.length && String(л.t).trim()) пр.push('строка '+i+': нет единиц (слов)');
    л.units.forEach(function(u, j){
      n++; if(u.src === 'human') ч++; else if(u.src === 'ai') ии++; else if(u.src === 'import') имп++; else чер++;
      var где = 'строка '+i+', слово '+j+' «'+u.t+'»';
      if(!isFinite(u.s) || !isFinite(u.e)){ ош.push(где+': время не число'); return; }
      if(u.e - u.s < МИН_МС) ош.push(где+': короче '+МИН_МС+' мс');
      if(п && u.s < п.e) ош.push(где+': перекрывает предыдущее слово на '+(п.e - u.s)+' мс');
      if(u.s < л.a - 500 || u.e > л.b + 500) пр.push(где+': выходит за окно строки больше чем на 0,5 с');
      if(u.e - u.s > 8000) пр.push(где+': длиннее 8 с');
      if(п && u.s - п.e > 2000) пр.push(где+': дыра перед словом больше 2 с');
      п = u;
    });
  });
  return { ok: ош.length === 0, ошибки: ош, предупреждения: пр,
    статистика: { единиц: n, человек: ч, ии: ии, импорт: имп, черновик: чер, подтверждено_процент: n ? Math.round(1000*ч/n)/10 : 0 } };
}

/* ═══════════ 7. форматы ═══════════ */
function экр(т){ return String(т).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function границаСтроки(л){ var e = л.b; if(л.units.length) e = Math.max(e, л.units[л.units.length-1].e); return e; }

function вLRC(s, опц){ var д = (опц && опц.цифр) || 2; return (s.lines||[]).map(function(л){ return '['+msТег(л.a,д)+']'+л.t; }).join('\n') + '\n'; }

/* Enhanced LRC (A2): [mm:ss.xx]<mm:ss.xx>слово <mm:ss.xx>слово <mm:ss.xx>  — хвостовой тег = конец последнего слова */
function вELRC(s, опц){
  var д = (опц && опц.цифр) || 2, o = [];
  if(s.title) o.push('[ti:'+s.title+']');
  o.push('[re:'+s.инструмент+']');
  (s.lines||[]).forEach(function(л){
    if(!л.units.length){ o.push('['+msТег(л.a,д)+']'+л.t); return; }
    var t = '['+msТег(л.a,д)+']';
    t += л.units.map(function(u){ return '<'+msТег(u.s,д)+'>'+u.t; }).join(' ');
    t += ' <'+msТег(л.units[л.units.length-1].e,д)+'>';
    o.push(t);
  });
  return o.join('\n') + '\n';
}
var RE_ТЕГ = '\\d{1,3}:\\d{1,2}(?:[.:]\\d{1,3})?';
function изELRC(текст, опц){
  var src = (опц && опц.src) || 'import', мета = {}, пред = [], lines = [];
  String(текст == null ? '' : текст).replace(/\r/g,'').split('\n').forEach(function(raw){
    var строка = raw.trim(); if(!строка) return;
    var м = /^\[([A-Za-z]+):([^\]]*)\]$/.exec(строка);
    if(м){ мета[м[1].toLowerCase()] = м[2].trim(); return; }
    var теги = [], rest = строка, mt;
    while((mt = new RegExp('^\\[('+RE_ТЕГ+')\\]').exec(rest))){ теги.push(тегMs(mt[1])); rest = rest.slice(mt[0].length); }
    if(!теги.length){ пред.push('строка без тега времени пропущена: '+строка.slice(0,40)); return; }
    var части = rest.split(new RegExp('<('+RE_ТЕГ+')>')), units = [], k;
    var голый = части[0].trim();
    for(k = 1; k < части.length; k += 2){
      var t0 = тегMs(части[k]), tx = (части[k+1] || '').trim(), последняя = units[units.length-1];
      if(последняя && последняя.e == null) последняя.e = t0;
      if(tx) units.push({ t: tx, s: t0, e: null, src: src });
    }
    теги.forEach(function(a){
      var dub = units.map(function(u){ return { t: u.t, s: u.s, e: u.e, src: u.src }; });
      var текст2 = dub.length ? dub.map(function(u){ return u.t; }).join(' ') : голый;
      lines.push({ i: 0, t: текст2, a: a, b: dub.length && dub[dub.length-1].e != null ? dub[dub.length-1].e : null, units: dub });
    });
  });
  lines.sort(function(x, y){ return x.a - y.a; });
  lines.forEach(function(л, i){
    л.i = i;
    var next = lines[i+1] ? lines[i+1].a : null;
    if(л.b == null) л.b = next != null ? next : л.a + 4000;
    л.units.forEach(function(u, k){ if(u.e == null) u.e = (л.units[k+1] ? л.units[k+1].s : л.b); });
    if(!л.units.length) л.units = черновик(л);   /* обычный LRC: слова — черновик, честно src=draft */
  });
  return { схема: СХЕМА, songId: null, title: мета.ti || '', lang: мета.la || 'ru', bpm: 104, lines: lines, мета: мета, предупреждения: пред,
           создано: iso(), изменено: iso(), инструмент: 'импорт LRC/eLRC · ПУЛЬС-СИНХРОН ' + ВЕР };
}

function вSRT(s){
  return (s.lines||[]).map(function(л, i){ return (i+1)+'\n'+msЧЧ(л.a,true)+' --> '+msЧЧ(границаСтроки(л),true)+'\n'+л.t+'\n'; }).join('\n');
}
/* WebVTT: метки-таймстампы внутри текста реплики (paint-on). Метки зажаты внутрь окна реплики и неубывающие (требование формата). */
function вVTT(s){
  var o = ['WEBVTT', ''];
  (s.lines||[]).forEach(function(л, i){
    var a = л.a, e = границаСтроки(л), последний = a;
    var текст = л.units.length ? л.units.map(function(u, k){ var t = clamp(Math.max(u.s, последний), a, e); последний = t; return (k ? ' ' : '')+'<'+msЧЧ(t)+'>'+u.t.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }).join('') : л.t;
    o.push(String(i+1), msЧЧ(a)+' --> '+msЧЧ(e), текст, '');
  });
  return o.join('\n');
}
function вTTML(s){
  var o = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xmlns:ttp="http://www.w3.org/ns/ttml#parameter" ttp:timeBase="media" xml:lang="'+экр(s.lang||'ru')+'">',
    '  <head><metadata><ttm:title>'+экр(s.title||'')+'</ttm:title><ttm:desc>'+экр(s.инструмент||'')+'</ttm:desc></metadata></head>',
    '  <body><div>'];
  (s.lines||[]).forEach(function(л){
    var p = '    <p begin="'+msЧЧ(л.a)+'" end="'+msЧЧ(границаСтроки(л))+'">';
    p += л.units.length ? л.units.map(function(u){ return '<span begin="'+msЧЧ(u.s)+'" end="'+msЧЧ(u.e)+'">'+экр(u.t)+'</span>'; }).join(' ') : экр(л.t);
    o.push(p + '</p>');
  });
  o.push('  </div></body>', '</tt>', '');
  return o.join('\n');
}
function вJSON(s){ return JSON.stringify(s, null, 2); }
function изJSON(t){
  var o = typeof t === 'string' ? JSON.parse(t) : t;
  if(!o || o.схема !== СХЕМА || !Array.isArray(o.lines)) throw new Error('не pulse-sync/1');
  return o;
}

/* .harm/0.1 для дома: ключ строки — норм(alt), веса — слоги с длительностью > 0 в «долях» (bpm).
   По умолчанию берутся ТОЛЬКО строки без черновика: черновик = эвристика, а дом ждёт «честные маркерные веса». */
function вHarm(s, опц, внешниеСлоги){
  опц = опц || {};
  var bpm = опц.bpm || s.bpm || 104, к = bpm/60000, tl = [], пропущено = 0;
  (s.lines||[]).forEach(function(л){
    if(!л.units.length || л.units.length !== слова(л.t).length){ пропущено++; return; }
    if(!опц.вклЧерновик && л.units.some(function(u){ return u.src === 'draft'; })){ пропущено++; return; }
    var words = л.units.map(function(u){
      var сл = слогиИсх(u.t, внешниеСлоги), д = Math.max(0.001, +((u.e - u.s)*к).toFixed(4));
      if(!сл.length) return [[u.t.replace(/\s+/g,''), д]];
      var долю = +(д/сл.length).toFixed(4) || 0.001; return сл.map(function(x){ return [x, долю]; });
    });
    tl.push({ beat: +(л.a*к).toFixed(3), type: 'text', data: { words: words }, alt: л.t });
  });
  tl.sort(function(x, y){ return x.beat - y.beat; });
  return { doc: { schema: 'harm/0.1', title: s.title || 'без названия', author: опц.автор || 'ПУЛЬС-СИНХРОН · измеренные слова', license: 'MIT', bpm: bpm, timeline: tl },
           строк: tl.length, пропущено: пропущено };
}

/* ═══════════ 8. выравнивание ASR → известный текст ═══════════ */
/* Принимает разные диалекты JSON (WhisperX / faster-whisper / transformers.js / плоский список) → [{w,s,e}] в мс */
function нормализоватьASR(j){
  var out = [];
  function push(w, s, e){ if(w == null) return; var t = String(w).trim(); if(!t || !isFinite(s) || !isFinite(e)) return; out.push({ w: t, s: Math.round(s*1000), e: Math.round(e*1000) }); }
  if(Array.isArray(j)) j.forEach(function(x){
    if(x && x.word != null) push(x.word, x.start, x.end);
    else if(x && x.text != null && Array.isArray(x.timestamp)) push(x.text, x.timestamp[0], x.timestamp[1]);
    else if(x && x.w != null) out.push({ w: String(x.w), s: Math.round(x.s), e: Math.round(x.e) });
  });
  else if(j && Array.isArray(j.word_segments)) j.word_segments.forEach(function(x){ push(x.word, x.start, x.end); });
  else if(j && Array.isArray(j.segments)) j.segments.forEach(function(sg){ (sg.words || []).forEach(function(x){ push(x.word, x.start, x.end); }); });
  else if(j && Array.isArray(j.chunks)) j.chunks.forEach(function(x){ if(Array.isArray(x.timestamp)) push(x.text, x.timestamp[0], x.timestamp[1]); });
  return out;
}
function лев(a, b){
  if(a === b) return 0; var m = a.length, n = b.length; if(!m) return n; if(!n) return m;
  var пред = [], тек = [], i, j; for(j = 0; j <= n; j++) пред[j] = j;
  for(i = 1; i <= m; i++){ тек[0] = i; for(j = 1; j <= n; j++) тек[j] = Math.min(пред[j]+1, тек[j-1]+1, пред[j-1] + (a[i-1] === b[j-1] ? 0 : 1)); var t = пред; пред = тек; тек = t; }
  return пред[n];
}
function сходство(a, b){ if(!a && !b) return 1; var L = Math.max(a.length, b.length); return L ? 1 - лев(a, b)/L : 1; }

/* Глобальное выравнивание (Needleman–Wunsch): порядок слов сохраняется — повторяющиеся припевы не «слипаются».
   Совпавшие слова получают время ASR (src='ai'); несовпавшие — интерполяция между соседями (src='draft', честно).
   Границы строк НЕ меняются. Возвращает новую копию + статистику. */
function выровнять(s, asr, опц){
  опц = опц || {}; var порог = опц.порог != null ? опц.порог : 0.6, ГЭП = -0.45;
  var res = клон(s), L = [];
  res.lines.forEach(function(л, i){ л.units.forEach(function(u, j){ L.push({ i: i, j: j, n: норм(u.t) }); }); });
  var A = asr.map(function(x){ return { n: норм(x.w), s: x.s, e: x.e }; }).filter(function(x){ return x.n; });
  var n = L.length, m = A.length;
  if(!n || !m) return { s: res, совпало: 0, всего: n, доля: 0 };
  var D = [], T = [], i, j;
  for(i = 0; i <= n; i++){ D[i] = new Float32Array(m+1); T[i] = new Uint8Array(m+1); }
  for(i = 1; i <= n; i++){ D[i][0] = i*ГЭП; T[i][0] = 1; }
  for(j = 1; j <= m; j++){ D[0][j] = j*ГЭП; T[0][j] = 2; }
  for(i = 1; i <= n; i++) for(j = 1; j <= m; j++){
    var sim = сходство(L[i-1].n, A[j-1].n), диаг = D[i-1][j-1] + (sim >= порог ? 2*sim - 0.4 : -1.0);
    var вверх = D[i-1][j] + ГЭП, влево = D[i][j-1] + ГЭП;
    if(диаг >= вверх && диаг >= влево){ D[i][j] = диаг; T[i][j] = 0; } else if(вверх >= влево){ D[i][j] = вверх; T[i][j] = 1; } else { D[i][j] = влево; T[i][j] = 2; }
  }
  var пара = new Array(n); for(i = 0; i < n; i++) пара[i] = null;
  i = n; j = m;
  while(i > 0 || j > 0){
    var t = (i > 0 && j > 0) ? T[i][j] : (i > 0 ? 1 : 2);
    if(t === 0){ if(сходство(L[i-1].n, A[j-1].n) >= порог) пара[i-1] = A[j-1]; i--; j--; } else if(t === 1) i--; else j--;
  }
  var совпало = 0;
  L.forEach(function(x, k){ if(пара[k]){ var u = res.lines[x.i].units[x.j]; u.s = пара[k].s; u.e = пара[k].e; u.src = 'ai'; совпало++; } });
  /* дыры: интерполяция внутри окна строки между ближайшими совпавшими соседями */
  res.lines.forEach(function(л){
    var u = л.units, k = 0;
    while(k < u.length){
      if(u[k].src === 'ai'){ k++; continue; }
      var a = k; while(k < u.length && u[k].src !== 'ai') k++;
      var lo = a > 0 ? u[a-1].e : л.a, hi = k < u.length ? u[k].s : Math.max(л.b, lo + (k - a)*МИН_МС);
      var w = [], tot = 0, q; for(q = a; q < k; q++){ w.push(вес(u[q].t)); tot += w[w.length-1]; }
      var cum = 0, t0 = lo; for(q = a; q < k; q++){ cum += w[q-a]; var e = q === k-1 ? hi : lo + Math.round((hi - lo)*cum/tot); u[q].s = t0; u[q].e = Math.max(e, t0 + МИН_МС); u[q].src = 'draft'; t0 = u[q].e; }
    }
    /* монотонность после замены */
    for(var z = 1; z < u.length; z++){ if(u[z].s < u[z-1].e){ var mid = Math.round((u[z].s + u[z-1].e)/2); u[z-1].e = Math.max(u[z-1].s + МИН_МС, mid); u[z].s = u[z-1].e; if(u[z].e < u[z].s + МИН_МС) u[z].e = u[z].s + МИН_МС; } }
  });
  коснись(res);
  return { s: res, совпало: совпало, всего: n, доля: n ? совпало/n : 0 };
}

/* Сравнение двух разметок ОДНОЙ песни: «насколько A отличается от эталона B». Эталон приносит человек. */
function сравнить(A, B){
  var d = [];
  A.lines.forEach(function(л, i){ var m = B.lines[i]; if(!m) return; л.units.forEach(function(u, j){ if(m.units[j] && норм(m.units[j].t) === норм(u.t)) d.push(Math.abs(u.s - m.units[j].s)); }); });
  d.sort(function(x, y){ return x - y; });
  var n = d.length; if(!n) return { n: 0 };
  function доля(лим){ var c = 0; d.forEach(function(x){ if(x <= лим) c++; }); return Math.round(1000*c/n)/10; }
  return { n: n, среднее_мс: Math.round(d.reduce(function(x, y){ return x+y; }, 0)/n), медиана_мс: d[Math.floor(n/2)], p90_мс: d[Math.floor(n*0.9)], в50_процент: доля(50), в80_процент: доля(80) };
}

/* ═══════════ 9. FSRS-6 (параметры и формулы — wiki open-spaced-repetition/awesome-fsrs, «The Algorithm», 2026-07-28) ═══════════ */
var W6 = [0.212,1.2931,2.3065,8.2956,6.4133,0.8334,3.0194,0.001,1.8722,0.1666,0.796,1.4835,0.0614,0.2629,1.6483,0.6014,1.8729,0.5425,0.0912,0.0658,0.1542];
function FSRS(w, удержание){
  w = w || W6; удержание = удержание || 0.9;
  var decay = w[20], factor = Math.pow(0.9, -1/decay) - 1;
  function R(t, S){ return Math.pow(1 + factor*t/S, -decay); }                       /* t, S — в днях */
  function интервал(S, r){ return S/factor*(Math.pow(r || удержание, -1/decay) - 1); }  /* дни до порога r */
  function S0(G){ return Math.max(w[G-1], 0.1); }
  function D0(G){ return clamp(w[4] - Math.exp(w[5]*(G-1)) + 1, 1, 10); }
  function Dновая(D, G){ var d1 = D + (-w[6]*(G-3))*(10-D)/9; return clamp(w[7]*D0(4) + (1-w[7])*d1, 1, 10); }
  function Sвспомнил(D, S, r, G){
    var ш = G === 2 ? w[15] : 1, б = G === 4 ? w[16] : 1;
    return clamp(S*(1 + Math.exp(w[8])*(11-D)*Math.pow(S, -w[9])*(Math.exp(w[10]*(1-r)) - 1)*ш*б), 0.01, 36500);
  }
  function Sзабыл(D, S, r){ var v = w[11]*Math.pow(D, -w[12])*(Math.pow(S+1, w[13]) - 1)*Math.exp(w[14]*(1-r)); return clamp(Math.min(v, S), 0.01, 36500); }  /* min(.,S) — мой страж, не из источника */
  function Sтотже(S, G){ var v = S*Math.exp(w[17]*(G-3+w[18]))*Math.pow(S, -w[19]); return clamp(G >= 2 ? Math.max(v, S) : v, 0.01, 36500); }
  function новая(id, данные){ return { id: id, S: 0, D: 0, последний: 0, срок: 0, повторов: 0, провалов: 0, состояние: 'новая', данные: данные || {} }; }
  function оценить(к, G, сейчас){
    var c = клон(к), дни = c.последний ? (сейчас - c.последний)/86400000 : 0;
    if(c.состояние === 'новая'){ c.S = S0(G); c.D = D0(G); c.состояние = G === 1 ? 'повтор' : 'повтор'; }
    else {
      var r = R(Math.max(0, дни), c.S);
      if(дни < 1){ c.S = Sтотже(c.S, G); c.D = Dновая(c.D, G); }
      else if(G === 1){ c.S = Sзабыл(c.D, c.S, r); c.D = Dновая(c.D, G); c.провалов++; }
      else { c.S = Sвспомнил(c.D, c.S, r, G); c.D = Dновая(c.D, G); }
    }
    c.повторов++; c.последний = сейчас; c.срок = сейчас + Math.max(60000, интервал(c.S)*86400000); return c;
  }
  function готовность(к, сейчас){ if(к.состояние === 'новая' || !к.последний) return null; return R(Math.max(0, (сейчас - к.последний)/86400000), к.S); }
  function предпросмотр(к, сейчас){ return [1,2,3,4].map(function(G){ var c = оценить(к, G, сейчас); return { G: G, дни: (c.срок - сейчас)/86400000 }; }); }
  return { параметры: w, фактор: factor, R: R, интервал: интервал, новая: новая, оценить: оценить, готовность: готовность, предпросмотр: предпросмотр, S0: S0, D0: D0 };
}
function подпись(дни){
  var м = дни*1440; if(м < 1.5) return '1 мин'; if(м < 60) return Math.round(м)+' мин'; var ч = дни*24; if(ч < 36) return Math.round(ч)+' ч';
  if(дни < 60) return Math.round(дни)+' дн'; if(дни < 730) return Math.round(дни/30.4)+' мес'; return Math.round(дни/365)+' г';
}

/* ═══════════ 10. тренажёры (чистая логика) ═══════════ */
/* Диктант: выравнивание слов эталона и ответа (расстояние Левенштейна по словам) → список расхождений */
function диктант(эталон, ответ){
  var E = слова(эталон), O = слова(ответ), n = E.length, m = O.length, i, j;
  var D = [], T = [];
  for(i = 0; i <= n; i++){ D[i] = []; T[i] = []; for(j = 0; j <= m; j++){ D[i][j] = 0; T[i][j] = ''; } }
  for(i = 1; i <= n; i++){ D[i][0] = i; T[i][0] = 'у'; }
  for(j = 1; j <= m; j++){ D[0][j] = j; T[0][j] = 'л'; }
  for(i = 1; i <= n; i++) for(j = 1; j <= m; j++){
    var с = норм(E[i-1]) === норм(O[j-1]) ? 0 : 1, a = D[i-1][j-1] + с, b = D[i-1][j] + 1, c2 = D[i][j-1] + 1, mn = Math.min(a, b, c2);
    D[i][j] = mn; T[i][j] = mn === a ? (с ? 'з' : 'с') : mn === b ? 'у' : 'л';
  }
  var ош = [], верно = 0; i = n; j = m;
  while(i > 0 || j > 0){
    var t = T[i][j];
    if(t === 'с'){ верно++; i--; j--; } else if(t === 'з'){ ош.unshift({ тип: 'заменено', эталон: E[i-1], ответ: O[j-1] }); i--; j--; }
    else if(t === 'у'){ ош.unshift({ тип: 'пропущено', эталон: E[i-1], ответ: '' }); i--; } else { ош.unshift({ тип: 'лишнее', эталон: '', ответ: O[j-1] }); j--; }
  }
  return { верно: верно, всего: n, ошибки: ош, точно: ош.length === 0 };
}
/* Пропуски: какие слова скрыть. правило: {каждое:k} | {отмеченные:Set норм-слов} | {случайные:n, зерно} */
function пропуски(units, правило){
  var idx = [], i; правило = правило || { каждое: 3 };
  if(правило.отмеченные){ units.forEach(function(u, k){ if(правило.отмеченные.has(норм(u.t))) idx.push(k); }); }
  else if(правило.случайные){
    var z = (правило.зерно || 1) >>> 0, rnd = function(){ z = (z*1664525 + 1013904223) >>> 0; return z/4294967296; }, pool = units.map(function(_, k){ return k; });
    for(i = pool.length - 1; i > 0; i--){ var r = Math.floor(rnd()*(i+1)), t = pool[i]; pool[i] = pool[r]; pool[r] = t; }
    idx = pool.slice(0, Math.min(правило.случайные, pool.length)).sort(function(a, b){ return a - b; });
  } else { var k0 = Math.max(2, правило.каждое || 3); units.forEach(function(_, k){ if((k+1) % k0 === 0) idx.push(k); }); }
  return idx;
}
/* Эхо: «слушай строку → твоя очередь» — расписание по размеченным строкам */
function эхоПлан(s, i0, i1, коэф){
  коэф = коэф || 1; var план = [];
  for(var i = Math.max(0,i0); i <= Math.min(s.lines.length-1, i1); i++){ var л = s.lines[i], a = л.a, b = границаСтроки(л); план.push({ строка: i, играть: [a, b], пауза_мс: Math.round((b - a)*коэф) }); }
  return план;
}

return { ВЕР: ВЕР, СХЕМА: СХЕМА, МИН_МС: МИН_МС,
  время: { msТег: msТег, msЧЧ: msЧЧ, тегMs: тегMs },
  текст: { слова: слова, норм: норм, слоги: слоги, слогиИсх: слогиИсх, вес: вес },
  модель: { изПесни: изПесни, черновик: черновик, клон: клон, История: История },
  правки: { двигатьСтарт: двигатьСтарт, двигатьКонец: двигатьКонец, сдвинутьСтроку: сдвинутьСтроку, сдвинутьДиапазон: сдвинутьДиапазон, сдвинутьВсё: сдвинутьВсё, подтвердить: подтвердить, слить: слить, разделить: разделить },
  проверить: проверить, границаСтроки: границаСтроки,
  формат: { вLRC: вLRC, вELRC: вELRC, изELRC: изELRC, вSRT: вSRT, вVTT: вVTT, вTTML: вTTML, вJSON: вJSON, изJSON: изJSON, вHarm: вHarm },
  выравнивание: { нормализоватьASR: нормализоватьASR, выровнять: выровнять, сравнить: сравнить, сходство: сходство },
  память: { FSRS: FSRS, W6: W6, подпись: подпись },
  тренажёр: { диктант: диктант, пропуски: пропуски, эхоПлан: эхоПлан }
};
});
