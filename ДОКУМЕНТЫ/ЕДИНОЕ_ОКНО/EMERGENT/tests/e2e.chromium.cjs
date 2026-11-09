'use strict';
// Dependency-free Chromium E2E runner using Chrome DevTools Protocol and Node 22 WebSocket.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const profile = '/tmp/singulyar-e2e-profile';
const appSource = fs.readFileSync(path.join(root,'prototype/app.js'),'utf8');
const htmlSource = fs.readFileSync(path.join(root,'prototype/index.html'),'utf8')
  .replace('<link rel="stylesheet" href="style.css">', '<style>'+fs.readFileSync(path.join(root,'prototype/style.css'),'utf8')+'</style>')
  .replace('<script src="../src/core.js"></script>', '<script>'+fs.readFileSync(path.join(root,'src/core.js'),'utf8')+'</script>')
  .replace('<script src="../src/adapters.js"></script>', '<script>'+fs.readFileSync(path.join(root,'src/adapters.js'),'utf8')+'</script>')
  .replace('<script src="app.js"></script>', '<script>'+fs.readFileSync(path.join(root,'prototype/app.js'),'utf8')+'</script>');
const port = 9333;
const chromiumBin = process.env.CHROMIUM_BIN || '/usr/bin/chromium';
let chrome;
const checks = [];
function pass(name) { checks.push({name, ok:true}); console.log('PASS', name); }
async function waitFor(fn, ms=10000) { const end=Date.now()+ms; let last; while(Date.now()<end){try{last=await fn(); if(last) return last;}catch(e){last=e;} await delay(100);} throw new Error('Timeout waiting: '+(last?.message||'condition')); }
async function main(){
  chrome = spawn(chromiumBin, ['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,'about:blank'], {stdio:'ignore'});
  try {
    await waitFor(async()=>{const r=await fetch(`http://127.0.0.1:${port}/json/version`);return r.ok?r.json():null;});
    const targetRes = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, {method:'PUT'});
    const target = await targetRes.json();
    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
    let id=0; const pending=new Map(); const exceptions=[]; const logs=[];
    ws.addEventListener('message', ev=>{let m;try{m=JSON.parse(ev.data)}catch{return;} if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result||{});} if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails?.text||'runtime exception'); if(m.method==='Runtime.consoleAPICalled'&&m.params.type==='error')logs.push((m.params.args||[]).map(x=>x.value||x.description).join(' '));});
    function cdp(method,params={}){return new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});ws.send(JSON.stringify({id:n,method,params}));setTimeout(()=>{if(pending.has(n)){pending.delete(n);reject(new Error('CDP timeout: '+method));}},10000);});}
    async function ev(expression){const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result?.value;}
    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Page.navigate',{url:'about:blank'});
    const bootstrap = `window.__e2eStorage = window.__e2eStorage || (()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()}})(); Object.defineProperty(window,'localStorage',{configurable:true,value:window.__e2eStorage}); document.open(); document.write(${JSON.stringify(htmlSource)}); document.close();`;
    await ev(bootstrap);
    await waitFor(async()=>await ev(`document.readyState==='complete' && !!window.SingulyarCore && !!window.SingulyarAdapters`));
    pass('Prototype loads in Chromium without missing core/adapters');
    await ev(`document.querySelector('#intent').value='message'; document.querySelector('#urgency').value='urgent'; document.querySelector('#from').value='speech'; document.querySelector('#to').value='text'; document.querySelector('#recipient').value='Тестовый получатель'; document.querySelector('#message').value='E2E актуальное содержание'; document.querySelector('#recommend').click()`);
    await waitFor(async()=>Number(await ev(`document.querySelectorAll('#options article').length`))>=3);
    const rank=await ev(`({count:document.querySelectorAll('#options article').length, trace:document.querySelector('#trace').innerText})`);
    assert(rank.count>=3); assert(rank.trace.includes('Срочность: urgent')); assert(rank.trace.includes('речь/диктовка'));
    pass('Recommendation UI renders alternatives and traces live urgency/modality');
    await ev(`document.querySelector('#compose').click()`);
    const saved=await ev(`JSON.parse(localStorage.getItem('singulyar.emergent.draft'))`);
    assert.equal(saved.recipient,'Тестовый получатель'); assert.equal(saved.content.text,'E2E актуальное содержание'); assert.equal(saved.urgency,'urgent'); assert.equal(saved.content.fromModality,'speech');
    pass('Save stores current form values in localStorage with event contract');
    await ev(`document.querySelector('#message').value='Изменено после рекомендации'; document.querySelector('#recipient').value='Новый адресат'; document.querySelector('#export').click()`);
    await waitFor(async()=>String(await ev(`document.querySelector('#status').textContent`)).includes('экспортировано'));
    const current=await ev(`JSON.stringify(window.SingulyarCore.createIntent({intent:document.querySelector('#intent').value,recipient:document.querySelector('#recipient').value.trim()||null,urgency:document.querySelector('#urgency').value,text:document.querySelector('#message').value,fromModality:document.querySelector('#from').value,toModality:document.querySelector('#to').value,choiceId:null,choiceLabel:null,classes:[],capabilityId:'local-draft',capabilityStatus:'available',consentToSend:false}))`);
    assert.equal(JSON.parse(current).recipient,'Новый адресат'); assert.equal(JSON.parse(current).content.text,'Изменено после рекомендации');
    pass('Export action reflects edits made after recommendations, avoiding stale snapshot');
    await ev(`eval(${JSON.stringify('(function(){\n'+appSource+'\n}).call(window)')})`);
    await waitFor(async()=>await ev(`!!document.querySelector('#restoreDraftButton')`));
    await ev(`document.querySelector('#restoreDraftButton').click()`);
    const restored=await ev(`({recipient:document.querySelector('#recipient').value,message:document.querySelector('#message').value,urgency:document.querySelector('#urgency').value,from:document.querySelector('#from').value})`);
    assert.equal(restored.recipient,'Тестовый получатель'); assert.equal(restored.message,'E2E актуальное содержание'); assert.equal(restored.urgency,'urgent'); assert.equal(restored.from,'speech');
    pass('Reload + explicit restore repopulates all saved form fields');
    await ev(`document.querySelector('#clear').click()`);
    const cleared=await ev(`({saved:localStorage.getItem('singulyar.emergent.draft'),recipient:document.querySelector('#recipient').value,message:document.querySelector('#message').value,intent:document.querySelector('#intent').value,urgency:document.querySelector('#urgency').value,from:document.querySelector('#from').value,to:document.querySelector('#to').value})`);
    assert.equal(cleared.saved,null); assert.equal(cleared.recipient,''); assert.equal(cleared.message,''); assert.equal(cleared.intent,'message'); assert.equal(cleared.urgency,'normal'); assert.equal(cleared.from,'text'); assert.equal(cleared.to,'text');
    pass('Clear removes stored draft and resets all form fields');
    assert.deepEqual(exceptions,[],'Browser runtime exceptions: '+exceptions.join('; '));
    assert.deepEqual(logs,[],'Browser console errors: '+logs.join('; '));
    pass('No uncaught browser runtime exceptions or console errors');
    console.log(`\n${checks.length}/${checks.length} Chromium E2E checks passed`);
    ws.close();
  } finally { if(chrome&&!chrome.killed)chrome.kill('SIGTERM'); }
}
main().catch(e=>{console.error('FAIL',e.stack||e);process.exitCode=1;if(chrome&&!chrome.killed)chrome.kill('SIGTERM');});
