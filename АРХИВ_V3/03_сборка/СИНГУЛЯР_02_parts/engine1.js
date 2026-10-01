'use strict';
/* ═══ СИНГУЛЯР·02 — эмерджентный организм: 1 песня × 157 голосов ═══
   Наследие v1.1: двойные часы (audio.currentTime — единственный источник истины),
   word-wipe по весу слова с правилом первого слова, spring-скролл с предвосхищением,
   интерлюдии-дыхание, WebGL2-морф куб→колесо, Blob-аудио, deep-link, память, a11y.
   Новое в 02: РЕЗОНАНС (одна строка — шесть голосов), ПУЛЬС (память организма),
   СОЗВЕЗДИЕ (спицы света услышанного), ДНК-САМОТЕСТ (файл знает сам себя),
   ПЛАН ВНУТРИ (генплан качается офлайн). Ядро v1.1 проверено node --check. */
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const fmtT=s=>{s=Math.max(0,s||0);return Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0')};
const RTL=new Set(['ar','iw','fa','ur','ps','sd','ug','yi','dv']);

/*__DNA__*/

/* ═══ ПЛАН ВНУТРИ: генеральный план организма (единственный источник истины) ═══ */
const PLAN02={
  meta:'СИНГУЛЯРНОСТЬ RUVSON · генеральный план организма · v2.0 · 2026-10-01',
  creed:'целое знает части · часть знает целое · от души к душе · от человека человеку',
  phases:[
    {n:'ФАЗА 0',t:'ДИАГНОЗ',st:'done',items:[
      'v1.1 ядро проверено: node --check OK — двойные часы, wipe, spring целы',
      'наследие принято полностью: куб → колесо → караоке, task files, офлайн-автономность']},
    {n:'ФАЗА 1',t:'РЕЗОНАНС',st:'done',items:[
      'одна строка — шесть голосов одновременно (RU-опора + переводы)',
      'LRC-таймкоды как общий хронотоп 157 голосов — «одна правда» становится видимой',
      'клавиша R; строка-резонанс кликабельна — прыжок по времени']},
    {n:'ФАЗА 2',t:'ПАМЯТЬ',st:'done',items:[
      'ПУЛЬС: сколько голосов услышано, прогресс сингулярности % — в счётчике',
      'СОЗВЕЗДИЕ: услышанные узлы соединяются спицами света',
      'память в localStorage: организм помнит душу между визитами']},
    {n:'ФАЗА 3',t:'САМОПОЗНАНИЕ',st:'done',items:[
      'ДНК-самотест при загрузке: 9 проверок ядра (аудио, обложка, 157 голосов, LRC, файлы, план)',
      'статус — в топбаре; подробности — в ПЛАНе',
      'принцип: целое знает части — в том числе инженерно']},
    {n:'ФАЗА 4',t:'ПЛАН ВНУТРИ',st:'done',items:[
      'генплан вшит в файл (эта панель) и качается офлайн: план ⬇ .md и в Task Files',
      'единственный источник истины: MD генерируется из тех же данных, что видит глаз']},
    {n:'ФАЗА 5',t:'СМЫСЛ',st:'next',items:[
      '157 ASR-черновиков → смысловая редактура людьми-носителями',
      'очередь: ru → en → es → fr → de → … → редкие языки',
      'верификация носителями; пометка «редактировано» в панели языков']},
    {n:'ФАЗА 6',t:'КОНВЕЙЕР ПЕСЕН',st:'far',items:[
      'заглушки → живые организмы: Цени время · Не жди завтра · Ангел без крыльев…',
      'каждая песня = тот же организм: куб → колесо 157 → караоке → резонанс',
      'сборщик вшивает аудио+LRC+файлы задачи в один автономный HTML']},
    {n:'ФАЗА 7',t:'СИНГУЛЯРНОСТЬ',st:'far',items:[
      'созвездие песен × 157 голосов = эмерджентная вселенная RUVSON',
      'эмерджентные свойства: резонанс смыслов, граф «правда-связей», живые переводы',
      'инженерия: ноль внешних запросов, офлайн-автономность, честность черновиков']}
  ]};
function planMD(){
  const L=['# ГЕНЕРАЛЬНЫЙ ПЛАН: СИНГУЛЯРНОСТЬ RUVSON','## организм СИНГУЛЯР·02 «РЕЗОНАНС» · v2.0 · 2026-10-01','',
    '> '+PLAN02.creed,'','КАК БЫЛО: SRT-черновики → ручная правка → разрозненные файлы.','КАК ЕСТЬ: автономный HTML-организм: куб → колесо 157 → караоке → резонанс.','КАК БУДЕТ: созвездие песен × 157 голосов — эмерджентная вселенная.',''];
  for(const p of PLAN02.phases){
    const st=p.st==='done'?'[СДЕЛАНО]':p.st==='next'?'[СЕЙЧАС]':'[ГОРИЗОНТ]';
    L.push('## '+p.n+' — '+p.t+' '+st);
    for(const it of p.items)L.push('- '+it);
    L.push('');
  }
  L.push('---','ИНЖЕНЕРНЫЕ ПРИНЦИПЫ (неизменны):','1. Автономность: один HTML, 0 внешних запросов, офлайн.',
    '2. Честность: черновики помечены как черновики.','3. Двойные часы: audio.currentTime — единственный источник истины.',
    '4. Доступность: a11y, клавиши, reduce-motion.','5. Память: организм помнит душу (localStorage).');
  return L.join('\n');
}

/* ── порядок языков: русский оригинал, избранное, далее по алфавиту ── */
const FEATURED=['ru-orig','en','es','fr','de','pt','zh-Hans','ja','ar','hi','sw','uk','it','ko','tr'];
const ORDER=Object.keys(LANGS).sort((a,b)=>{
  const ia=FEATURED.indexOf(a), ib=FEATURED.indexOf(b);
  if(ia>=0&&ib>=0)return ia-ib; if(ia>=0)return -1; if(ib>=0)return 1;
  if(a==='ru-orig')return -1; if(b==='ru-orig')return 1; return a<b?-1:1;
});
let cur=localStorage.getItem('s01.lang')||'ru-orig';
if(!LANGS[cur])cur='ru-orig';
const store={get:(k,d)=>{try{return JSON.parse(localStorage.getItem('s01.'+k))??d}catch(e){return d}},
             set:(k,v)=>{try{localStorage.setItem('s01.'+k,JSON.stringify(v))}catch(e){}}};
const HEARD=new Set(store.get('heard',[]));
if(cur)HEARD.add(cur);

function toast(msg,ms){const t=document.createElement('div');t.className='toast';t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>t.style.opacity='0',ms||2200);setTimeout(()=>t.remove(),(ms||2200)+500)}

/* ═══ АУДИО: base64 → Blob → <audio>; WebAudio-анализатор для пульса ═══ */
const audio=new Audio(); audio.preload='auto'; audio.crossOrigin='anonymous';
let actx=null,analyser=null,freq=null,pulse=0,pulseT=0;
function initAudio(){
  const bin=atob(AUDIO_B64), u8=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
  audio.src=URL.createObjectURL(new Blob([u8],{type:'audio/mp4'}));
  audio.style.display='none'; document.body.appendChild(audio);
}
initAudio();
function ensureCtx(){
  if(actx)return;
  try{
    actx=new (window.AudioContext||window.webkitAudioContext)();
    const src=actx.createMediaElementSource(audio);
    analyser=actx.createAnalyser(); analyser.fftSize=256; analyser.smoothingTimeConstant=.78;
    freq=new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser); analyser.connect(actx.destination);
  }catch(e){analyser=null}
}
function beat(dt){
  pulseT=Math.max(0,pulseT-dt*2.4);
  if(analyser){
    analyser.getByteFrequencyData(freq);
    let s=0; for(let i=1;i<9;i++)s+=freq[i];
    const v=(s/8/255);
    if(v>.42&&v>pulseT+ .12){pulseT=v;pulse=1}
  }
  pulse=Math.max(pulse*Math.pow(.5,dt*3.2),pulseT*.9);
}

/* ═══ LRC-парсер + раскладка строк ═══ */
const TAG=/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
function parseLRC(text){
  const lines=[];
  for(const raw of text.split('\n')){
    TAG.lastIndex=0; const tm=TAG.exec(raw); if(!tm)continue;
    const t=(+tm[1])*60+(+tm[2])+(tm[3]?parseInt(tm[3].padEnd(2,'0').slice(0,2),10)/100:0);
    const txt=raw.replace(TAG,'').trim(); if(!txt)continue;
    lines.push({t,txt,idle:txt==='♪'});
  }
  lines.sort((a,b)=>a.t-b.t);
  /* конец строки = старт следующей; длинные паузы → виртуальная интерлюдия */
  const out=[];
  for(let i=0;i<lines.length;i++){
    const l=lines[i], nxt=lines[i+1];
    l.end=nxt?nxt.t:l.t+8;
    if(l.end-l.t>12)l.end=l.t+9;
    out.push(l);
    if(nxt&&nxt.t-l.t>10&&!l.idle)out.push({t:l.end,end:nxt.t,txt:'♪',idle:true,virt:true});
  }
  return out;
}
function layoutLines(lines){
  for(const l of lines){
    if(l.idle){l.words=null;continue}
    const ws=l.txt.split(/\s+/).filter(Boolean);
    let tot=0; const w=ws.map((s,i)=>{let v=s.length+1.5; if(i===0)v*=.62; tot+=v; return v});
    let acc=0; l.words=ws.map((s,i)=>{const a=acc/tot; acc+=w[i]; return {s,a0:a,a1:acc/tot}});
  }
}
/* кэш распарсенных языков (РЕЗОНАНС читает 6 языков за кадр) */
const PARSED=new Map();
function parsed(code){
  if(!PARSED.has(code)){
    const ls=parseLRC(LANGS[code].lrc);
    layoutLines(ls);
    PARSED.set(code,ls);
  }
  return PARSED.get(code);
}
function findLine(lines,t){
  let lo=0,hi=lines.length-1,r=-1;
  while(lo<=hi){const m=(lo+hi)>>1; if(lines[m].t<=t){r=m;lo=m+1}else hi=m-1}
  return r;
}

/* ═══ ПАНЕЛЬ КАРАОКЕ ═══ */
const panel=$('#panel'),stack=$('#kstack'),kstage=$('#kstage');
const L={lines:[],idx:-1,off:store.get('off.'+cur,0),full:false};
let spring={y:0,v:0,tgt:0};

function renderLang(){
  const d=LANGS[cur];
  $('#lc').textContent=cur==='ru-orig'?'RU·ORIG':cur.toUpperCase();
  $('#ln').textContent=d.n+' · '+d.lines+' строк';
  document.title='СИНГУЛЯР·02 — Когда теряем · '+d.n;
  L.off=(store.get('off.'+cur,0))/1000; $('#shift').value=L.off*1000; $('#shiftV').textContent=(L.off>0?'+':'')+Math.round(L.off*1000);
  const dir=RTL.has(cur)?'rtl':'ltr';
  kstage.setAttribute('dir',dir);
  L.lines=parsed(cur).map(l=>({...l,el:null})); layoutLines(L.lines);
  buildStack(); L.idx=-1; spring.y=0; spring.v=0;
  $$('.gi').forEach(g=>g.classList.toggle('cur',g.dataset.c===cur));
  $$('.wn').forEach(n=>n.classList.toggle('cur',n.dataset.c===cur));
  drawWeb(); buildRes();
  history.replaceState(null,'','#lang='+encodeURIComponent(cur));
  localStorage.setItem('s01.lang',cur);
}
function buildStack(){
  stack.innerHTML='';
  const frag=document.createDocumentFragment();
  L.lines.forEach((l,i)=>{
    const el=document.createElement('div');
    el.className='kl '+(l.idle?'idle':'song');
    if(l.idle){el.textContent='♪'}
    else{
      l.words.forEach(w=>{const s=document.createElement('span');s.className='w';s.textContent=w.s;
        s.style.setProperty('--wp','0%');w.el=s;el.appendChild(s);el.appendChild(document.createTextNode(' '))});
    }
    el.addEventListener('click',()=>{audio.currentTime=Math.max(0,l.t-L.off);kick()});
    l.el=el; frag.appendChild(el);
  });
  stack.appendChild(frag);
}
function setWord(el,p){
  el.style.setProperty('--wp',(p*100).toFixed(1)+'%');
  el.classList.toggle('lit',p>0.001);
}

/* ═══ РЕЗОНАНС: одна строка — шесть голосов ═══ */
const RES_POOL=['ru-orig','en','es','fr','de','ja'];
let resOn=false, resRows=[];
function resLangs(){
  const rows=[...RES_POOL];
  if(rows[0]!=='ru-orig')rows.unshift('ru-orig');
  if(!rows.includes(cur))rows.splice(1,0,cur);
  return rows.filter(c=>LANGS[c]).slice(0,6);
}
function buildRes(){
  const wrap=$('#resRows'); wrap.innerHTML=''; resRows=[];
  const dir=RTL.has(cur)?'rtl':'ltr';
  for(const code of resLangs()){
    const row=document.createElement('div');
    row.className='rrow'+(code==='ru-orig'?' ru':'');
    row.setAttribute('dir',dir);
    const chip=document.createElement('span');chip.className='rchip';
    chip.textContent=code==='ru-orig'?'RU·ОР':code.toUpperCase();
    const txt=document.createElement('span');txt.className='rtxt';txt.textContent='…';
    row.appendChild(chip);row.appendChild(txt);
    row.addEventListener('click',()=>{const i=findLine(parsed(code),audio.currentTime-L.off);
      if(i>=0){audio.currentTime=Math.max(0,parsed(code)[i].t+L.off);kick()}});
    wrap.appendChild(row);
    resRows.push({code,el:row,txt,idx:-99});
  }
}
function resUpdate(){
  if(!resOn)return;
  const t=audio.currentTime-L.off;
  for(const r of resRows){
    const lines=parsed(r.code), i=findLine(lines,t);
    if(i===r.idx)continue;
    r.idx=i;
    const l=i>=0?lines[i]:null;
    r.txt.textContent=l?l.txt:'…';
    r.el.classList.toggle('idle',!l||!!l.idle);
    r.el.classList.toggle('on',!!l&&!l.idle&&t<l.end);
  }
}
function toggleRes(force){
  resOn=force!==undefined?force:!resOn;
  $('#res').classList.toggle('open',resOn);
  $('#btnRes').setAttribute('aria-pressed',String(resOn));
  if(resOn){buildRes();resUpdate();toast('резонанс · одна строка — шесть голосов · одна правда')}
}

function karaokeFrame(){
  const t=audio.currentTime-L.off;
  const i=findLine(L.lines,t);
  if(i!==L.idx){
    L.idx=i;
    L.lines.forEach((l,j)=>{
      if(!l.el)return;
      l.el.classList.toggle('act',j===i);
      l.el.classList.toggle('past',j<i);
      if(j!==i)l.words&&l.words.forEach(w=>setWord(w.el,0));
    });
  }
  const curL=L.lines[i];
  if(curL&&curL.words){
    curL.words.forEach(w=>{
      if(!w.el)return;
      const p=clamp((t-curL.t)/((curL.end||curL.t+6)-curL.t +1e-6),0,1);
      const wp=w.a1<=0?1:clamp((p-w.a0)/(w.a1-w.a0),0,1);
      setWord(w.el, wp<=0?0:Math.pow(wp,.85));
    });
  }
  /* spring-скролл с предвосхищением */
  const h=kstage.clientHeight;
  const tgt=i>=0&&L.lines[i].el ? clamp(L.lines[i].el.offsetTop - h*.40,0,1e9) : 0;
  spring.tgt=L.full?spring.tgt:tgt;
  if(!L.full){
    const dt=1/60, k=.0058, c=.16;
    spring.v+=(-k*(spring.y-spring.tgt)-c*spring.v);
    spring.y+=spring.v*16.7;
    if(Math.abs(spring.y-spring.tgt)>.5||Math.abs(spring.v)>.05)
      stack.style.transform='translateY('+(-spring.y).toFixed(1)+'px)';
  }
  /* транспорт */
  const d=audio.duration||META.song.duration;
  $('#tc').textContent=fmtT(audio.currentTime)+' / '+fmtT(d);
  const fr=d?audio.currentTime/d:0;
  $('#fill').style.width=(fr*100).toFixed(2)+'%';
  $('#head').style.left=(fr*100).toFixed(2)+'%';
  $('#btnPlay').setAttribute('aria-pressed',String(!audio.paused));
  $('#icoplay').textContent=audio.paused?'▶':'⏸';
  resUpdate();
}
let lastT=0;
function frame(ts){
  const dt=Math.min(.05,(ts-lastT)/1000||.016); lastT=ts;
  beat(dt);
  if(panel.classList.contains('open'))karaokeFrame();
  glFrame(ts,dt);
  requestAnimationFrame(frame);
}
