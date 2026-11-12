// Мост ОБЫЧНОГО ТЕЛЕФОНА ↔ пространство (SIP, RFC 3261; медиа — G.711, RFC 3551).
//
//  У человека нет интернета, есть кнопочный телефон — он всё равно участник разговора:
//  телефон (или АТС/транк, например Twilio Elastic SIP Trunking, Asterisk PJSIP) звонит
//  на наш SIP-порт → мост поднимает участника «Телефон: +7…»; и наоборот — из комнаты
//  кнопкой ☎ можно позвонить на обычный номер через АТС из конфига (dial).
//
//  Медиа БЕЗ перекодирования — мировая практика WebRTC↔SIP-шлюзов: телефоны говорят
//  G.711 (PCMU/PCMA), браузеры умеют G.711 тоже, поэтому RTP проходит насквозь, мост
//  только переписывает заголовки (один постоянный SSRC, непрерывные seq/ts — правило
//  SFU 0.5.1). Кого слушать — решает сервер (эффект-миксер, как у моста WhatsApp).
//  Кнопки телефона (DTMF, RFC 4733) приходят в чат дома.
//
//  Честные границы: SIP по UDP без TLS (связка АТС на доверенной сети/VPS); REGISTER
//  не нужен — мост принимает прямые звонки транка; серверу нужен белый IP и UDP,
//  как для звонков WhatsApp.
import crypto from "node:crypto";
import dgram from "node:dgram";
import { RTCPeerConnection, MediaStreamTrack, RtpPacket, RtpHeader, usePCMU, usePCMA } from "werift";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CRLF = "\r\n";
const T1 = 500;                                    // таймер RFC 3261
const UA = "СИНГУЛЯР-LINK";

/* ---------- разбор/сборка SIP ---------- */
const parseSIP = raw => {
  const s = String(raw);
  const sep = s.indexOf(CRLF + CRLF);
  const head = sep < 0 ? s : s.slice(0, sep), body = sep < 0 ? "" : s.slice(sep + 4);
  const lines = head.split(CRLF);
  const h = { via: [], raw: lines[0] };
  for (const line of lines.slice(1)) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    const k = line.slice(0, i).trim().toLowerCase(), v = line.slice(i + 1).trim();
    if (k === "via") h.via.push(v); else h[k] = v;
  }
  return { ...h, body };
};
const firstVia = v => v.split(",")[0].trim();
const hdrParam = (v, name) => (String(v).match(new RegExp(";" + name + "=([^;\\s]+)", "i")) || [])[1] || "";
const sipUser = v => (String(v).match(/<?(?:sips?):([^@?>]*)@/) || [])[1] || "";
const displayName = v => (String(v).match(/"([^"]*)"/) || [])[1] || "";
const rand = n => crypto.randomBytes(n).toString("hex");
const tagOf = v => hdrParam(v, "tag");

const respond = (sock, rinfo, req, code, reason, { to, body } = {}) => {
  const top = [`SIP/2.0 ${code} ${reason}`];
  for (const via of req.via || []) top.push(`Via: ${firstVia(via)}`);
  top.push(`From: ${req.from || "<sip:unknown@invalid>"}`,
    `To: ${to || req.to || "<sip:unknown@invalid>"}`,
    `Call-ID: ${req["call-id"] || ""}`,
    `CSeq: ${req.cseq || ""}`,
    `User-Agent: ${UA}`, `Allow: INVITE, ACK, BYE, CANCEL`, `Contact: <sip:space@${reqHost(req)}>`,
    `Content-Length: ${body ? Buffer.byteLength(body) : 0}`);
  if (body) top.push(`Content-Type: application/sdp`, body);
  const out = Buffer.from(top.join(CRLF) + CRLF + CRLF);
  try { sock.send(out, rinfo.port, rinfo.address); } catch {}
};
const reqHost = req => {
  const via = firstVia(req.via?.[0] || "");
  const rec = via.match(/received=([^;\s]+)/);
  if (rec) return rec[1];
  const m = via.match(/SIP\/2\.0\/(?:UDP|TCP)\s+([^:;\s]+)/);
  return m ? m[1] : "0.0.0.0";
};

/* ---------- разбор/сборка SDP (RFC 3264) ---------- */
function parseSdp(sdp) {
  let cIp = null, mLine = null, rtpmaps = {};
  for (const line of String(sdp).split(/\r?\n/)) {
    if (line.startsWith("c=")) { if (!cIp || mLine === null) cIp = line.split(" ")[2]; if (mLine) break; }
    else if (line.startsWith("m=audio")) { const p = line.split(" "); mLine = { port: Number(p[1]), pts: p.slice(3).map(Number) }; }
    else if (line.startsWith("a=rtpmap:")) {
      const m = line.match(/a=rtpmap:(\d+)\s+([^/]+)\/(\d+)/i);
      if (m) rtpmaps[Number(m[1])] = { name: m[2].toUpperCase(), rate: Number(m[3]) };
    }
  }
  return { ip: cIp, m: mLine, maps: rtpmaps };
}
const buildSdp = (ip, port, pt, dtmfPt, sess = Date.now() / 1000 | 0) => [
  "v=0", `o=- ${sess} ${sess} IN IP4 ${ip}`, "s=СИНГУЛЯР", `c=IN IP4 ${ip}`, "t=0 0",
  `m=audio ${port} RTP/AVP ${pt}${dtmfPt != null ? " " + dtmfPt : ""}`,
  `a=rtpmap:${pt} ${pt === 0 ? "PCMU" : "PCMA"}/8000`,
  ...(dtmfPt != null ? [`a=rtpmap:${dtmfPt} telephone-event/8000`, `a=fmtp:${dtmfPt} 0-16`] : []),
  "a=ptime:20", "a=sendrecv"
].join(CRLF) + CRLF;

/* ---------- RTP: минимальный парсер и сборщик (RFC 3550) ---------- */
function rtpHead(buf) {
  if (buf.length < 12 || buf[0] >> 6 !== 2) return null;
  let off = 12 + 4 * (buf[0] & 0x0f);
  if (buf[0] & 0x10) { if (buf.length < off + 4) return null; off += 4 + buf.readUInt16BE(off + 2) * 4; }
  if (buf[0] & 0x20) { const pad = buf[buf.length - 1]; if (pad && pad <= buf.length - off) buf = buf.subarray(0, buf.length - pad); }
  return {
    pt: buf[1] & 0x7f, marker: !!(buf[1] & 0x80), seq: buf.readUInt16BE(2),
    ts: buf.readUInt32BE(4), ssrc: buf.readUInt32BE(8), payload: buf.subarray(off)
  };
}
const rtpPack = (pt, seq, ts, ssrc, payload, marker = false) => {
  const h = Buffer.alloc(12); h[0] = 0x80; h[1] = (marker ? 0x80 : 0) | (pt & 0x7f);
  h.writeUInt16BE(seq & 0xffff, 2); h.writeUInt32BE(ts >>> 0, 4); h.writeUInt32BE(ssrc >>> 0, 8);
  return Buffer.concat([h, payload]);
};

/* DTMF RFC 4733: [event, E|R|volume, duration]; говорим в чат дома по концу нажатия */
const DTMF_LABEL = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "#", "A", "B", "C", "D"];

export function sipPhoneBridge(cfg, hub) {
  const room = cfg.room;
  const publicIp = cfg.publicIp || "127.0.0.1";
  const allowFrom = cfg.allowFrom ? new RegExp(cfg.allowFrom) : null;
  const calls = new Map();               // callId -> call
  let sipSock = null, rtpSeq = 0, memberIds = [], graceTimer = null;
  const MAX_CALLS = Number(cfg.maxCalls || 3);
  const invites = new Map();             // ip -> [t0, n] против наводнения INVITE

  /* ---------- RTP-сокет звонка ---------- */
  const bindRtp = start => new Promise((ok, bad) => {
    let port = Number(cfg.rtpStart || 40000), tries = 0;
    const attempt = () => {
      const s = dgram.createSocket("udp4");
      s.once("error", e => { tries++; if (tries < 40) { port++; attempt(); } else bad(e); });
      s.bind(port, "0.0.0.0", () => ok({ sock: s, port }));
    };
    attempt(); void start;
  });

  const mixerId = () => hub.members(room)[0] || null;
  const LIVE_MS = 1500;
  /* Кого слушать — решает сервер: приоритет у избранного ведущего, при тишине — любая живая труба */
  const effMixer = call => {
    const elected = mixerId(), now = Date.now();
    const alive = id => { const l = call.legs.get(id); return l && memberIds.includes(id) && l.lastRtp > now - LIVE_MS; };
    if (elected && alive(elected)) return elected;
    let best = null;
    for (const id of memberIds) if (alive(id) && (!best || call.legs.get(id).lastRtp > call.legs.get(best).lastRtp)) best = id;
    return best;
  };
  const announce = c => ({ type: "call-bridge", id: c.bridgeId, name: c.name, via: "Телефон", mixer: mixerId() });

  const toLegs = (call, payload, pt) => {
    for (const leg of call.legs.values()) {
      try {
        leg.seq = (leg.seq + 1) & 0xffff; leg.ts += 160;
        leg.out.writeRtp(new RtpPacket(new RtpHeader({
          payloadType: pt, sequenceNumber: leg.seq, timestamp: leg.ts,
          marker: false, ssrc: leg.ssrc
        }), payload));
      } catch {}
    }
  };
  const toPhone = (call, payload, pt) => {
    if (!call.phone?.ip || call.rtpSock === null) return;
    call.outSeq = (call.outSeq + 1) & 0xffff; call.outTs += 160;
    try { call.rtpSock.send(rtpPack(pt, call.outSeq, call.outTs, call.outSsrc, payload), call.phone.port, call.phone.ip); } catch {}
  };

  /* ---------- нога «мост ↔ браузер» (WebRTC, PCMU — как телефон) ---------- */
  async function onSignal(roomId, fromId, to, payload) {
    if (roomId !== room) return;
    const call = [...calls.values()].find(c => c.bridgeId === to);
    if (!call || call.closed) return;
    let leg = call.legs.get(fromId);
    if (!leg) {
      const pc = new RTCPeerConnection({ codecs: { audio: [call.pt === 0 ? usePCMU() : usePCMA()], video: [] }, iceUseIpv6: false });
      const out = new MediaStreamTrack({ kind: "audio" });          // звук телефона → этот браузер
      const tr = pc.addTransceiver(out, { direction: "sendrecv" });
      leg = { pc, out, pending: [], remoteSet: false, lastRtp: 0, seq: (Math.random() * 65535) | 0, ts: 0, ssrc: 2_000_000 + (rtpSeq++ % 500000) };
      call.legs.set(fromId, leg);
      tr.onTrack.subscribe(track => track.onReceiveRtp.subscribe(rtp => {
        leg.lastRtp = Date.now();
        if (rtp.header && fromId === effMixer(call) && !call.closed) toPhone(call, rtp.payload, call.pt);
      }));
      pc.connectionStateChange.subscribe(s => { if (["failed", "closed"].includes(s)) { leg.lastRtp = 0; } });
      pc.onIceCandidate.subscribe(c => { if (c) hub.sendTo(room, fromId, { type: "signal", from: call.bridgeId, payload: { candidate: c.toJSON ? c.toJSON() : c } }); });
    }
    try {
      if (payload.description) {
        await leg.pc.setRemoteDescription(payload.description);
        leg.remoteSet = true;
        for (const c of leg.pending.splice(0)) await leg.pc.addIceCandidate(c).catch(() => {});
        if (payload.description.type === "offer") {
          await leg.pc.setLocalDescription(await leg.pc.createAnswer());
          hub.sendTo(room, fromId, { type: "signal", from: call.bridgeId, payload: { description: { type: "answer", sdp: leg.pc.localDescription.sdp } } });
        }
      } else if (payload.candidate) {
        if (leg.remoteSet) await leg.pc.addIceCandidate(payload.candidate).catch(() => {});
        else leg.pending.push(payload.candidate);
      }
    } catch (e) { console.warn("[sip-phone] signal:", e.message); }
  }

  /* ---------- медиа телефона: RTP приходят на сокет звонка ---------- */
  function wireRtp(call) {
    call.rtpSock.on("message", buf => {
      const r = rtpHead(buf); if (!r) return;
      call.lastRtp = Date.now();
      if (r.pt === call.dtmfPt) {
        if (r.payload.length >= 2 && (r.payload[1] & 0x80)) {                 // E-бит — нажатие кончилось
          const label = DTMF_LABEL[r.payload[0]] || `код ${r.payload[0]}`;
          if (call.dtmfLast !== r.payload[0] + ":" + r.seq) {
            call.dtmfLast = r.payload[0] + ":" + r.seq;
            hub.post(room, { name: "Система", text: `☎ ${call.name}: нажал(а) «${label}»`, via: "Телефон" });
          }
        }
        return;
      }
      if (r.pt === call.pt && r.payload.length) toLegs(call, r.payload, call.pt);
    });
  }

  /* ---------- участник в комнате ---------- */
  function admit(call) {
    if (call.announced || call.closed) return;
    call.announced = true;
    hub.post(room, { name: "Система", text: `📞 ${call.name} в разговоре — обычный телефон, слышит всех и его слышат`, via: "Телефон" });
    hub.broadcast(room, announce(call));
  }
  function say(text) { hub.post(room, { name: "Система", text, via: "Телефон" }); }

  async function end(callId, bye = true) {
    const call = calls.get(callId);
    if (!call || call.closed) return;
    call.closed = true; calls.delete(callId);
    for (const l of call.legs.values()) { try { await l.pc.close(); } catch {} }
    if (bye && call.sip && call.dir === "in") {          // телефон положил не сам — прощаемся
      call.sip.sockSend(`BYE sip:${call.fromUser || "phone"}@${publicIp} SIP/2.0${CRLF}` +
        `Via: SIP/2.0/UDP ${publicIp}:${call.sip.port};branch=z9hG4bK-${rand(6)}${CRLF}` +
        `From: ${call.reqFrom}${CRLF}To: ${call.respTo}${CRLF}Call-ID: ${callId}${CRLF}` +
        `CSeq: ${call.cseqNum + 1} BYE${CRLF}User-Agent: ${UA}${CRLF}Content-Length: 0${CRLF}${CRLF}`);
    }
    if (bye && call.dir === "out") sendBye(call);
    try { call.rtpSock?.close(); } catch {}
    if (call.announced) { hub.broadcast(room, { type: "call-bridge-end", id: call.bridgeId }); say(`📞 ${call.name} — телефон положил трубку`); }
  }

  function sendBye(call) {
    if (!call.dialSock) return;
    call.dialSock(`BYE sip:${call.number}@${cfg.dial.host}:${cfg.dial.port || 5060} SIP/2.0${CRLF}` +
      `Via: SIP/2.0/UDP ${publicIp}:${call.sipPort};branch=z9hG4bK-${rand(6)}${CRLF}` +
      `From: <sip:space@${publicIp}>;tag=${call.fromTag}${CRLF}To: ${call.respTo || `sip:${call.number}@${cfg.dial.host}`}${CRLF}` +
      `Call-ID: ${call.id}${CRLF}CSeq: 2 BYE${CRLF}User-Agent: ${UA}${CRLF}Content-Length: 0${CRLF}${CRLF}`);
  }

  /* ---------- входящий звонок: телефон → пространство ---------- */
  function onInvite(req, rinfo, sock) {
    const callId = req["call-id"];
    if (!callId || !req.cseq || !req.via?.length) return;
    const flood = invites.get(rinfo.address) || [Date.now(), 0];
    flood[1] += Date.now() - flood[0] > 60_000 ? (flood[0] = Date.now(), 1) : 1;
    invites.set(rinfo.address, flood);
    if (flood[1] > 20) return;                                    // наводнение — молча игнорируем
    const sdp = parseSdp(req.body || "");
    const audioPt = sdp.m?.pts?.find(pt => sdp.maps[pt]?.name === "PCMU" && sdp.maps[pt].rate === 8000);
    const pcmaPt = sdp.m?.pts?.find(pt => sdp.maps[pt]?.name === "PCMA" && sdp.maps[pt].rate === 8000);
    const dtmfPt = sdp.m?.pts?.find(pt => sdp.maps[pt]?.name === "TELEPHONE-EVENT");
    const fromUser = sipUser(req.from), fromName = displayName(req.from) || fromUser;
    if (allowFrom && !allowFrom.test(fromUser || "")) { respond(sock, rinfo, req, 403, "Forbidden"); return; }   // сначала кто звал
    if (audioPt === undefined && pcmaPt === undefined) {
      respond(sock, rinfo, req, 488, "Not Acceptable Here");
      return;
    }
    if (calls.size >= MAX_CALLS) { respond(sock, rinfo, req, 486, "Busy Here"); return; }
    if (calls.has(callId)) { calls.get(callId).resend200?.(); return; }   // retransmit INVITE → снова 200

    const cseqNum = Number((req.cseq.match(/^(\d+)/) || [])[1] || 1);
    const toTag = rand(4);
    const respTo = `${req.to};tag=${toTag}`;
    respond(sock, rinfo, req, 100, "Trying");
    respond(sock, rinfo, req, 180, "Ringing", { to: respTo });

    (async () => {
      const { sock: rtpSock, port } = await bindRtp();
      const pt = audioPt !== undefined ? audioPt : pcmaPt;
      const call = {
        id: callId, dir: "in", bridgeId: "bridge:sip:" + callId.slice(0, 24),
        name: `Телефон: ${fromUser || fromName || "неизвестный"}`,
        fromUser, reqFrom: req.from, respTo, cseqNum,
        pt, dtmfPt: dtmfPt ?? null, phone: { ip: sdp.ip, port: sdp.m.port },
        legs: new Map(), closed: false, announced: false, lastRtp: 0,
        outSsrc: 3_500_000 + (rtpSeq++ % 500000), outSeq: (Math.random() * 65535) | 0, outTs: 0,
        sip: { port: sock.address().port, sockSend: b => { try { sock.send(b, rinfo.port, rinfo.address); } catch {} } },
        rtpSock
      };
      calls.set(callId, call);
      wireRtp(call);
      rtpSock.on("message", () => {});                             // медиа уже смотрит wireRtp
      const ok200 = `SIP/2.0 200 OK${CRLF}${req.via.map(v => `Via: ${firstVia(v)}`).join(CRLF)}${CRLF}` +
        `From: ${req.from}${CRLF}To: ${respTo}${CRLF}Call-ID: ${callId}${CRLF}CSeq: ${req.cseq}${CRLF}` +
        `User-Agent: ${UA}${CRLF}Allow: INVITE, ACK, BYE, CANCEL${CRLF}` +
        `Contact: <sip:space@${publicIp}:${call.sip.port}>${CRLF}Content-Type: application/sdp${CRLF}` +
        `Content-Length: ${Buffer.byteLength(buildSdp(publicIp, port, pt, call.dtmfPt))}${CRLF}${CRLF}` +
        buildSdp(publicIp, port, pt, call.dtmfPt);
      let delay = T1, tries = 0;
      call.resend200 = () => { try { sock.send(Buffer.from(ok200), rinfo.port, rinfo.address); } catch {} };
      while (!call.closed && !call.acked && tries++ < 8) {          // 200 ретрансмится, пока нет ACK
        call.resend200();
        await sleep(delay); delay = Math.min(delay * 2, 4000);
      }
      admit(call);                                                  // даже без ACK: UDP, АТС может молчать
    })();
  }

  /* ---------- исходящий звонок: пространство → телефон (кнопка ☎) ---------- */
  async function onCallOut(roomId, fromId, { number } = {}) {
    if (roomId !== room || calls.size >= MAX_CALLS) { if (!cfg.dial) say("☎ Телефонный мост не настроен: в bridges.json нужен блок sip-phone с dial (адрес АТС/транка)"); return; }
    if (!cfg.dial?.host) { say("☎ АТС не настроена: в bridges.json для sip-phone нужен блок dial — через неё звоним на номер"); return; }
    const num = String(number || "").replace(/[^\d*#+,]/g, "").slice(0, 24);
    if (!num) { say("☎ Номер не понял — набери заново"); return; }
    const callId = rand(10), fromTag = rand(6);
    const { sock: rtpSock, port } = await bindRtp();
    const call = {
      id: callId, dir: "out", bridgeId: "bridge:sip:" + callId,
      name: `Телефон: ${num}`, number: num, fromTag, respTo: null,
      pt: 0, dtmfPt: 101, legs: new Map(), closed: false, announced: false, lastRtp: 0,
      outSsrc: 3_500_000 + (rtpSeq++ % 500000), outSeq: (Math.random() * 65535) | 0, outTs: 0,
      sipPort: sipSock?.address?.().port || 0, rtpSock,
      dialSock: b => { try { call.uacSock.send(Buffer.from(b), cfg.dial.port || 5060, cfg.dial.host); } catch {} }
    };
    call.uacSock = sipSock;
    calls.set(callId, call);
    wireRtp(call);
    say(`☎ Набираю ${num} по обычному телефону…`);
    const sdp = buildSdp(publicIp, port, 0, 101);
    const invite = `INVITE sip:${num}@${cfg.dial.host}:${cfg.dial.port || 5060} SIP/2.0${CRLF}` +
      `Via: SIP/2.0/UDP ${publicIp}:${rtpSock.port};branch=z9hG4bK-${rand(6)}${CRLF}` +
      `Max-Forwards: 70${CRLF}From: <sip:space@${publicIp}>;tag=${fromTag}${CRLF}` +
      `To: <sip:${num}@${cfg.dial.host}>${CRLF}Call-ID: ${callId}${CRLF}CSeq: 1 INVITE${CRLF}` +
      `User-Agent: ${UA}${CRLF}Contact: <sip:space@${publicIp}:${rtpSock.port}>${CRLF}` +
      `Allow: INVITE, ACK, BYE, CANCEL${CRLF}Content-Type: application/sdp${CRLF}` +
      `Content-Length: ${Buffer.byteLength(sdp)}${CRLF}${CRLF}${sdp}`;
    const sendInv = () => { try { call.uacSock.send(Buffer.from(invite), cfg.dial.port || 5060, cfg.dial.host); } catch {} };
    sendInv();
    let delay = T1, tries = 0;
    const deadline = Date.now() + 60_000;
    while (!call.closed && !call.acked && Date.now() < deadline && tries++ < 12) {
      await sleep(delay); delay = Math.min(delay * 2, 4000);
      if (!call.acked && !call.closed) sendInv();
    }
    if (!call.acked && !call.closed) { say(`☎ ${num} не отвечает`); end(callId, false); }
  }

  /* ---------- входящие SIP-датаграммы (для UAC-ответов и UAS-запросов) ---------- */
  function onDatagram(buf, rinfo, sock) {
    const req = parseSIP(buf);
    const top = req.raw || "";
    const callId = req["call-id"];
    const call = callId ? calls.get(callId) : null;

    if (top.startsWith("SIP/2.0")) {                              // ответ (наш исходящий INVITE)
      const code = Number(top.split(" ")[1]);
      if (!call) return;
      if (code === 180 || code === 183) { call.respTo = req.to; return; }
      if (code >= 200 && code < 300) {
        if (call.acked) return;
        call.acked = true;
        call.respTo = req.to;
        const sdp = parseSdp(req.body || "");
        const audioPt = sdp.m?.pts?.find(pt => sdp.maps[pt]?.name === "PCMU" && sdp.maps[pt].rate === 8000)
          ?? sdp.m?.pts?.find(pt => sdp.maps[pt]?.name === "PCMA" && sdp.maps[pt].rate === 8000);
        const dtmfPt = sdp.m?.pts?.find(pt => sdp.maps[pt]?.name === "TELEPHONE-EVENT");
        if (sdp.ip && sdp.m?.port && audioPt !== undefined) { call.phone = { ip: sdp.ip, port: sdp.m.port }; call.pt = audioPt; call.dtmfPt = dtmfPt ?? null; }
        sock.send(Buffer.from(`ACK sip:${call.number}@${cfg.dial.host}:${cfg.dial.port || 5060} SIP/2.0${CRLF}` +
          `Via: SIP/2.0/UDP ${publicIp}:${call.sipPort};branch=z9hG4bK-${rand(6)}${CRLF}` +
          `From: <sip:space@${publicIp}>;tag=${call.fromTag}${CRLF}To: ${call.respTo}${CRLF}` +
          `Call-ID: ${callId}${CRLF}CSeq: 1 ACK${CRLF}User-Agent: ${UA}${CRLF}Content-Length: 0${CRLF}${CRLF}`), rinfo.port, rinfo.address);
        admit(call);
      } else if (code >= 400) {
        if (!call.acked && !call.closed) {
          const why = { 403: "отклонено", 404: "номер не найден", 480: "не отвечает", 486: "занято", 488: "звук телефона не поддерживается (нужен G.711)" }[code] || `отказ ${code}`;
          say(`☎ ${call.number}: ${why}`);
          if (code >= 400 && code < 700) sock.send(Buffer.from(`ACK sip:${call.number}@${cfg.dial.host}:${cfg.dial.port || 5060} SIP/2.0${CRLF}` +
            `Via: SIP/2.0/UDP ${publicIp}:${call.sipPort};branch=z9hG4bK-${rand(6)}${CRLF}` +
            `From: <sip:space@${publicIp}>;tag=${call.fromTag}${CRLF}To: ${req.to}${CRLF}` +
            `Call-ID: ${callId}${CRLF}CSeq: 1 ACK${CRLF}Content-Length: 0${CRLF}${CRLF}`), rinfo.port, rinfo.address);
          end(callId, false);
        }
      }
      return;
    }

    const method = top.split(" ")[0];
    if (method === "INVITE") return onInvite(req, rinfo, sock);
    if (method === "ACK" && call) { call.acked = true; return; }
    if (method === "BYE" && call) {
      respond(sock, rinfo, req, 200, "OK", { to: call.respTo || req.to + ";tag=" + rand(4) });
      end(call.id, false);
      return;
    }
    if (method === "CANCEL" && call) {
      respond(sock, rinfo, req, 200, "OK");
      respond(sock, rinfo, req, 487, "Request Terminated", { to: call.respTo || req.to });
      end(call.id, false);
      return;
    }
    if (method === "OPTIONS") { respond(sock, rinfo, req, 200, "OK"); return; }
  }

  return {
    type: "sip-phone",
    rooms: [room],
    onSignal,
    onCallOut,

    start() {
      if (!cfg.listenPort) return;                                // 0 → только исходящие звонки
      sipSock = dgram.createSocket("udp4");
      sipSock.on("message", (buf, rinfo) => onDatagram(buf, rinfo, sipSock));
      sipSock.on("error", e => console.warn("[sip-phone] sip:", e.message));
      sipSock.bind(cfg.listenPort, cfg.bindIp || "0.0.0.0", () =>
        console.log(`[sip-phone] SIP-порт ${cfg.listenPort} слушаю — обычные телефоны звонят сюда`));
      void publicIp; void allowFrom;
    },

    onMembers(roomId, ids) {
      if (roomId !== room) return;
      memberIds = ids;
      clearTimeout(graceTimer);
      for (const call of calls.values()) {
        for (const [bid, leg] of call.legs) if (!ids.includes(bid)) { try { leg.pc.close(); } catch {} call.legs.delete(bid); }
        hub.broadcast(room, { type: "call-bridge-mixer", id: call.bridgeId, mixer: ids[0] || null });
      }
      if (!ids.length && calls.size) graceTimer = setTimeout(() => { for (const id of [...calls.keys()]) end(id, true); }, cfg.graceMs ?? 15_000);
    },

    activeCalls: () => [...calls.values()].filter(c => c.announced).map(announce),
    stop() { clearTimeout(graceTimer); for (const id of [...calls.keys()]) end(id, true); try { sipSock?.close(); } catch {} }
  };
}
