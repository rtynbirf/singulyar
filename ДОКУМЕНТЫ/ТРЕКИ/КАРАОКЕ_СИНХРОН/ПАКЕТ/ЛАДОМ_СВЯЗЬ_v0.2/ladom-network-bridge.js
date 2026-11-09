/* SINGULYAR ·31 ЛАДОМ — additive network bridge v0.2.0
 * Loaded after the existing page. Does not replace the karaoke engine.
 * Translation of live singing is NOT implemented by this module.
 */
(() => {
  'use strict';
  if (window.__LADOM_NETWORK_BRIDGE__) return;
  window.__LADOM_NETWORK_BRIDGE__ = true;
  const STYLE = `
  #ladom-net-launch{position:fixed;z-index:9997;right:14px;bottom:14px;border:2px solid currentColor;border-radius:999px;padding:13px 18px;background:#111;color:#fff;font:600 15px/1.2 system-ui;box-shadow:0 3px 18px #0005;cursor:pointer}
  #ladom-net-launch:focus-visible,#ladom-net button:focus-visible,#ladom-net input:focus-visible,#ladom-net select:focus-visible,#ladom-net textarea:focus-visible{outline:3px solid #ffbf47;outline-offset:3px}
  #ladom-net[hidden]{display:none} #ladom-net{position:fixed;inset:0;z-index:9998;background:#101318ee;display:flex;align-items:center;justify-content:center;padding:14px;color:#f8fafc;font:16px/1.45 system-ui}
  #ladom-net .ln-card{width:min(760px,100%);max-height:92dvh;overflow:auto;background:#202630;border:1px solid #687386;border-radius:18px;padding:18px;box-shadow:0 12px 50px #0009}
  #ladom-net h2{font-size:1.35rem;margin:0 0 8px} #ladom-net p{margin:8px 0} #ladom-net .ln-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}
  #ladom-net label{display:block;font-weight:600;margin:7px 0} #ladom-net input,#ladom-net select,#ladom-net textarea{box-sizing:border-box;width:100%;padding:10px;border-radius:9px;border:1px solid #9aa5b5;background:#fff;color:#151922;font:inherit}
  #ladom-net button{padding:10px 13px;border:1px solid #aeb8c8;border-radius:9px;background:#f3f5f8;color:#151922;font:600 14px system-ui;cursor:pointer;margin:4px 4px 4px 0}
  #ladom-net button[disabled]{opacity:.5;cursor:not-allowed} #ladom-net .ln-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  #ladom-net .ln-status{padding:9px 11px;border-radius:8px;background:#121820;min-height:1.4em} #ladom-net .ln-log{height:150px;overflow:auto;background:#121820;border-radius:8px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere}
  #ladom-net .ln-note{font-size:.9rem;color:#d9e1ed} #ladom-net .ln-warn{border-left:4px solid #ffbf47;padding:8px 10px;background:#302b20}
  `;
  const style = document.createElement('style'); style.textContent = STYLE; document.head.append(style);
  const launch = document.createElement('button'); launch.id = 'ladom-net-launch'; launch.type='button'; launch.textContent='СВЯЗЬ · спеть вместе'; launch.setAttribute('aria-haspopup','dialog'); launch.setAttribute('aria-controls','ladom-net');
  const panel = document.createElement('section'); panel.id='ladom-net'; panel.hidden=true; panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-labelledby','ln-title');
  panel.innerHTML = `
  <div class="ln-card"><div class="ln-row" style="justify-content:space-between"><h2 id="ln-title">ЛАДОМ · связь между людьми</h2><button type="button" data-act="close" aria-label="Закрыть окно связи">Закрыть ✕</button></div>
  <p>Исходный голос передаётся партнёру. Языковые настройки нужны для следующего этапа перевода.</p>
  <div class="ln-warn"><strong>Честный статус:</strong> живой перевод певческого голоса с сохранением мелодии, ритма и тембра ещё не подключён. Не выдаём обычную передачу звука или озвучивание текста за такой перевод.</div>
  <div class="ln-grid"><div><label for="ln-name">Как к вам обращаться</label><input id="ln-name" maxlength="40" autocomplete="nickname" value="Участник"></div>
  <div><label for="ln-source">Язык, на котором поёте</label><select id="ln-source"><option value="pt-BR">Португальский (Бразилия)</option><option value="ja-JP">Японский</option><option value="ru-RU" selected>Русский</option><option value="en-US">Английский</option><option value="es-ES">Испанский</option></select></div>
  <div><label for="ln-target">Язык, на котором хотите читать/слышать перевод</label><select id="ln-target"><option value="ja-JP">Японский</option><option value="pt-BR">Португальский (Бразилия)</option><option value="ru-RU" selected>Русский</option><option value="en-US">Английский</option><option value="es-ES">Испанский</option></select></div>
  <div><label for="ln-server">Адрес сервера связи (WSS)</label><input id="ln-server" placeholder="wss://ваш-сервер.example/signal" inputmode="url" autocomplete="url"></div></div>
  <div class="ln-row"><button type="button" data-act="create">Создать комнату</button><label for="ln-room" style="flex:1;min-width:170px">Код комнаты<input id="ln-room" maxlength="12" autocapitalize="characters" placeholder="КОД"></label><button type="button" data-act="join">Присоединиться</button></div>
  <div class="ln-row"><button type="button" data-act="mic" disabled>Включить микрофон</button><button type="button" data-act="mute" disabled>Выключить микрофон</button><button type="button" data-act="leave" disabled>Выйти из комнаты</button></div>
  <div id="ln-status" class="ln-status" role="status" aria-live="polite">Не подключено. Для связи нужен развёрнутый сервер WebSocket.</div>
  <h3>Текст партнёру</h3><div class="ln-grid"><label for="ln-message">Сообщение<textarea id="ln-message" rows="2" maxlength="2000" placeholder="Введите текст или текст песни"></textarea></label><div><label for="ln-voice">Голос озвучивания текста</label><select id="ln-voice"><option value="">Системный голос по языку</option></select><button type="button" data-act="speak">Озвучить локально</button><p class="ln-note">Озвучивание — это речь, не пение. Голос зависит от браузера и устройства.</p></div></div>
  <div class="ln-row"><button type="button" data-act="send" disabled>Отправить текст</button><button type="button" data-act="stop-speech">Остановить озвучивание</button></div>
  <h3>Журнал комнаты</h3><div id="ln-log" class="ln-log" role="log" aria-live="polite"></div>
  <p class="ln-note">Приватность: при подключении аудио передаётся через WebRTC. Текст идёт через сервер сигналинга. Не используйте локальный прототип для секретных разговоров. На публичном сервере обязательны HTTPS/WSS, защита от перебора комнат, лимиты и TURN.</p>
  </div>`;
  document.body.append(launch, panel);
  const $ = id => panel.querySelector('#'+id);
  const status = text => { $('ln-status').textContent = text; };
  const log = text => { const el=$('ln-log'); el.textContent += (el.textContent?'\n':'') + text; el.scrollTop=el.scrollHeight; };
  let ws=null, pc=null, localStream=null, room='', peerId='', makingOffer=false, ignoreOffer=false, polite=false, micEnabled=false;
  const config={iceServers:[{urls:'stun:stun.l.google.com:19302'}]};
  const send = obj => { if(ws && ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify(obj)); };
  const setConnected = yes => { panel.querySelector('[data-act="mic"]').disabled=!yes; panel.querySelector('[data-act="mute"]').disabled=!yes; panel.querySelector('[data-act="leave"]').disabled=!yes; panel.querySelector('[data-act="send"]').disabled=!yes; };
  const newPeer = () => {
    if(pc) pc.close(); pc=new RTCPeerConnection(config);
    pc.onicecandidate=e=>{if(e.candidate)send({type:'signal',to:peerId,room,candidate:e.candidate});};
    pc.ontrack=e=>{let audio=document.getElementById('ln-remote-audio'); if(!audio){audio=document.createElement('audio');audio.id='ln-remote-audio';audio.autoplay=true;audio.controls=true;audio.setAttribute('aria-label','Голос другого участника');panel.querySelector('.ln-card').prepend(audio);} audio.srcObject=e.streams[0]; audio.play().catch(()=>status('Поток получен. Нажмите Play у аудиоплеера, если браузер заблокировал автовоспроизведение.'));};
    pc.onconnectionstatechange=()=>status('WebRTC: '+pc.connectionState);
    pc.onnegotiationneeded=async()=>{try{makingOffer=true;await pc.setLocalDescription();send({type:'signal',to:peerId,room,description:pc.localDescription});}catch(e){log('Согласование: '+e.message);}finally{makingOffer=false;}};
    pc.oniceconnectionstatechange=()=>{if(pc)status('Соединение: '+pc.iceConnectionState);};
    if(localStream) localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));
  };
  async function connect(action){
    const url=$('ln-server').value.trim(); room=$('ln-room').value.trim().toUpperCase();
    if(!url || !/^wss:\/\//i.test(url)){status('Укажите адрес защищённого сервера wss://. Публичный GitHub Pages не принимает WebSocket-соединения.');return;}
    if(action==='create'&&!room) { room=Array.from(crypto.getRandomValues(new Uint8Array(5)),b=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b%32]).join(''); $('ln-room').value=room; }
    if(!room){status('Введите код комнаты.');return;}
    try { ws=new WebSocket(url); status('Подключаемся к серверу…');
      ws.onopen=()=>send({type:action==='create'?'create-room':'join-room',room,name:$('ln-name').value.trim().slice(0,40)||'Участник',sourceLanguage:$('ln-source').value,targetLanguage:$('ln-target').value});
      ws.onmessage=async ev=>{let m;try{m=JSON.parse(ev.data)}catch{return;} if(m.type==='room-created'){room=m.room||room;$('ln-room').value=room;status('Комната создана: '+room+'. Передайте код партнёру.');log('Комната '+room+' создана.');}
        else if(m.type==='peer-joined'){peerId=m.peerId||m.from||'';polite=Boolean(m.polite);newPeer();status('Партнёр вошёл. Включите микрофон для передачи звука.');log('Партнёр подключён.');}
        else if(m.type==='joined'){peerId=m.peerId||m.from||'';newPeer();status('Вы вошли в комнату '+room+'. Ожидаем партнёра.');}
        else if(m.type==='signal'){if(!pc)newPeer();if(m.description){const desc=m.description;const collision=desc.type==='offer'&&(makingOffer||pc.signalingState!=='stable');ignoreOffer=!polite&&collision;if(ignoreOffer)return;await pc.setRemoteDescription(desc);if(desc.type==='offer'){await pc.setLocalDescription();send({type:'signal',to:peerId,room,description:pc.localDescription});}} else if(m.candidate){try{await pc.addIceCandidate(m.candidate)}catch(e){if(!ignoreOffer)log('ICE: '+e.message)}}}
        else if(m.type==='text'){log((m.name||'Партнёр')+': '+String(m.text||''));}
        else if(m.type==='peer-left'){status('Партнёр вышел из комнаты.');log('Партнёр отключился.');if(pc){pc.close();pc=null;}}
        else if(m.type==='error'){status('Ошибка сервера: '+(m.message||'неизвестная ошибка'));}
        else if(m.type==='room-full'){status('Комната заполнена. Эта версия рассчитана на двух участников.');}
      };
      ws.onerror=()=>status('Ошибка WebSocket. Проверьте адрес сервера и TLS.'); ws.onclose=()=>{if(panel.hidden===false)status('Соединение с сервером закрыто.');};
    } catch(e){status('Не удалось подключиться: '+e.message);}
  }
  async function enableMic(){try{localStream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});micEnabled=true;if(pc)localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));status('Микрофон включён.');}catch(e){status('Микрофон недоступен: '+e.message+'. Разрешите доступ и используйте HTTPS или localhost.');}}
  function muteMic(){if(localStream)localStream.getAudioTracks().forEach(t=>t.enabled=false);micEnabled=false;status('Микрофон выключен.');}
  function leave(){if(localStream){localStream.getTracks().forEach(t=>t.stop());localStream=null;}if(pc){pc.close();pc=null;}if(ws){send({type:'leave-room',room});ws.close();ws=null;}peerId='';setConnected(false);status('Вы вышли из комнаты.');}
  launch.addEventListener('click',()=>{panel.hidden=false;launch.hidden=true;panel.querySelector('[data-act="close"]').focus();});
  panel.addEventListener('click',async e=>{const b=e.target.closest('button[data-act]');if(!b)return;const a=b.dataset.act;
    if(a==='close'){panel.hidden=true;launch.hidden=false;launch.focus();return;}
    if(a==='create'||a==='join'){await connect(a);setConnected(true);return;}
    if(a==='mic'){if(!localStream)await enableMic();else{localStream.getAudioTracks().forEach(t=>t.enabled=true);micEnabled=true;status('Микрофон включён.');}if(pc&&localStream&&!pc.getSenders().some(s=>s.track&&s.track.kind==='audio'))localStream.getTracks().forEach(t=>pc.addTrack(t,localStream));return;}
    if(a==='mute'){muteMic();return;} if(a==='leave'){leave();return;}
    if(a==='send'){const text=$('ln-message').value.trim();if(!text)return;send({type:'text',room,text,name:$('ln-name').value.trim().slice(0,40)||'Участник',sourceLanguage:$('ln-source').value,targetLanguage:$('ln-target').value});log('Вы: '+text);$('ln-message').value='';return;}
    if(a==='speak'){const text=$('ln-message').value.trim();if(!text){status('Сначала введите текст для озвучивания.');return;}if(!('speechSynthesis'in window)){status('Этот браузер не поддерживает синтез речи.');return;}speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=$('ln-target').value;const v=speechSynthesis.getVoices().find(x=>x.lang.toLowerCase().startsWith(u.lang.toLowerCase()));if(v)u.voice=v;u.onend=()=>status('Озвучивание завершено.');u.onerror=()=>status('Синтез речи не удался.');speechSynthesis.speak(u);return;}
    if(a==='stop-speech'&&'speechSynthesis'in window){speechSynthesis.cancel();status('Озвучивание остановлено.');}
  });
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){panel.hidden=true;launch.hidden=false;launch.focus();}});
  const voiceSelect=$('ln-voice');
  function populateVoices(){if(!('speechSynthesis'in window))return;const voices=speechSynthesis.getVoices();voiceSelect.replaceChildren(new Option('Системный голос по языку',''));voices.forEach(v=>voiceSelect.add(new Option(v.name+' ('+v.lang+')',v.voiceURI)));voiceSelect.addEventListener('change',()=>{});}
  if('speechSynthesis'in window){populateVoices();speechSynthesis.onvoiceschanged=populateVoices;}
  window.addEventListener('pagehide',leave,{once:true});
})();
