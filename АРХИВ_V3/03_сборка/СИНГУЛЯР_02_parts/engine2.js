/* ═══ WEBGL2: куб → колесо (ДНК КУБ-2026, наследие v1.1) ═══ */
let gl=null,prog=null,bufs={},N=2744,u={};
function glInit(){
  const cv=$('#gl');
  gl=cv.getContext('webgl2',{antialias:false,alpha:true});
  if(!gl){document.body.classList.add('no-webgl');glFrame=(a,b)=>{};return}
  const VS=`#version 300 es
  in vec3 aCube; in vec3 aWheel;
  uniform float uMorph,uT,uPulse,uDpr,uAsp;
  out float vA;
  void main(){
    float m=smoothstep(0.,1.,uMorph);
    vec3 p=mix(aCube,aWheel,m);
    float w=sin(uT*1.4+p.x*2.1+p.y*1.7+p.z*1.9)*.04*(1.+uPulse*2.2);
    p+=normalize(p+vec3(.0001))*w;
    float a=uT*.05;
    p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;
    gl_Position=vec4(p.xy/2.6/vec2(uAsp,1.),0.,1.);
    float sz=(1.6+uPulse*2.4+(1.-m)*1.1)*(1.+.35*sin(uT*2.+p.y*9.));
    gl_PointSize=max(1.,sz*uDpr);
    vA=(.5+.5*sin(uT*2.+length(p.xz)*5.))*(.55+.45*uPulse);
  }`;
  const FS=`#version 300 es
  precision mediump float; in float vA; out vec4 o;
  void main(){
    vec2 c=gl_PointCoord-.5; float d=length(c);
    float a=smoothstep(.5,.06,d)*(.32+.5*vA);
    o=vec4(mix(vec3(1.,.66,.25),vec3(.77,.36,.15),vA*.5),a);
  }`;
  function sh(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);
    if(!gl.getShaderParameter(o,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(o))}return o}
  prog=gl.createProgram();gl.attachShader(prog,sh(gl.VERTEX_SHADER,VS));gl.attachShader(prog,sh(gl.FRAGMENT_SHADER,FS));
  gl.linkProgram(prog);gl.useProgram(prog);
  const cube=[],wheel=[];
  const R=[.26,.315,.37,.425,.48];
  for(let x=0;x<14;x++)for(let y=0;y<14;y++)for(let z=0;z<14;z++){
    const cx=(x/13-.5)*1.3, cy=(y/13-.5)*1.3, cz=(z/13-.5)*1.3;
    cube.push(cx,cy,cz);
    const i=cube.length/3-1, ring=i%5, n=34;
    const th=(i*.61803)*Math.PI*2 + ring*.35;
    const r=R[ring]*2.6*(1+(i%7)*.013);
    const wx=Math.cos(th)*r, wy=cy*.18+(ring-2)*.09, wz=Math.sin(th)*r;
    const T=1.08; /* наклон колеса к камере, чтобы диск был виден, а не с ребра */
    const ty=wy*Math.cos(T)-wz*Math.sin(T), tz=wy*Math.sin(T)+wz*Math.cos(T);
    wheel.push(wx,ty,tz);
  }
  N=cube.length/3;
  function attr(name,arr){const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(arr),gl.STATIC_DRAW);
    const loc=gl.getAttribLocation(prog,name);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0)}
  attr('aCube',cube);attr('aWheel',wheel);
  ['uMorph','uT','uPulse','uDpr','uAsp'].forEach(n=>u[n]=gl.getUniformLocation(prog,n));
  gl.uniform1f(u.uDpr,Math.min(2,window.devicePixelRatio||1));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);
  resize();window.addEventListener('resize',resize);
}
function resize(){if(!gl)return;const cv=gl.canvas;const d=Math.min(2,window.devicePixelRatio||1);
  cv.width=innerWidth*d;cv.height=innerHeight*d;gl.viewport(0,0,cv.width,cv.height);
  gl.uniform1f(u.uAsp,Math.max(.4,innerWidth/Math.max(1,innerHeight)))}
let morph=0,morphT=0;
function glFrame(ts,dt){
  if(!gl)return;
  morphT+=((wheelOn?1:0)-morphT)*dt*1.6;
  morph=morphT;
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(u.uMorph,morph);gl.uniform1f(u.uT,ts/1000);gl.uniform1f(u.uPulse,pulse);
  gl.drawArrays(gl.POINTS,0,N);
}

/* ═══ КОЛЕСО: 157 голосов, 5 кругов + СОЗВЕЗДИЕ спиц света ═══ */
let wheelOn=false;
const RINGS=[.26,.315,.37,.425,.48], RCOUNT=[31,32,32,31,31];
const NODE_POS={};
let RING_SVG='';
function buildWheel(){
  const rot=$('#rotator');let k=0;
  /* кольца созвездия */
  let s='';
  for(const r of RINGS)s+='<circle class="ring" cx="50" cy="50" r="'+(r*92).toFixed(2)+'"/>';
  RING_SVG=s;$('#web').innerHTML=s;
  RCOUNT.forEach((n,ri)=>{
    for(let i=0;i<n&&k<ORDER.length;i++,k++){
      const code=ORDER[k],ang=(i/n)*Math.PI*2-Math.PI/2;
      const px=50+Math.cos(ang)*RINGS[ri]*92, py=50+Math.sin(ang)*RINGS[ri]*92;
      NODE_POS[code]={x:px,y:py};
      const el=document.createElement('div');el.className='wn';el.tabIndex=0;el.dataset.c=code;
      el.style.left=px+'%';el.style.top=py+'%';
      el.style.setProperty('--unrot','0deg');
      el.innerHTML='<i></i><span class="nm">'+LANGS[code].n+'</span>';
      el.setAttribute('role','button');
      el.setAttribute('aria-label',LANGS[code].n);
      el.addEventListener('click',()=>openPanel(code));
      el.addEventListener('keydown',e=>{if(e.key==='Enter')openPanel(code)});
      if(HEARD.has(code))el.classList.add('heard');
      rot.appendChild(el);
    }
  });
}
/* СОЗВЕЗДИЕ: спица света от оси к каждому услышанному узлу (растёт вместе с памятью) */
function drawWeb(){
  const svg=$('#web'); if(!svg)return;
  let s=RING_SVG;
  for(const code of HEARD){
    if(!NODE_POS[code])continue;
    s+='<line class="spoke'+(code===cur?' cur':'')+'" x1="50" y1="50" x2="'+NODE_POS[code].x.toFixed(2)+'" y2="'+NODE_POS[code].y.toFixed(2)+'"/>';
  }
  svg.innerHTML=s;
}

/* ═══ ПУЛЬС: память организма ═══ */
function updatePulse(){
  const n=HEARD.size, pct=Math.round(n/ORDER.length*100);
  $('#counter').innerHTML=ORDER.length+' голосов · слышано <b>'+n+'</b> · сингулярность <b>'+pct+'%</b>';
}

/* ═══ ПАНЕЛЬ: открыть/закрыть ═══ */
function openPanel(code){
  cur=code;
  $('#songs').classList.add('gone');
  $('.cube-wrap').classList.add('gone'); $('.hint').classList.add('gone');
  $('#wheel').classList.add('on'); wheelOn=true;
  panel.classList.add('open'); panel.removeAttribute('inert');
  HEARD.add(code); store.set('heard',[...HEARD]);
  $$('.wn').forEach(n=>n.classList.toggle('heard',HEARD.has(n.dataset.c)));
  renderLang(); updatePulse();
}
function closePanel(){
  panel.classList.remove('open'); panel.setAttribute('inert','');
  $('#songs').classList.remove('gone');
}
function kick(){ensureCtx();actx&&actx.resume&&actx.resume();audio.play().catch(()=>{})}

/* ═══ ПАНЕЛЬ TASK FILES: все файлы задачи + менеджер загрузки ═══ */
function b64u8(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function dlBlob(blob,name){
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);
  toast('⬇ скачивается: '+name);
}
function dlTask(it){
  const d=TASKDATA[it.d];if(!d)return;
  if(d.g==='audio')return dlBlob(new Blob([b64u8(AUDIO_B64)],{type:'audio/mp4'}),d.f);
  if(d.g==='cover')return dlBlob(new Blob([b64u8(COVER_B64)],{type:'image/jpeg'}),d.f);
  if(d.g==='lrc-all')return dlBlob(new Blob([JSON.stringify(LANGS,null,1)],{type:'application/json'}),d.f);
  if(d.t==='b64')return dlBlob(new Blob([b64u8(d.v)],{type:d.m}),d.f);
  dlBlob(new Blob([d.v],{type:d.m||'text/plain;charset=utf-8'}),d.f);
}
function buildTasks(){
  const wrap=$('#taskScroll');wrap.innerHTML='';
  const q=($('#taskSearch').value||'').toLowerCase();
  let items=0,groups=0,dl=0;
  TASKFILES.groups.forEach(g=>{
    const list=g.items.filter(it=>!q||(it.n+' '+it.r).toLowerCase().includes(q));
    if(!list.length)return;
    groups++;items+=list.length;
    const sec=document.createElement('section');sec.className='tgroup';
    const h=document.createElement('h3');
    h.innerHTML='<span>'+g.t+'</span><span class="gn">'+g.c+'</span>';
    sec.appendChild(h);
    list.forEach(it=>{
      const row=document.createElement('div');row.className='trow '+it.st;row.setAttribute('role','listitem');
      const r1=document.createElement('div');r1.className='r1';
      const dot=document.createElement('span');dot.className='dot';dot.setAttribute('aria-hidden','true');r1.appendChild(dot);
      const nm=document.createElement('span');nm.className='nm';nm.textContent=it.n;r1.appendChild(nm);
      const st=document.createElement('span');st.className='tstat';
      st.textContent=it.st==='live'?'вшито':it.st==='ok'?'готово':'ждёт';r1.appendChild(st);
      const sz=document.createElement('span');sz.className='sz';sz.textContent=it.s;r1.appendChild(sz);
      if(it.d){dl++;
        const b=document.createElement('button');b.className='dlb';b.textContent='⬇';
        b.title='скачать «'+it.n+'» из этого файла (офлайн)';
        b.setAttribute('aria-label','скачать '+it.n);
        b.addEventListener('click',()=>dlTask(it));r1.appendChild(b);}
      row.appendChild(r1);
      const rl=document.createElement('div');rl.className='rl';rl.textContent=it.r;row.appendChild(rl);
      sec.appendChild(row);
    });
    wrap.appendChild(sec);
  });
  $('#taskFound').textContent=groups+' рзд · '+items+' поз · ⬇'+dl;
  $('#taskLegend').textContent='● вшито в файл · ● готово на диске · ◌ ждёт конвейера · снято при сборке '+TASKFILES.built+' · ⬇ качается из этого HTML офлайн';
}

/* ═══ ПЛАН ВНУТРИ: рендер генплана + ДНК-отчёт ═══ */
let DNA_RESULTS=[];
function dnaRun(){
  const checks=[
    ['157 голосов в LANGS',()=>Object.keys(LANGS).length===157,Object.keys(LANGS).length],
    ['порядок ORDER собран',()=>ORDER.length===157,ORDER.length],
    ['аудио-ДНК (base64)',()=>/^[A-Za-z0-9+/=]+$/.test(AUDIO_B64.slice(0,4096))&&AUDIO_B64.length%4===0,Math.round(AUDIO_B64.length/131072)/8+' МБ'],
    ['обложка JPEG',()=>COVER_B64.startsWith('/9j/'),'ok'],
    ['LRC оригинала',()=>/^\[by:/.test(LANGS['ru-orig'].lrc)&&LANGS['ru-orig'].lrc.includes('[00:'),LANGS['ru-orig'].lines+' стр'],
    ['файлы задачи',()=>TASKFILES.groups.length>=5&&Object.keys(TASKDATA).length>=5,TASKFILES.groups.length+' рзд'],
    ['движок findLine',()=>{const ls=parsed('ru-orig');return findLine(ls,-1)===-1&&findLine(ls,1e9)===ls.length-1},'ok'],
    ['часы и длительность',()=>isFinite(META.song.duration)&&META.song.duration>200&&META.song.duration<300,fmtT(META.song.duration)],
    ['план вшит',()=>PLAN02.phases.length===8&&planMD().includes('ФАЗА 7'),PLAN02.phases.length+' фаз']];
  DNA_RESULTS=checks.map(([n,f,info])=>{
    let ok=false; try{ok=!!f()}catch(e){ok=false}
    return {n,ok,info:String(info)};
  });
  const bad=DNA_RESULTS.filter(r=>!r.ok).length;
  const btn=$('#btnDna');
  btn.classList.toggle('ok',bad===0);btn.classList.toggle('bad',bad>0);
  btn.innerHTML='<span class="led" aria-hidden="true"></span>ДНК '+(bad===0?'✓'+DNA_RESULTS.length:'⚠'+bad);
  return bad;
}
function buildPlan(){
  const w=$('#planScroll');w.innerHTML='';
  $('#planMeta').textContent='v2.0 · '+DNA_RESULTS.filter(r=>r.ok).length+'/'+DNA_RESULTS.length+' ДНК ✓';
  const creed=document.createElement('p');creed.className='p-creed';
  creed.innerHTML='<b>целое знает части</b> · <b>часть знает целое</b><br>от души к душе · от человека человеку';
  w.appendChild(creed);
  const how=document.createElement('p');how.className='p-creed';
  how.innerHTML='как было: SRT-черновики · как есть: организм в одном файле · как будет: <b>созвездие песен × 157 голосов</b>';
  w.appendChild(how);
  for(const p of PLAN02.phases){
    const sec=document.createElement('section');sec.className='ph '+(p.st==='done'?'done':p.st==='next'?'next':'far');
    sec.setAttribute('role','listitem');
    sec.innerHTML='<span class="pdot" aria-hidden="true"></span>'+
      '<div class="ph-head"><span class="pn">'+p.n+'</span><span class="pt1">'+p.t+'</span>'+
      '<span class="pst">'+(p.st==='done'?'сделано':p.st==='next'?'сейчас':'горизонт')+'</span></div>'+
      '<ul>'+p.items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
    w.appendChild(sec);
  }
  const dna=document.createElement('section');dna.className='ph done';
  const bad=DNA_RESULTS.filter(r=>!r.ok).length;
  dna.innerHTML='<span class="pdot" aria-hidden="true"></span>'+
    '<div class="ph-head"><span class="pn">ДНК</span><span class="pt1">Самотест ядра · файл знает сам себя</span>'+
    '<span class="pst">'+(bad===0?'цел':bad+' тревог')+'</span></div>'+
    '<ul class="dna-list">'+DNA_RESULTS.map(r=>
      '<li><span class="st '+(r.ok?'ok':'bad')+'">'+(r.ok?'✓':'✗')+'</span><span class="nm2">'+r.n+
      (r.info&&r.info!=='ok'?' <span style="color:var(--coal2)">· '+r.info+'</span>':'')+'</span></li>').join('')+'</ul>';
  w.appendChild(dna);
  const foot=document.createElement('p');foot.className='p-foot';
  foot.textContent='принципы: автономность · честность черновиков · двойные часы · a11y · память души';
  w.appendChild(foot);
}

/* ═══ UI-СБОРКА ═══ */
function buildSongs(){
  const c=$('#songs');
  const live=document.createElement('button');live.className='sc live';
  live.innerHTML='<img alt="" src="data:image/jpeg;base64,'+COVER_B64+'"/><span><span class="t">Когда теряем</span><br><span class="m">OutShadow feat RUVSON · 157/157 голосов</span></span>';
  live.addEventListener('click',()=>openPanel(cur));
  c.appendChild(live);
  PLACEHOLDERS.forEach(p=>{
    const b=document.createElement('button');b.className='sc soon';
    b.innerHTML='<span class="ph-ic">♪</span><span><span class="t">'+p.t+'</span><br><span class="m">'+p.m+'</span></span>';
    b.addEventListener('click',()=>toast('заглушка · конвейер придёт за этой песней'));
    c.appendChild(b);
  });
}
function buildGrid(){
  const g=$('#grid');g.innerHTML='';
  const q=($('#search').value||'').toLowerCase();
  let n=0;
  ORDER.forEach(code=>{
    const d=LANGS[code];
    if(q&&!(d.n.toLowerCase().includes(q)||code.toLowerCase().includes(q)))return;
    n++;
    const el=document.createElement('button');el.className='gi'+(code===cur?' cur':'')+(HEARD.has(code)?' heard':'');el.dataset.c=code;
    el.innerHTML='<b>'+d.n+'</b><span>'+code+' · '+d.lines+' строк</span>';
    el.addEventListener('click',()=>{openPanel(code);$('#gridView').classList.remove('open');$('#gridView').setAttribute('aria-hidden','true')});
    g.appendChild(el);
  });
  $('#found').textContent=n+' / '+ORDER.length;
}
function wire(){
  $('#cubeWrap').addEventListener('click',()=>{
    $('.cube-wrap').classList.add('gone');$('.hint').classList.add('gone');
    $('#wheel').classList.add('on');wheelOn=true;toast('целое знает части · часть знает целое');
  });
  $('#cubeWrap').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('#cubeWrap').click()}});
  $('#btnPlay').addEventListener('click',()=>{audio.paused?kick():audio.pause()});
  $('#prev').addEventListener('click',()=>openPanel(ORDER[(ORDER.indexOf(cur)-1+ORDER.length)%ORDER.length]));
  $('#next').addEventListener('click',()=>openPanel(ORDER[(ORDER.indexOf(cur)+1)%ORDER.length]));
  $('#btnClose').addEventListener('click',closePanel);
  $('#btnRes').addEventListener('click',()=>toggleRes());
  $('#btnLangs').addEventListener('click',()=>{buildGrid();$('#gridView').classList.add('open');$('#gridView').setAttribute('aria-hidden','false');$('#search').focus()});
  $('#gridClose').addEventListener('click',()=>{$('#gridView').classList.remove('open');$('#gridView').setAttribute('aria-hidden','true')});
  $('#search').addEventListener('input',buildGrid);
  $('#btnPlan').addEventListener('click',()=>{buildPlan();$('#planView').classList.add('open');$('#planView').setAttribute('aria-hidden','false')});
  $('#planClose').addEventListener('click',()=>{$('#planView').classList.remove('open');$('#planView').setAttribute('aria-hidden','true')});
  $('#planDl').addEventListener('click',()=>dlBlob(new Blob([planMD()],{type:'text/markdown;charset=utf-8'}),'ПЛАН_СИНГУЛЯР_02.md'));
  $('#btnDna').addEventListener('click',()=>{
    const bad=DNA_RESULTS.filter(r=>!r.ok).length;
    toast(bad===0?'ДНК цело: '+DNA_RESULTS.length+'/'+DNA_RESULTS.length+' проверок ядра ✓':'ДНК: '+bad+' тревог — смотри ПЛАН (P)');
    if(bad>0){buildPlan();$('#planView').classList.add('open');$('#planView').setAttribute('aria-hidden','false')}
  });
  $('#btnFull').addEventListener('click',e=>{
    L.full=!L.full;e.currentTarget.setAttribute('aria-pressed',String(L.full));
    kstage.classList.toggle('scroll',L.full);
    if(!L.full)kstage.scrollTop=0;
    if(L.full){stack.style.transform='none'}
  });
  const rail=$('#rail');
  function seek(e){const r=rail.getBoundingClientRect();
    const f=clamp(((e.clientX??(e.touches&&e.touches[0].clientX))-r.left)/r.width,0,1);
    audio.currentTime=f*(audio.duration||META.song.duration);kick()}
  rail.addEventListener('pointerdown',e=>{rail.setPointerCapture(e.pointerId);seek(e);
    const mv=e2=>seek(e2),up=()=>{rail.removeEventListener('pointermove',mv);rail.removeEventListener('pointerup',up)};
    rail.addEventListener('pointermove',mv);rail.addEventListener('pointerup',up)});
  $('#shift').addEventListener('input',e=>{L.off=(+e.target.value)/1000;store.set('off.'+cur,Math.round(L.off*1000));
    $('#shiftV').textContent=(L.off>0?'+':'')+e.target.value;L.idx=-99});
  $('#btnMotion').addEventListener('click',e=>{
    const off=document.documentElement.dataset.motion==='off';
    document.documentElement.dataset.motion=off?'on':'off';
    e.currentTarget.setAttribute('aria-pressed',String(off));store.set('motion',off?'on':'off')});
  $('#btnHelp').addEventListener('click',()=>$('#help').showModal());
  $('#helpClose').addEventListener('click',()=>$('#help').close());
  $('#btnTasks').addEventListener('click',()=>{buildTasks();$('#tasksView').classList.add('open');
    $('#tasksView').setAttribute('aria-hidden','false');$('#taskSearch').focus()});
  $('#taskClose').addEventListener('click',()=>{$('#tasksView').classList.remove('open');
    $('#tasksView').setAttribute('aria-hidden','true')});
  $('#taskSearch').addEventListener('input',buildTasks);
  $('#btnLrc').addEventListener('click',()=>{
    const name='Когда_теряем_'+cur+'.lrc';
    dlBlob(new Blob([LANGS[cur].lrc],{type:'text/plain;charset=utf-8'}),name);
  });
  $('#axis').addEventListener('click',()=>{audio.paused?kick():audio.pause()});
  audio.addEventListener('ended',()=>{HEARD.add(cur);store.set('heard',[...HEARD]);drawWeb();updatePulse()});
  document.addEventListener('keydown',e=>{
    if(e.target.matches('input'))return;
    if(e.code==='Space'){e.preventDefault();audio.paused?kick():audio.pause()}
    else if(e.key==='ArrowRight')$('#next').click();
    else if(e.key==='ArrowLeft')$('#prev').click();
    else if(e.key==='ArrowUp'){e.preventDefault();L.off=clamp(Math.round(L.off*1000)+50,-600,600)/1000;$('#shift').value=Math.round(L.off*1000);$('#shiftV').textContent=(L.off>0?'+':'')+Math.round(L.off*1000);L.idx=-99}
    else if(e.key==='ArrowDown'){e.preventDefault();L.off=clamp(Math.round(L.off*1000)-50,-600,600)/1000;$('#shift').value=Math.round(L.off*1000);$('#shiftV').textContent=(L.off>0?'+':'')+Math.round(L.off*1000);L.idx=-99}
    else if(e.key.toLowerCase()==='g'||e.key.toLowerCase()==='п')$('#btnLangs').click();
    else if(e.key.toLowerCase()==='t'||e.key.toLowerCase()==='е')$('#btnTasks').click();
    else if(e.key.toLowerCase()==='r'||e.key.toLowerCase()==='р'){if(panel.classList.contains('open'))toggleRes()}
    else if(e.key.toLowerCase()==='p'||e.key.toLowerCase()==='з')$('#btnPlan').click();
    else if(e.key==='Escape'){
      if($('#tasksView').classList.contains('open'))$('#taskClose').click();
      else if($('#planView').classList.contains('open'))$('#planClose').click();
      else if($('#gridView').classList.contains('open'))$('#gridClose').click();
      else if(panel.classList.contains('open'))closePanel()}
  });
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||store.get('motion','on')==='off'){
    document.documentElement.dataset.motion='off';$('#btnMotion').setAttribute('aria-pressed','false')}
}
/* boot */
(function(){
  /* план подключается к менеджеру загрузки (Task Files) — единственный источник истины */
  TASKDATA.plan02={t:'txt',m:'text/markdown;charset=utf-8',f:'ПЛАН_СИНГУЛЯР_02.md',v:''};
  TASKDATA.plan02.v=planMD();
  document.documentElement.dataset.motion=store.get('motion','on');
  buildSongs();buildWheel();wire();glInit();
  dnaRun();updatePulse();
  const hash=new URLSearchParams(location.hash.slice(1));
  const hl=hash.get('lang');
  if(hl&&LANGS[hl]){openPanel(hl)}
  requestAnimationFrame(frame);
})();
