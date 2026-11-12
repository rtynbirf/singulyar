// СИНГУЛЯР · ЕДИНОЕ ОКНО — клиент.
// Идея: отправитель выражает смысл один раз, а канал сам подстраивается под каждого получателя
// (текст / озвучка / субтитры / вибро-сигнал / брайль / морзе). Вход — одна ссылка из любого мессенджера.
// 0.5.4 «АЗБУКИ ВСЕХ»: всё из 0.5.3 (RTT-набор, морзе-ключ, пиктограммы не-читающим,
// письмо на бумагу, прямая связь — public/duet.js) + ЕСТЬ ЧЕЛОВЕК — НЕТ НАЦИЙ:
// морзе — 8 писем мира на выбор, брайль — одна клетка, письмо по языку сообщения.
// Таблицы: public/azbuki.js; тесты: tests/azbuki.test.mjs.
const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem("sg:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("sg:" + k, JSON.stringify(v)); } catch {} }
};

const S = {
  ws: null, id: null, room: null, title: "", name: "",
  needs: { captions: false, speak: false, large: false },
  haptic: true,
  peers: new Map(), pcs: new Map(),
  local: new MediaStream(), mic: null, cam: null,
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  seen: new Set(), live: new Map(), calls: new Map(), mix: null,
  rec: null, recOn: false, leaving: false, retry: 0, audioCtx: null,
  morse: false, braille: false, rttT: 0,
  morseAlphabet: store.get("morseAlphabet", "*")
};

/* ---------- утилиты ---------- */
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newRoom = () => [...crypto.getRandomValues(new Uint8Array(10))].map(x => ROOM_ALPHABET[x % 32]).join("");
const joinUrl = () => `${location.origin}/?r=${S.room}${S.title ? "&t=" + encodeURIComponent(S.title) : ""}`;
const wsSend = o => { if (S.ws?.readyState === 1) S.ws.send(JSON.stringify(o)); };
let toastT;
function toast(t) { const el = $("toast"); el.textContent = t; el.classList.remove("hidden"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.add("hidden"), 3500); }
function show(view) { for (const v of ["start", "join", "room"]) $("view-" + v).classList.toggle("hidden", v !== view); }
function setStatus(t, on = false) { $("status").textContent = t; $("dot").classList.toggle("on", on); }

/* ---------- запуск: какой экран показать ---------- */
const q = new URLSearchParams(location.search);
S.title = (q.get("t") || "").slice(0, 40);
const urlRoom = (q.get("r") || "").toUpperCase();
$("name").value = store.get("name", "");
for (const [id, k] of [["nSpeak", "speak"], ["nCaps", "captions"], ["nLarge", "large"]]) $(id).checked = store.get("needs", {})[k] || false;
$("nHaptic").checked = store.get("haptic", true);
$("nMorse").checked = store.get("morse", false);
$("nBraille").checked = store.get("braille", false);
applyLarge($("nLarge").checked);

fetch("/config").then(r => r.json()).then(c => { S.iceServers = c.iceServers; S.bridges = c.bridges; }).catch(() => {});

if (urlRoom && /^[A-Z0-9_-]{6,32}$/.test(urlRoom)) {
  S.room = urlRoom;
  $("joinTitle").textContent = S.title ? `Пространство «${S.title}»` : "Тебя позвали в разговор";
  show("join");
} else show("start");

$("btnCreate").onclick = () => {
  S.title = $("title").value.trim().slice(0, 40) || "Семья";
  S.room = newRoom();
  history.replaceState(null, "", joinUrl().replace(location.origin, ""));
  $("joinTitle").textContent = `Пространство «${S.title}»`;
  show("join");
};

$("btnJoin").onclick = () => {
  S.name = $("name").value.trim().slice(0, 48);
  if (!S.name) { $("name").focus(); return toast("Напиши, как тебя называть"); }
  S.needs = { speak: $("nSpeak").checked, captions: $("nCaps").checked, large: $("nLarge").checked };
  S.haptic = $("nHaptic").checked;
  S.morse = $("nMorse").checked; S.braille = $("nBraille").checked;
  store.set("name", S.name); store.set("needs", S.needs); store.set("haptic", S.haptic);
  store.set("morse", S.morse); store.set("braille", S.braille);
  S.leaving = false;
  S.audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); // жест пользователя: звук разрешён
  S.audioCtx.resume?.();
  syncSettings();
  show("room");
  $("roomTitle").textContent = S.title || "Пространство";
  connect();
};

/* 0.5.1: любой жест будит звук — труба микса не должна висеть suspended у тех,
   кто вошёл по ссылке без клика (смена ведущего не должна рвать звук мосту). */
for (const ev of ["pointerdown", "keydown"]) document.addEventListener(ev, () => S.audioCtx?.resume?.(), { capture: true, passive: true });
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") S.audioCtx?.resume?.(); }); // 0.5.1: вернулся в приложение — труба тёплая

/* ---------- настройки «под человека» ---------- */
function applyLarge(on) { document.documentElement.classList.toggle("large", !!on); }
function syncSettings() {
  $("sSpeak").checked = S.needs.speak; $("sCaps").checked = S.needs.captions;
  $("sLarge").checked = S.needs.large; $("sHaptic").checked = S.haptic;
  $("sMorse").checked = S.morse; $("sBraille").checked = S.braille;
  applyLarge(S.needs.large);
}
function pushProfile() {
  store.set("needs", S.needs); store.set("haptic", S.haptic);
  wsSend({ type: "profile", needs: S.needs });
  applyLarge(S.needs.large);
}
$("sSpeak").onchange = e => { S.needs.speak = e.target.checked; pushProfile(); };
$("sCaps").onchange = e => { S.needs.captions = e.target.checked; pushProfile(); };
$("sLarge").onchange = e => { S.needs.large = e.target.checked; pushProfile(); };
$("sHaptic").onchange = e => { S.haptic = e.target.checked; pushProfile(); };
$("sMorse").onchange = e => { S.morse = e.target.checked; store.set("morse", S.morse); };
$("sBraille").onchange = e => { S.braille = e.target.checked; store.set("braille", S.braille); renderBraille(); };

function speak(text) {
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = navigator.language || "ru-RU";
  speechSynthesis.speak(u);
}
const PATTERNS = { wait: [80, 60, 80], ok: [60], love: [60, 40, 60, 40, 200], call: [250, 120, 250, 120, 250], urgent: [500, 150, 500, 150, 500], water: [60, 60, 60], hurt: [400], here: [60, 40, 60], danger: [500, 120, 500, 120, 500, 120, 500] };
const LABELS = { wait: "✋ просит подождать", ok: "👍 понял(а)", love: "❤️ шлёт любовь", call: "🔔 просит позвонить", urgent: "🆘 СРОЧНО, нужен ответ", water: "💧 нужна ВОДА", hurt: "🤕 БОЛИТ, нужна помощь", here: "📍 Я ЗДЕСЬ, всё в порядке", danger: "⚠️ ОПАСНО, уходи/иди сюда" };
function beep(freq = 880, ms = 160) {
  try {
    const c = S.audioCtx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = freq; g.gain.value = 0.06; o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + ms / 1000);
  } catch {}
}
function onNudge(m) {
  addSys(`${m.name} ${LABELS[m.kind] || ""}`);
  toast(`${m.name} ${LABELS[m.kind] || ""}`);
  if (S.haptic) { navigator.vibrate?.(PATTERNS[m.kind] || [100]); beep(m.kind === "urgent" ? 1200 : 880, m.kind === "urgent" ? 500 : 160); }
  if (S.needs.speak) speak(`${m.name} ${LABELS[m.kind]?.replace(/^\S+\s/, "") || ""}`);
}
document.querySelectorAll("[data-nudge]").forEach(b => b.onclick = () => { wsSend({ type: "nudge", kind: b.dataset.nudge }); addSys(`Ты ${LABELS[b.dataset.nudge]}`); });

/* ---------- сообщения ---------- */
function addSys(text) {
  const el = document.createElement("div"); el.className = "msg sys"; el.textContent = text;
  $("messages").append(el); $("messages").scrollTop = 1e9;
}
function addMsg(m, { fresh = true } = {}) {
  if (S.seen.has(m.id)) return;
  S.seen.add(m.id);
  const mine = m.from && m.from === S.id;
  const el = document.createElement("div"); el.className = "msg" + (mine ? " mine" : "");
  const who = document.createElement("div"); who.className = "who";
  who.textContent = `${mine ? "Ты" : m.name} · ${new Date(m.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (m.via) { const t = document.createElement("span"); t.className = "tag"; t.textContent = "из " + m.via; who.append(t); }
  if (m.kind === "speech") { const t = document.createElement("span"); t.className = "tag"; t.textContent = "🎙 речь"; who.append(t); }
  const body = document.createElement("div"); body.textContent = m.text;
  el.append(who, body);
  if (S.braille) { const b = document.createElement("div"); b.className = "braille"; b.textContent = textToBraille(m.text); el.append(b); }
  $("messages").append(el); $("messages").scrollTop = 1e9;
  if (fresh && !mine) {
    if (S.needs.speak) speak(`${m.name}. ${m.text}`);
    if (S.haptic && !S.morse) navigator.vibrate?.([60]);            // тактильный тик: сообщение пришло
    if (S.morse) vibrateMorse(m.text);                              // тактиль-морзе: слепоглухому под палец
  }
}
$("chatForm").onsubmit = e => {
  e.preventDefault();
  const t = $("msg").value.trim(); if (!t) return;
  wsSend({ type: "chat", text: t }); $("msg").value = "";
  wsSend({ type: "caption", text: "", final: true });   // RTT: строка набора гаснет — мысль ушла сообщением
};

/* RTT (Real-Time Text, практика RFC 4103 / EAA для глухих): текст едет по буквам,
   пока пишешь — без кнопки «отправить». Удачно вписано в канал субтитров. */
$("msg").addEventListener("input", () => {
  const v = $("msg").value;
  if (!v) return wsSend({ type: "caption", text: "", final: true });
  const now = Date.now();
  if (now - S.rttT < 250) return;
  S.rttT = now;
  wsSend({ type: "caption", text: "✍ " + v.slice(0, 120), final: false });
});

function renderLive() {
  $("live").textContent = [...S.live.values()].map(x => `${x.name}: ${x.text}`).join("  ·  ");
}

/* ---------- участники ---------- */
function renderPeers() {
  const box = $("peers"); box.replaceChildren();
  const all = [{ id: S.id, name: S.name + " (ты)", needs: S.needs }, ...S.peers.values()];
  for (const p of all) {
    const d = document.createElement("div"); d.className = "peer";
    const n = document.createElement("div"); n.textContent = p.name; d.append(n);
    const chips = document.createElement("div"); chips.className = "chips";
    for (const [on, t] of [[p.needs?.captions, "📝 субтитры"], [p.needs?.speak, "🔊 озвучка"], [p.needs?.large, "🔎 крупно"]]) {
      if (on) { const c = document.createElement("span"); c.className = "chip"; c.textContent = t; chips.append(c); }
    }
    if (chips.children.length) d.append(chips);
    box.append(d);
  }
  if (S.bridgesActive?.length) { $("bridgeNote").textContent = "Мосты: " + S.bridgesActive.join(", "); $("bridgeNote").classList.remove("hidden"); }
  maybeAutoCaptions();
}

/* ---------- сигналинг ---------- */
function connect() {
  const ws = new WebSocket(`${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`);
  S.ws = ws;
  setStatus("соединяюсь…");
  ws.onopen = () => ws.send(JSON.stringify({ type: "join", room: S.room, name: S.name, needs: S.needs }));
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    switch (m.type) {
      case "welcome": S.id = m.id; break;
      case "joined":
        S.id = m.id; S.retry = 0; S.bridgesActive = m.bridges;
        setStatus(`в пространстве · ${m.peers.length + 1} чел.`, true);
        S.peers.clear();
        for (const h of m.history) addMsg(h, { fresh: false });
        for (const p of m.peers) { S.peers.set(p.id, p); createPeer(p.id); }
        for (const c of m.calls || []) joinBridge(c);
        renderPeers();
        break;
      case "peer-joined": S.peers.set(m.peer.id, m.peer); createPeer(m.peer.id); addSys(`${m.peer.name} в пространстве`); renderPeers(); updateCount(); break;
      case "peer-updated": S.peers.set(m.peer.id, m.peer); renderPeers(); break;
      case "peer-left": addSys(`${m.name} вышел(а)`); S.peers.delete(m.id); S.live.delete(m.id); renderLive(); closePeer(m.id); renderPeers(); updateCount(); break;
      case "signal":
        (m.from.startsWith("bridge:") ? bridgeSignal(m.from, m.payload || {}) : handleSignal(m.from, m.payload || {})).catch(e => console.warn("signal", e)); break;
      case "call-bridge": joinBridge(m); break;
      case "call-bridge-mixer": { const c = S.calls.get(m.id); if (c) { c.mixer = m.mixer; applyMixerRole(c); } break; }
      case "call-bridge-end": leaveBridge(m.id); break;
      case "chat": addMsg(m.msg); break;
      case "caption":
        if (m.final || !m.text) S.live.delete(m.from); else S.live.set(m.from, { name: m.name, text: m.text });
        renderLive(); break;
      case "nudge": onNudge(m); break;
      case "error": toast(m.message); break;
    }
  };
  ws.onclose = () => {
    for (const id of [...S.calls.keys()]) leaveBridge(id);
    for (const id of [...S.pcs.keys()]) closePeer(id);
    S.peers.clear(); renderPeers();
    if (S.leaving) return setStatus("не в комнате");
    setStatus("связь потеряна, переподключаюсь…");
    setTimeout(() => { if (!S.leaving) connect(); }, Math.min(1000 * 2 ** S.retry++, 15000));
  };
}
const updateCount = () => setStatus(`в пространстве · ${S.peers.size + 1} чел.`, true);

/* ---------- WebRTC (Perfect Negotiation, mesh) ---------- */
/* Firefox бросает NS_ERROR_UNEXPECTED (пустое сообщение) на iceServers, которые ему не нравятся
   (например, stun:127.0.0.1:1), Chromium молча терпит. Рана: чужая конфигурация убивала всю комнату.
   Фикс: если с серверами не вышло — живём без них, но не падаем. */
function newPC() {
  try { return new RTCPeerConnection({ iceServers: S.iceServers }); }
  catch { return new RTCPeerConnection(); }
}
function createPeer(id) {
  if (S.pcs.has(id)) return S.pcs.get(id);
  const pc = newPC();
  const peer = { pc, polite: S.id > id, making: false, ignore: false, settingAnswer: false, senders: {} };
  S.pcs.set(id, peer);
  for (const t of S.local.getTracks()) peer.senders[t.kind] = pc.addTrack(t, S.local);

  pc.ontrack = e => {
    const stream = e.streams[0] || new MediaStream([e.track]);
    let tile = document.querySelector(`[data-peer="${id}"]`);
    if (!tile) {
      tile = document.createElement("div"); tile.className = "tile"; tile.dataset.peer = id;
      const v = document.createElement("video"); v.autoplay = true; v.playsInline = true;
      const l = document.createElement("span"); l.textContent = S.peers.get(id)?.name || "";
      tile.append(v, l); $("tiles").append(tile);
    }
    const v = tile.querySelector("video"); v.srcObject = stream; v.play().catch(() => {});
    peer.stream = stream; refreshMix();
  };
  pc.onnegotiationneeded = async () => {
    try { peer.making = true; await pc.setLocalDescription(); wsSend({ type: "signal", to: id, payload: { description: pc.localDescription } }); }
    catch (e) { console.warn("negotiation", e); } finally { peer.making = false; }
  };
  pc.onicecandidate = e => { if (e.candidate) wsSend({ type: "signal", to: id, payload: { candidate: e.candidate } }); };
  pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === "failed") pc.restartIce(); };
  return peer;
}
async function handleSignal(from, payload) {
  const peer = createPeer(from), pc = peer.pc;
  if (payload.description) {
    const d = payload.description;
    const ready = !peer.making && (pc.signalingState === "stable" || peer.settingAnswer);
    const collision = d.type === "offer" && !ready;
    peer.ignore = !peer.polite && collision;
    if (peer.ignore) return;
    peer.settingAnswer = d.type === "answer";
    await pc.setRemoteDescription(d);
    peer.settingAnswer = false;
    if (d.type === "offer") { await pc.setLocalDescription(); wsSend({ type: "signal", to: from, payload: { description: pc.localDescription } }); }
  } else if (payload.candidate) {
    try { await pc.addIceCandidate(payload.candidate); } catch (e) { if (!peer.ignore) console.warn("ice", e); }
  }
}
function closePeer(id) {
  const p = S.pcs.get(id); if (p) { try { p.pc.close(); } catch {} S.pcs.delete(id); }
  document.querySelector(`[data-peer="${id}"]`)?.remove();
  refreshMix();
}

/* ---------- звонки из других миров (мост) ----------
   Мост — особый «участник» (bridge:…): его звук приходит всем. Звук комнаты мосту отдаёт
   смешанный поток; 0.5.1: свой микс-трек держит КАЖДЫЙ браузер всегда (труба не рвётся
   при смене ведущего), а кого слушать — решает сервер (выбор ведущего на его стороне). */
function joinBridge(c) {
  const ex = S.calls.get(c.id);
  if (ex) { ex.mixer = c.mixer; return applyMixerRole(ex); }
  const pc = newPC();
  const call = { id: c.id, name: c.name, pc, mixer: c.mixer, pending: [], remoteSet: false };
  call.tr = pc.addTransceiver("audio", { direction: "sendrecv" });
  ensureMix();                                                  // 0.5.1: микс есть у каждого
  call.tr.sender.replaceTrack(S.mix.dest.stream.getAudioTracks()[0]).catch(() => {});
  S.calls.set(c.id, call);
  pc.ontrack = e => {
    if (document.querySelector(`[data-peer="${CSS.escape(c.id)}"]`)) return;
    const tile = document.createElement("div"); tile.className = "tile"; tile.dataset.peer = c.id;
    const a = document.createElement("audio"); a.autoplay = true; a.srcObject = e.streams[0] || new MediaStream([e.track]); a.play().catch(() => {});
    const big = document.createElement("div"); big.textContent = "📞"; big.style.fontSize = "2rem";
    const l = document.createElement("span"); l.textContent = c.name;
    tile.append(a, big, l); $("tiles").append(tile);
  };
  pc.onicecandidate = e => { if (e.candidate) wsSend({ type: "signal", to: c.id, payload: { candidate: e.candidate } }); };
  pc.onnegotiationneeded = async () => {
    try { await pc.setLocalDescription(); wsSend({ type: "signal", to: c.id, payload: { description: pc.localDescription } }); } catch (e) { console.warn("bridge offer", e); }
  };
  pc.oniceconnectionstatechange = () => { if (pc.iceConnectionState === "failed") pc.restartIce(); };
  addSys(`📞 ${c.name} в разговоре`);
  applyMixerRole(call);
}
async function bridgeSignal(id, payload) {
  const call = S.calls.get(id); if (!call) return;
  if (payload.description) {
    await call.pc.setRemoteDescription(payload.description); call.remoteSet = true;
    for (const c of call.pending.splice(0)) await call.pc.addIceCandidate(c).catch(() => {});
  } else if (payload.candidate) {
    if (call.remoteSet) await call.pc.addIceCandidate(payload.candidate).catch(() => {}); else call.pending.push(payload.candidate);
  }
}
function leaveBridge(id) {
  const call = S.calls.get(id); if (!call) return;
  try { call.pc.close(); } catch {}
  S.calls.delete(id);
  document.querySelector(`[data-peer="${CSS.escape(id)}"]`)?.remove();
  addSys(`📞 ${call.name} — звонок завершён`);
  refreshMix();
}
function ensureMix() {
  if (!S.mix) {
    S.mix = { dest: S.audioCtx.createMediaStreamDestination(), nodes: new Map() };
    S.audioCtx.resume?.();
  }
  return S.mix;
}
function applyMixerRole(call) {
  ensureMix();
  if (call.mixer === S.id) S.audioCtx.resume?.();               // 0.5.1: стал ведущим — труба должна течь
  refreshMix();
  const mixTrack = S.mix.dest.stream.getAudioTracks()[0];
  if (call.tr.sender.track !== mixTrack) call.tr.sender.replaceTrack(mixTrack).catch(() => {});
  if (call.mixer === S.id) toast("Ты ведущий звонка: сервер берёт твой смешанный звук для " + call.name);
}
function refreshMix() {
  if (!S.mix) return;
  const want = new Map();
  if (S.mic) want.set("mic", new MediaStream([S.mic]));
  for (const [id, p] of S.pcs) if (p.stream?.getAudioTracks().length) want.set(id, p.stream);
  for (const [k, n] of S.mix.nodes) if (!want.has(k) || n.stream !== want.get(k)) { try { n.node.disconnect(); } catch {} S.mix.nodes.delete(k); }
  for (const [k, st] of want) if (!S.mix.nodes.has(k)) {
    try { const node = S.audioCtx.createMediaStreamSource(st); node.connect(S.mix.dest); S.mix.nodes.set(k, { node, stream: st }); } catch {}
  }
}

/* ---------- микрофон / камера ---------- */
function selfTile() {
  let t = document.querySelector('[data-peer="self"]');
  if (!S.cam) { t?.remove(); return; }
  if (!t) {
    t = document.createElement("div"); t.className = "tile self"; t.dataset.peer = "self";
    const v = document.createElement("video"); v.autoplay = true; v.muted = true; v.playsInline = true;
    const l = document.createElement("span"); l.textContent = "Ты"; t.append(v, l); $("tiles").prepend(t);
  }
  t.querySelector("video").srcObject = new MediaStream([S.cam]);
}
async function toggleTrack(kind) {
  const key = kind === "audio" ? "mic" : "cam", btn = $(kind === "audio" ? "btnMic" : "btnCam");
  if (S[key]) {
    const t = S[key]; S[key] = null; t.stop(); S.local.removeTrack(t);
    for (const p of S.pcs.values()) { const s = p.senders[kind]; if (s) { try { p.pc.removeTrack(s); } catch {} delete p.senders[kind]; } }
    btn.setAttribute("aria-pressed", "false");
    if (kind === "audio") { refreshMix(); if (S.recOn) stopCaptions(); }
  } else {
    if (!navigator.mediaDevices?.getUserMedia) return toast("Для микрофона и камеры нужен HTTPS-адрес (см. start-public)");
    try {
      const st = await navigator.mediaDevices.getUserMedia(kind === "audio" ? { audio: { echoCancellation: true, noiseSuppression: true } } : { video: { facingMode: "user", width: { ideal: 640 } } });
      const t = st.getTracks()[0]; S[key] = t; S.local.addTrack(t);
      for (const p of S.pcs.values()) p.senders[kind] = p.pc.addTrack(t, S.local);
      btn.setAttribute("aria-pressed", "true");
      if (kind === "audio") { S.audioCtx?.resume?.(); maybeAutoCaptions(); refreshMix(); } // 0.5.1: жест есть — будим звук
    } catch (e) { return toast("Нет доступа: " + (e.name === "NotAllowedError" ? "разреши в браузере" : e.message)); }
  }
  selfTile();
}
$("btnMic").onclick = () => toggleTrack("audio");
$("btnCam").onclick = () => toggleTrack("video");

/* ---------- речь → текст (субтитры и мост в мессенджеры) ---------- */
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
function startCaptions() {
  if (!SR) return toast("Этот браузер не распознаёт речь (нужен Chrome, Edge или Safari)");
  if (S.recOn) return;
  const r = new SR(); r.lang = navigator.language || "ru-RU"; r.continuous = true; r.interimResults = true;
  let last = 0;
  r.onresult = e => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i], text = res[0].transcript.trim(); if (!text) continue;
      if (res.isFinal) { wsSend({ type: "chat", text, kind: "speech" }); wsSend({ type: "caption", text: "", final: true }); }
      else if (Date.now() - last > 500) { last = Date.now(); wsSend({ type: "caption", text, final: false }); }
    }
  };
  r.onend = () => { if (S.recOn) try { r.start(); } catch {} };
  r.onerror = e => { if (["not-allowed", "service-not-allowed"].includes(e.error)) { stopCaptions(); toast("Распознавание речи запрещено"); } };
  try { r.start(); S.rec = r; S.recOn = true; $("btnCaps").setAttribute("aria-pressed", "true"); } catch (e) { toast(e.message); }
}
function stopCaptions() {
  S.recOn = false; try { S.rec?.stop(); } catch {} S.rec = null;
  $("btnCaps").setAttribute("aria-pressed", "false"); wsSend({ type: "caption", text: "", final: true });
}
$("btnCaps").onclick = () => S.recOn ? stopCaptions() : startCaptions();
// Эмерджентность: если кому-то в комнате нужны субтитры — моя речь автоматически превращается в текст.
function maybeAutoCaptions() {
  if (S.mic && !S.recOn && SR && [...S.peers.values()].some(p => p.needs?.captions)) {
    startCaptions(); if (S.recOn) toast("Кому-то нужны субтитры — твоя речь пишется текстом");
  }
}

/* ---------- приглашения ---------- */
function openInvite() {
  const url = joinUrl();
  const text = `Присоединяйся к разговору${S.title ? " «" + S.title + "»" : ""}. Нажми ссылку — ничего устанавливать не нужно:\n${url}`;
  const e = encodeURIComponent;
  $("inviteUrl").value = url;
  try { const qr = qrcode(0, "M"); qr.addData(url); qr.make(); $("qr").innerHTML = qr.createSvgTag({ scalable: true, margin: 0, cellSize: 4 }); } catch { $("qr").textContent = ""; }
  const items = [
    ["WhatsApp", `https://wa.me/?text=${e(text)}`],
    ["Viber", `viber://forward?text=${e(text)}`],
    ["Telegram", `https://t.me/share/url?url=${e(url)}&text=${e("Присоединяйся к разговору")}`],
    ["Teams", `https://teams.microsoft.com/share?href=${e(url)}&msgText=${e("Присоединяйся к разговору")}`],
    ["СМС", `sms:?&body=${e(text)}`],
    ["Почта", `mailto:?subject=${e("Приглашение в разговор")}&body=${e(text)}`]
  ];
  const box = $("inviteBtns"); box.replaceChildren();
  if (navigator.share) {
    const b = document.createElement("button"); b.className = "wide primary"; b.textContent = "Отправить через меню телефона…";
    b.onclick = () => navigator.share({ title: "СИНГУЛЯР", text, url }).catch(() => {}); box.append(b);
  }
  for (const [n, href] of items) { const a = document.createElement("a"); a.textContent = n; a.href = href; a.target = "_blank"; a.rel = "noopener"; box.append(a); }
  const copy = (label, val) => {
    const b = document.createElement("button"); b.textContent = label;
    b.onclick = async () => { try { await navigator.clipboard.writeText(val); toast("Скопировано"); } catch { $("inviteUrl").select(); toast("Выдели и скопируй вручную"); } };
    box.append(b);
  };
  copy("Скопировать ссылку", url); copy("Signal: скопировать текст", text);
  $("inviteDlg").classList.remove("hidden");
}
$("btnInvite").onclick = openInvite;
$("inviteClose").onclick = () => $("inviteDlg").classList.add("hidden");
$("inviteDlg").onclick = e => { if (e.target === $("inviteDlg")) $("inviteDlg").classList.add("hidden"); };
addEventListener("keydown", e => { if (e.key === "Escape") $("inviteDlg").classList.add("hidden"); });

/* ---------- выход ---------- */
$("btnLeave").onclick = () => {
  S.leaving = true; stopCaptions();
  for (const k of ["mic", "cam"]) { S[k]?.stop(); S[k] = null; }
  for (const t of S.local.getTracks()) S.local.removeTrack(t);
  for (const id of [...S.calls.keys()]) leaveBridge(id);
  S.mix = null;
  for (const id of [...S.pcs.keys()]) closePeer(id);
  document.querySelector('[data-peer="self"]')?.remove();
  $("btnMic").setAttribute("aria-pressed", "false"); $("btnCam").setAttribute("aria-pressed", "false");
  S.ws?.close(); $("messages").replaceChildren(); S.seen.clear();
  show("join");
};

/* ---------- морзе и брайль (0.5.4 «АЗБУКИ ВСЕХ») ----------
   ЕСТЬ ЧЕЛОВЕК — НЕТ НАЦИЙ: механизм один, письмо — человека.
   Морзе: 8 писем мира (латиница ITU, кириллица, греческая, иврит, арабская,
   персидская, хангыль 1888, Wabun) — азбуку выбирает человек, «Авто» по умолчанию.
   Брайль: одна 6-точечная клетка на всех; письмо — по языку сообщения
   (латиница, кириллица, греческий, иврит, арабский; цифры — числовой знак ⠼).
   Таблицы сверены по источникам и лежат в public/azbuki.js (тесты: tests/azbuki.test.mjs).
   Знака нет в сверенной таблице — знак не переводится: дом не выдумывает. */
import { morseAlphabets, morseOf, morseDecode, textToBraille } from "/azbuki.js";

/* Вибро-морзе: W3C Vibration API — максимум 10 звеньев в рисунке (круг 3, честная граница),
   поэтому вибрирует первое слово целиком, дальше — тактильный тик «есть продолжение».
   Точка 120 мс, тире 360 мс, внутри буквы пауза 80, между словами 400. */
function vibrateMorse(text) {
  const word = (morseOf(text).split(" /")[0] || "").trim();
  if (!word) { navigator.vibrate?.([60]); return; }
  const pat = [];
  for (const sym of word) {
    if (sym === ".") { pat.push(120, 80); }
    else if (sym === "-") { pat.push(360, 80); }
    else if (sym === " ") { pat.length && pat.pop(); pat.push(400); }
  }
  if (pat.length && pat.length % 2 === 0) pat.pop(); else if (pat.length % 2) pat.pop();
  if (pat.length > 10) pat.length = 10;
  if (pat.length) pat.push(600);
  navigator.vibrate?.(pat.length ? pat : [60]);
}
function renderBraille() {                      // перерисовать брайль у уже лежащих сообщений
  document.querySelectorAll(".braille").forEach(e => e.remove());
  if (!S.braille) return;
  document.querySelectorAll(".msg").forEach(el => {
    const body = [...el.children].find(c => c.tagName === "DIV" && !c.className);
    if (!body) return;
    const b = document.createElement("div"); b.className = "braille"; b.textContent = textToBraille(body.textContent);
    el.append(b);
  });
}
/* Морзе-ключ (практика Gboard/Hello Morse: одна-две кнопки = полная клавиатура
   для людей с ограниченной подвижностью). Азбука — на выбор человека. */
let mBuf = "";
function mBufShow() {
  const ch = morseDecode(mBuf, S.morseAlphabet);
  $("morseBuf").textContent = mBuf ? [...mBuf].map(c => c === "." ? "·" : "−").join("") + (ch ? " = " + ch.toUpperCase() : "") : "—";
}
function mChar(sym) { if (mBuf.length < 7) { mBuf += sym; mBufShow(); } }
function mLetter() {
  if (!mBuf) return;
  const ch = morseDecode(mBuf, S.morseAlphabet);
  const inp = $("msg");
  inp.value += ch || "";
  if (ch) { inp.dispatchEvent(new Event("input", { bubbles: true })); beep(660, 60); } else beep(220, 120);
  mBuf = ""; mBufShow();
}
function mWord() { mLetter(); $("msg").value += " "; $("msg").dispatchEvent(new Event("input", { bubbles: true })); }
/* Селектор азбуки: «Авто» + все письма мира — один список, никто не привязан к стране */
{
  const sel = $("morseAlphabet");
  sel.innerHTML = `<option value="*">Авто · все азбуки</option>` +
    Object.entries(morseAlphabets).map(([k, a]) => `<option value="${k}">${a.имя}</option>`).join("");
  sel.value = S.morseAlphabet;
  sel.onchange = () => { S.morseAlphabet = sel.value; store.set("morseAlphabet", S.morseAlphabet); mBufShow(); };
}
$("btnMorse").onclick = () => { $("morsePad").classList.toggle("hidden"); mBufShow(); };
$("mDot").onclick = () => mChar(".");
$("mDash").onclick = () => mChar("-");
$("mLet").onclick = mLetter;
$("mWord").onclick = mWord;
$("mBack").onclick = () => { mBuf = ""; $("msg").value = $("msg").value.slice(0, -1); mBufShow(); };

/* ---------- письмо на бумагу (Easy Read: одна мысль — одна строка) ---------- */
const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function openLetter() {
  const w = window.open("", "_blank");
  if (!w) return toast("Браузер закрыл окно: разреши всплывающие окна");
  const rows = [...$("messages").querySelectorAll(".msg")]
    .filter(el => !el.classList.contains("sys"))
    .map(el => "<p>" + escHtml(el.textContent) + "</p>").join("\n");
  w.document.write(`<!doctype html><html lang="ru"><meta charset="utf-8"><title>Письмо — ${escHtml(S.title || "пространство")}</title>
  <style>body{font:16pt/1.7 Georgia,serif;margin:3cm}h1{font-size:20pt}p{margin:0 0 .6em}.who{color:#555}
  @page{margin:2cm}</style>
  <h1>Письмо из пространства «${escHtml(S.title || "")}»</h1>
  <p>Дата: ${new Date().toLocaleDateString("ru")}. Одна строка — одна мысль. Ниже — весь разговор.</p>
  <hr>${rows}
  <hr><p>Это письмо можно распечатать и передать человеку, у которого нет связи. Ответ — тем же путём.</p>
  <script>setTimeout(()=>window.print(),400)<\/script>`);
  w.document.close();
}
$("btnLetter").onclick = openLetter;

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("/sw.js").catch(() => {});
window.__sg = S; // отладочный доступ для тестов
window.__sgUI = { addMsg, addSys, toast }; // двери для duet.js (прямая связь без дома)
