// Мост ЗВОНКОВ WhatsApp ↔ пространство (официальный WhatsApp Business Calling API, Cloud API).
//
//  Бабушка звонит на бизнес-номер в WhatsApp → Meta шлёт webhook с WebRTC-предложением (SDP)
//  → мост принимает звонок и становится в пространстве «участником», слышимым всеми.
//  Звук всех участников пространства уходит бабушке одним потоком: его смешивает браузер
//  «ведущего» (первый вошедший), поэтому серверу не нужен аудиокодек — Opus просто пересылается.
//
//  Ограничения: только голос; серверу нужны открытые UDP-порты (см. README, PUBLIC_IP / ICE_PORT_RANGE).
import crypto from "node:crypto";
import { RTCPeerConnection, MediaStreamTrack, RtpPacket, RtpHeader, useOPUS } from "werift";

const sleep = ms => new Promise(r => setTimeout(r, ms));
/* SFU-правило 0.5.1: исходящая труба несёт ОДИН постоянный SSRC (тот, что заявлен в SDP-ответе трека).
   Иначе при смене ведущего приёмник (Meta) получает пакеты с новым SSRC и теряет поток. */
const sdpSsrc = sdp => Number((String(sdp).match(/a=ssrc:(\d+)/) || [])[1]) || 0;
let ssrcSeq = 3_000_000;
const copyRtp = (r, ssrc) => new RtpPacket(new RtpHeader({
  payloadType: r.header.payloadType, sequenceNumber: r.header.sequenceNumber,
  timestamp: r.header.timestamp, marker: r.header.marker, ssrc: ssrc || r.header.ssrc
}), r.payload);

export function whatsappCallBridge(cfg, hub) {
  const room = cfg.room;
  const api = `${cfg.apiBase || "https://graph.facebook.com"}/${cfg.apiVersion || "v23.0"}/${cfg.phoneNumberId}/calls`;
  const calls = new Map(); // callId -> call
  let graceTimer = null;
  let memberIds = [];

  const rtcConfig = () => ({
    codecs: { audio: [useOPUS()], video: [] },
    iceServers: cfg.iceServers || [{ urls: "stun:stun.l.google.com:19302" }],
    ...(cfg.publicIp ? { iceAdditionalHostAddresses: [cfg.publicIp] } : {}),
    ...(cfg.icePortRange ? { icePortRange: cfg.icePortRange } : {}),
    iceUseIpv6: false
  });

  const graph = body => fetch(api, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cfg.accessToken}` },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body })
  }).then(r => r.json()).catch(e => ({ error: String(e) }));

  async function gathered(pc, ms = 3000) {
    const t0 = Date.now();
    while (pc.iceGatheringState !== "complete" && Date.now() - t0 < ms) await sleep(50);
  }
  const mixerId = () => hub.members(room)[0] || null;
  const announce = c => ({ type: "call-bridge", id: c.bridgeId, name: c.name, via: "WhatsApp", mixer: mixerId() });

  /* 0.5.1: кого слушать — решает сервер. Избранный ведущий (первый участник) имеет приоритет,
     но если его труба молчит >1.5 с (Chrome глушит WebAudio фоновой страницы, холодный старт,
     suspended AudioContext) — сервер берёт любую живую трубу ТЕКУЩЕГО участника: звук комнаты
     в миксе каждого одинаков, двойного звука нет, смена ведущего не рвёт звонок. */
  const LIVE_MS = 1500;
  const effMixer = call => {
    const elected = mixerId();
    const now = Date.now();
    const alive = id => { const l = call.legs.get(id); return l && memberIds.includes(id) && l.lastRtp > now - LIVE_MS; };
    if (elected && alive(elected)) return elected;
    let best = null;
    for (const id of memberIds) if (alive(id) && (!best || call.legs.get(id).lastRtp > call.legs.get(best).lastRtp)) best = id;
    return best;
  };

  /* ---------- входящий звонок ---------- */
  async function onConnect(ev, contacts) {
    const callId = ev.id;
    if (calls.has(callId)) return;
    const sdp = ev.session?.sdp;
    if (!sdp) return;
    const name = (contacts || []).find(c => c.wa_id === ev.from)?.profile?.name || ev.from || "WhatsApp";

    const pc = new RTCPeerConnection(rtcConfig());
    const out = new MediaStreamTrack({ kind: "audio" });           // звук комнаты → WhatsApp
    const tr = pc.addTransceiver(out, { direction: "sendrecv" });
    const call = { id: callId, bridgeId: "bridge:" + callId, name: "WhatsApp: " + name, pc, out, legs: new Map(), closed: false };
    calls.set(callId, call);

    // звук WhatsApp → каждому браузеру (SSRC — постоянный для этой ноги)
    tr.onTrack.subscribe(track => track.onReceiveRtp.subscribe(rtp => {
      if (!rtp.header) return;
      for (const leg of call.legs.values()) { try { leg.out.writeRtp(copyRtp(rtp, leg.outSsrc)); } catch {} }
    }));
    pc.connectionStateChange.subscribe(s => { if (["failed", "closed"].includes(s)) end(callId, false); });

    try {
      await pc.setRemoteDescription({ type: "offer", sdp });
      await pc.setLocalDescription(await pc.createAnswer());
      await gathered(pc);
      const answer = pc.localDescription.sdp;
      call.outSsrc = sdpSsrc(answer) || ++ssrcSeq;
      call.rewrite = { seq: (Math.random() * 65535) | 0, ts: 48000 }; // непрерывная рамка RTP на нашей стороне
      await graph({ call_id: callId, action: "pre_accept", session: { sdp_type: "answer", sdp: answer } });
      const r = await graph({ call_id: callId, action: "accept", session: { sdp_type: "answer", sdp: answer } });
      if (r.error) throw new Error(JSON.stringify(r.error));
    } catch (e) {
      console.warn("[whatsapp-call] не удалось принять:", e.message);
      return end(callId, false);
    }
    hub.post(room, { name: "Система", text: `📞 ${name} звонит из WhatsApp — слышит всех в пространстве`, via: "WhatsApp" });
    hub.broadcast(room, announce(call));
  }

  /* ---------- нога «мост ↔ браузер» ---------- */
  async function onSignal(roomId, fromId, to, payload) {
    if (roomId !== room) return;
    const call = [...calls.values()].find(c => c.bridgeId === to);
    if (!call || call.closed) return;
    let leg = call.legs.get(fromId);
    if (!leg) {
      const pc = new RTCPeerConnection(rtcConfig());
      const out = new MediaStreamTrack({ kind: "audio" });          // звук WhatsApp → этот браузер
      const tr = pc.addTransceiver(out, { direction: "sendrecv" });
      leg = { pc, out, pending: [], remoteSet: false, lastRtp: 0 };
      call.legs.set(fromId, leg);
      // звук из браузера → WhatsApp: кого слушать — решает сервер (см. effMixer)
      tr.onTrack.subscribe(track => track.onReceiveRtp.subscribe(rtp => {
        leg.lastRtp = Date.now();
        if (process.env.WA_DBG) console.log("[dbg t=" + Date.now() % 100000 + "] leg RTP от", fromId.slice(0, 8), "| eff =", (effMixer(call) || "тишина").slice(0, 8));
        if (rtp.header && fromId === effMixer(call) && !call.closed) {
          try {
            // SFU-переписка: SSRC постоянный, seq/ts — непрерывные НАШИ, иначе приёмник
            // режет поток как реплей при смене источника (SrtpReplayError)
            const rw = call.rewrite; rw.seq = (rw.seq + 1) & 0xffff; rw.ts += 960;
            call.out.writeRtp(new RtpPacket(new RtpHeader({
              payloadType: rtp.header.payloadType, sequenceNumber: rw.seq,
              timestamp: rw.ts, marker: rtp.header.marker, ssrc: call.outSsrc
            }), rtp.payload));
          } catch (e) { if (process.env.WA_DBG) console.log("[dbg] writeRtp сдох:", e.message); }
        }
      }));
      pc.onIceCandidate.subscribe(cand => { if (cand) hub.sendTo(room, fromId, { type: "signal", from: call.bridgeId, payload: { candidate: cand.toJSON ? cand.toJSON() : cand } }); });
    }
    try {
      if (payload.description) {
        await leg.pc.setRemoteDescription(payload.description);
        leg.remoteSet = true;
        if (payload.description.type === "offer") leg.outSsrc = sdpSsrc(leg.pc.localDescription?.sdp) || leg.outSsrc || ++ssrcSeq;
        for (const c of leg.pending.splice(0)) await leg.pc.addIceCandidate(c).catch(() => {});
        if (payload.description.type === "offer") {
          await leg.pc.setLocalDescription(await leg.pc.createAnswer());
          leg.outSsrc = sdpSsrc(leg.pc.localDescription.sdp) || leg.outSsrc;
          hub.sendTo(room, fromId, { type: "signal", from: call.bridgeId, payload: { description: { type: "answer", sdp: leg.pc.localDescription.sdp } } });
        }
      } else if (payload.candidate) {
        if (leg.remoteSet) await leg.pc.addIceCandidate(payload.candidate).catch(() => {});
        else leg.pending.push(payload.candidate);
      }
    } catch (e) { console.warn("[whatsapp-call] signal:", e.message); }
  }

  /* ---------- завершение ---------- */
  async function end(callId, notifyMeta = true) {
    const call = calls.get(callId);
    if (!call || call.closed) return;
    call.closed = true; calls.delete(callId);
    for (const l of call.legs.values()) { try { await l.pc.close(); } catch {} }
    try { await call.pc.close(); } catch {}
    if (notifyMeta) await graph({ call_id: callId, action: "terminate" });
    hub.broadcast(room, { type: "call-bridge-end", id: call.bridgeId });
    hub.post(room, { name: "Система", text: `📞 ${call.name} — звонок завершён`, via: "WhatsApp" });
  }

  const read = (req, limit = 262_144) => new Promise((ok, bad) => {
    const chunks = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > limit) { req.destroy(); bad(new Error("big")); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", bad);
  });

  return {
    type: "whatsapp-call",
    rooms: [room],

    // Webhook Meta: GET — проверка подписки, POST — события звонков
    http(req, res, url) {
      if (url.pathname !== "/bridge/whatsapp") return false;
      if (req.method === "GET") {
        const ok = url.searchParams.get("hub.mode") === "subscribe" && url.searchParams.get("hub.verify_token") === cfg.verifyToken;
        res.writeHead(ok ? 200 : 403, { "content-type": "text/plain" });
        res.end(ok ? url.searchParams.get("hub.challenge") : "forbidden");
        return true;
      }
      if (req.method !== "POST") return false;
      read(req).then(raw => {
        if (cfg.appSecret) {
          const sig = String(req.headers["x-hub-signature-256"] || "");
          const want = "sha256=" + crypto.createHmac("sha256", cfg.appSecret).update(raw).digest("hex");
          const a = Buffer.from(sig), b = Buffer.from(want);
          if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { res.writeHead(403); return res.end("bad signature"); }
        }
        res.writeHead(200); res.end("ok");              // Meta ждёт быстрый ответ
        let body; try { body = JSON.parse(raw.toString()); } catch { return; }
        for (const entry of body.entry || []) for (const ch of entry.changes || []) {
          const v = ch.value || {};
          for (const ev of v.calls || []) {
            if (ev.event === "connect" && ev.direction !== "BUSINESS_INITIATED") onConnect(ev, v.contacts);
            else if (ev.event === "terminate") end(ev.id, false);
          }
        }
      }).catch(() => { res.writeHead(400); res.end("bad"); });
      return true;
    },

    onSignal,

    // Состав комнаты изменился: выбрать ведущего, убрать ноги ушедших, завершить звонок в пустой комнате
    onMembers(roomId, ids) {
      if (roomId !== room) return;
      memberIds = ids;
      clearTimeout(graceTimer);
      for (const call of calls.values()) {
        for (const [bid, leg] of call.legs) if (!ids.includes(bid)) { try { leg.pc.close(); } catch {} call.legs.delete(bid); }
        if (process.env.WA_DBG) console.log("[dbg t=" + Date.now() % 100000 + "] onMembers:", ids.map(x => x.slice(0, 8)).join(","), "| mixer =", (ids[0] || "нет").slice(0, 8));
        hub.broadcast(room, { type: "call-bridge-mixer", id: call.bridgeId, mixer: ids[0] || null });
      }
      if (!ids.length && calls.size) graceTimer = setTimeout(() => { for (const id of [...calls.keys()]) end(id, true); }, cfg.graceMs ?? 15_000);
    },

    activeCalls: () => [...calls.values()].map(announce),
    stop() { clearTimeout(graceTimer); for (const id of [...calls.keys()]) end(id, false); }
  };
}
