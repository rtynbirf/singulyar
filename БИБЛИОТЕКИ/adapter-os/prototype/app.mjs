import { CapabilityModel, AdapterRegistry, MeaningRouter } from '../src/core.mjs';
import { browserAdapters } from '../adapters/basic.mjs';
import { allOptionalContracts } from '../adapters/contracts.mjs';
import { put, exportRecord } from '../src/store.mjs';

const $ = id => document.getElementById(id);
const capabilities = new CapabilityModel({ preferences: { output: { preferred: ['output.text'] }, speech: { lang: 'ru-RU', rate: .9, pitch: 1, volume: 1 } } });
capabilities.setCapability('display', true); capabilities.setCapability('speechSynthesis', 'speechSynthesis' in globalThis); capabilities.setCapability('vibration', 'vibrate' in navigator); capabilities.setCapability('speechRecognition', !!(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition)); capabilities.setCapability('camera', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)); capabilities.setCapability('microphone', !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));
const registry = new AdapterRegistry(); [...browserAdapters, ...allOptionalContracts].forEach(a => registry.register(a));
const router = new MeaningRouter({ capabilities, registry });

function log(s) { $('log').textContent = `[${new Date().toLocaleTimeString()}] ${s}\n` + $('log').textContent; }
function render() {
 $('capabilities').textContent = JSON.stringify(capabilities.snapshot().capabilities, null, 2);
 $('adapters').textContent = JSON.stringify(registry.statuses(), null, 2);
 const route = router.route({ type:'text', text:$('meaning').value }, { direction:'output', preferred: ['output.text'] });
 $('route').textContent = JSON.stringify(route, null, 2);
}

$('renderText').onclick = () => { const m = $('meaning').value.trim(); $('rendered').textContent = m; log('Смысл отрендерен текстовым адаптером.'); };
$('speak').onclick = () => { const a = registry.get('output.tts'); const prefs = { lang:$('lang').value, rate:+$('rate').value, pitch:+$('pitch').value, volume:+$('volume').value, voiceName:$('voice').value }; try { a.speak($('meaning').value, prefs); log(`TTS: ${a.status().state}`); } catch(e) { log(`TTS unavailable: ${e.message}`); } };
$('pulse').onclick = () => { try { registry.get('output.vibration').pulse([80,60,80]); log('Вибрация отправлена.'); } catch(e) { log(`Вибрация: ${e.message}`); } };
$('save').onclick = async () => { const value = { text:$('meaning').value, createdAt:new Date().toISOString(), preferences:{lang:$('lang').value,rate:+$('rate').value,pitch:+$('pitch').value,volume:+$('volume').value,voiceName:$('voice').value} }; await put('last-message', value); log('Сообщение сохранено в IndexedDB.'); };
$('export').onclick = async () => { try { const blob = await exportRecord('last-message'); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='singulyar-message.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000); log('Экспорт создан.'); } catch(e) { log(`Экспорт: ${e.message}`); } };
$('reloadVoices').onclick = loadVoices;
function loadVoices(){ const voices=(speechSynthesis && speechSynthesis.getVoices ? speechSynthesis.getVoices() : []); $('voice').replaceChildren(...voices.map(v=>new Option(`${v.name} — ${v.lang}`,v.name))); }
$('listen').onclick = () => { const a=registry.get('input.browser-speech'); try { const r=a.create($('lang').value); $('speechStatus').textContent='Слушаю…'; r.onresult=e=>{const text=e.results[0][0].transcript; $('speechText').value=text; $('meaning').value=text; render();}; r.onerror=e=>$('speechStatus').textContent=`Ошибка: ${e.error}`; r.onend=()=>{$('speechStatus').textContent='Готово';}; r.start(); } catch(e) { $('speechStatus').textContent=`Недоступно: ${e.message}`; } };
$('meaning').addEventListener('input', render);
if ('speechSynthesis' in globalThis) speechSynthesis.onvoiceschanged=loadVoices; loadVoices(); render(); log('Прототип инициализирован.');
