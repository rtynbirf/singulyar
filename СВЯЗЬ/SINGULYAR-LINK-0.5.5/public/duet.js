/* СИНГУЛЯР · ПРЯМАЯ СВЯЗЬ (duet) — разговор без дома.
   Мир знает «manual SDP exchange» (lesmana/webrtc-without-signaling-server, dev.to hexshift,
   videosdk offline-guide 2025): offer/answer передаются руками — QR, письмо, СМС, голосом.
   НО у всех это демо для программиста. ВПЕРВЫЕ: кнопка для живого человека — «Я зову» /
   «Меня зовут», код уходит в QR и в поле, разговор открывается, когда дома нет:
   сервер выключен, интернета нет, осталось два телефона и любой путь между ними.
   Канал — RTCDataChannel; конфиг ICE берём осторожно (урок 0.5.2: Firefox бросает на
   чужой конфиг — если с серверами не вышло, живём без них). */
(() => {
  if (typeof window === "undefined" || !window.RTCPeerConnection) return;
  const $ = id => document.getElementById(id);
  const UI = () => window.__sgUI || { addMsg() {}, addSys() {}, toast() {} };

  const S = { pc: null, dc: null, role: null, name: null, ready: false };
  const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.trim().replace(/\s+/g, "")))));
  const status = t => { $("dStatus").textContent = t; };

  function showCode(obj) {
    const code = enc(obj);
    $("dOut").value = code;
    $("dQr").replaceChildren();
    try {
      const qr = qrcode(0, "L"); qr.addData(code); qr.make();
      $("dQr").innerHTML = qr.createSvgTag({ scalable: true, margin: 0, cellSize: 3 });
    } catch {
      $("dQr").innerHTML = ""; UI().toast("Код длинный для QR — передай текстом целиком");
    }
    $("dOut").select();
    status("Код готов: отдай второй стороной любым путём (QR, письмо, СМС, голосом). Жду его код в ответ.");
  }

  function myConfig() {
    try { return { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] }; }
    catch { return {}; }
  }
  const waitIce = pc => new Promise(res => {
    if (pc.iceGatheringState === "complete") return res();
    const t = setTimeout(fin, 2500);
    function fin() { clearTimeout(t); pc.removeEventListener("icegatheringstatechange", chk); res(); }
    function chk() { if (pc.iceGatheringState === "complete") fin(); }
    pc.addEventListener("icegatheringstatechange", chk);
  });

  function wireDc(dc) {
    S.dc = dc;
    dc.onopen = () => {
      S.ready = true;
      $("dForm").classList.remove("hidden");
      status("ПРЯМАЯ СВЯЗЬ ЖИВА — дом не нужен.");
      UI().addSys("Прямая связь поднята (без дома).");
      dc.send(JSON.stringify({ n: S.name, hello: true }));
    };
    dc.onmessage = e => {
      let m; try { m = JSON.parse(e.data); } catch { return; }
      if (m.hello && m.n) { S.peerName = m.n; return; }
      if (m.t) UI().addMsg({ id: "duet-" + Date.now() + Math.random(), from: "duet", name: S.peerName || "Напарник", text: String(m.t).slice(0, 1000), at: m.at || Date.now(), via: "прямая связь" });
    };
    dc.onclose = () => { S.ready = false; $("dForm").classList.add("hidden"); status("Прямая связь закрыта."); };
  }

  async function makeOffer() {
    reset();
    S.role = "a"; S.name = (window.__sg?.name || "").trim() || "Зовущий";
    const pc = new RTCPeerConnection(myConfig()); S.pc = pc;
    wireDc(pc.createDataChannel("sg"));
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc);
    showCode(pc.localDescription);
  }
  async function useOffer() {
    reset();
    S.role = "b"; S.name = (window.__sg?.name || "").trim() || "Отвечающий";
    let offer;
    try { offer = dec($("dIn").value); } catch { return status("Код не читается: вставь его целиком, без лишних знаков."); }
    const pc = new RTCPeerConnection(myConfig()); S.pc = pc;
    pc.ondatachannel = e => wireDc(e.channel);
    await pc.setRemoteDescription(offer);
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(pc);
    showCode(pc.localDescription);
  }
  async function useAnswer() {
    if (S.role !== "a") return status("Сначала нажми «Я зову» и отдай свой код.");
    let answer;
    try { answer = dec($("dIn").value); } catch { return status("Код ответа не читается: вставь целиком."); }
    if (answer.type !== "answer") return status("Это не ответ: второй стороне нужно нажать «Меня зовут».");
    await S.pc.setRemoteDescription(answer);
    status("Ответ принят: соединяюсь…");
  }

  function reset() {
    try { S.dc?.close(); } catch {}
    try { S.pc?.close(); } catch {}
    S.pc = null; S.dc = null; S.ready = false; S.role = null; S.peerName = null;
    $("dOut").value = ""; $("dQr").replaceChildren(); $("dForm").classList.add("hidden");
  }

  $("dOfferMake").onclick = () => makeOffer().catch(e => status("Не вышло: " + e.message));
  $("dOfferUse").onclick = () => useOffer().catch(e => status("Не вышло: " + e.message));
  $("dStep").onclick = () => (S.role === "a" ? useAnswer() : status("Ты отвечающая сторона — твой код уже готов, отдай его зову."))?.catch?.(e => status("Не вышло: " + e.message));
  $("dClear").onclick = () => { reset(); status("прямая связь не поднята"); };
  $("dForm").onsubmit = e => {
    e.preventDefault();
    const t = $("dMsg").value.trim(); if (!t || !S.ready) return;
    S.dc.send(JSON.stringify({ n: S.name, t, at: Date.now() }));
    UI().addMsg({ id: "duet-my-" + Date.now(), from: S.id || "me", name: S.name, text: t, at: Date.now(), via: "прямая связь" });
    $("dMsg").value = "";
  };
})();
