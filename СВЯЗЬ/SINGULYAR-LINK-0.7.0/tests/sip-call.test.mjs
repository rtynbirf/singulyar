// Страж моста ОБЫЧНОГО ТЕЛЕФОНА (sip-phone): фальшивая АТС/телефон + фальшивый браузер.
// Всё по спецификациям: SIP RFC 3261 (INVITE/100/180/200/ACK/BYE), SDP RFC 3264,
// RTP RFC 3551 (PCMU PT 0), DTMF RFC 4733. Никаких тайминг-угадываний — ждём состояния.
// Запуск: node --test tests/sip-call.test.mjs
import dgram from "node:dgram";
import assert from "node:assert/strict";
import WebSocket from "ws";
import { RTCPeerConnection, MediaStreamTrack, RtpPacket, RtpHeader, usePCMU } from "werift";
import { createApp } from "../server/index.mjs";

const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitUntil = async (fn, ms = 8000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(50); } return await fn(); };
const CRLF = "\r\n";
const ROOM = "SIPTESTROOM1";

/* ---------- минимальный RTP-парсер (как у моста) ---------- */
function rtpHead(buf) {
  if (buf.length < 12 || buf[0] >> 6 !== 2) return null;
  let off = 12 + 4 * (buf[0] & 0x0f);
  if (buf[0] & 0x10) off += 4 + buf.readUInt16BE(off + 2) * 4;
  return { pt: buf[1] & 0x7f, marker: !!(buf[1] & 0x80), seq: buf.readUInt16BE(2), ts: buf.readUInt32BE(4), ssrc: buf.readUInt32BE(8), payload: buf.subarray(off) };
}
const rtpBuf = (pt, seq, ts, ssrc, payload, marker = false) => {
  const h = Buffer.alloc(12); h[0] = 0x80; h[1] = (marker ? 0x80 : 0) | (pt & 0x7f);
  h.writeUInt16BE(seq, 2); h.writeUInt32BE(ts >>> 0, 4); h.writeUInt32BE(ssrc >>> 0, 8);
  return Buffer.concat([h, payload]);
};

/* ---------- фальшивый телефон/АТС: SIP и RTP по одному UDP-сокету ---------- */
class FakePhone {
  constructor() {
    this.sip = []; this.rtp = []; this._waiters = [];
    this.sock = dgram.createSocket("udp4");
    this.sock.on("message", (buf, rinfo) => {
      const s = buf.toString("utf8");
      if (s.startsWith("SIP/2.0") || /^(INVITE|ACK|BYE|CANCEL|OPTIONS|REGISTER)\b/.test(s)) {
        this.sip.push({ s, rinfo }); this._wake();
      } else {
        const r = rtpHead(buf); if (r) { this.rtp.push(r); this._wake(); }
      }
    });
    this.seq = 100; this.ts = 1600;
  }
  listen() { return new Promise(r => this.sock.bind(0, "127.0.0.1", () => r(this.sock.address().port))); }
  send(text, port) { this.sock.send(Buffer.from(text), port, "127.0.0.1"); }
  /* телефон говорит: настоящие PCMU-кадры (G.711 — 160 байт на 20 мс) */
  speak(pt, port, payload, ssrc = 777) {
    this.sock.send(rtpBuf(pt, this.seq++, this.ts += 160, ssrc, payload), port, "127.0.0.1");
  }
  dtmf(pt, port, event) {   // RFC 4733: [event, E|vol, dur lo, dur hi]
    this.sock.send(rtpBuf(pt, this.seq++, this.ts += 160, 777, Buffer.from([event, 0x80, 0x0a, 0x00]), false), port, "127.0.0.1");
  }
  waitSIP(re, ms = 6000) {
    const hit = () => this.sip.find(m => re.test(m.s));
    return waitUntil(hit, ms).then(v => { if (!v) throw new Error("SIP не дождались: " + re); return v.s; });
  }
  waitRTP(pred, ms = 6000) {
    const hit = () => this.rtp.find(pred);
    return waitUntil(hit, ms).then(v => { if (!v) throw new Error("RTP не дождались"); return v; });
  }
  async _wake() { for (const w of this._waiters.splice(0)) w(); }
  close() { try { this.sock.close(); } catch {} }
}

/* ---------- фальшивый браузер: настоящий WS-клиент дома + werift PC (PCMU) ---------- */
function browser(port, name) {
  const B = { msgs: [], calls: new Map(), name };
  return new Promise((res, rej) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    B.ws = ws;
    ws.on("message", raw => {
      const m = JSON.parse(raw.toString());
      if (m.type === "chat") B.msgs.push(m.msg.text);
      if (m.type === "call-bridge") { B.calls.set(m.id, m); if (B.onCall) B.onCall(m); }
      if (m.type === "call-bridge-end") B.calls.delete(m.id);
      if (m.type === "signal" && m.from.startsWith("bridge:")) B.sig?.(m.from, m.payload || {});
      if (m.type === "joined") res(B);
      if (m.type === "error") rej(new Error("сервер: " + m.message));
    });
    ws.on("open", () => ws.send(JSON.stringify({ type: "join", room: ROOM, name })));
  });
}

/* браузер-нога к мосту: offer → answer, звук PCMU в обе стороны */
async function leg(B, bridgeId, sendAudio, ssrc) {
  const pc = new RTCPeerConnection({ codecs: { audio: [usePCMU()], video: [] }, iceUseIpv6: false });
  const out = new MediaStreamTrack({ kind: "audio" });
  const tr = pc.addTransceiver(out, { direction: "sendrecv" });
  let got = 0, lastPayload = null;
  tr.onTrack.subscribe(t => t.onReceiveRtp.subscribe(r => { got++; lastPayload = Buffer.from(r.payload); }));
  B.sig = async (from, payload) => {
    if (from !== bridgeId) return;
    if (payload.description) await pc.setRemoteDescription(payload.description);
    else if (payload.candidate) await pc.addIceCandidate(payload.candidate).catch(() => {});
  };
  await pc.setLocalDescription(await pc.createOffer());
  while (pc.iceGatheringState !== "complete") await sleep(40);
  B.ws.send(JSON.stringify({ type: "signal", to: bridgeId, payload: { description: { type: "offer", sdp: pc.localDescription.sdp } } }));
  await waitUntil(() => pc.connectionState === "connected", 8000);
  assert.equal(pc.connectionState, "connected", "браузер-нога соединилась с мостом");
  let talking = null;
  if (sendAudio) {
    let lsq = 1, lts = 0;                                  // RTP требует непрерывные seq/ts
    talking = setInterval(() => out.writeRtp(new RtpPacket(new RtpHeader({ payloadType: 0, sequenceNumber: lsq++ & 0xffff, timestamp: (lts += 160) >>> 0, marker: false, ssrc }), sendAudio)), 20);
  }
  return { pc, stop: () => { clearInterval(talking); pc.close(); }, stats: () => ({ got, lastPayload }) };
}

/* ---------- поднимаем дом + телефон + мостовую конфигурацию ---------- */
const phone = new FakePhone();
const phonePort = await phone.listen();

const sipProbe = dgram.createSocket("udp4");
const SIPPORT = await new Promise(r => sipProbe.bind(0, "0.0.0.0", () => r(sipProbe.address().port)));
await new Promise(r => sipProbe.close(r));

const app = createApp({ bridgesConfig: [{
  type: "sip-phone", room: ROOM, listenPort: SIPPORT, publicIp: "127.0.0.1",
  rtpStart: 41234, dial: { host: "127.0.0.1", port: phonePort },
  allowFrom: "^[+0-9]+$", graceMs: 600
}] });
const port = await app.listen(0, "127.0.0.1");

const t = (name, fn) => { try { fn(); console.log("ok ", name); } catch (e) { console.error("FAIL", name, e.message); process.exitCode = 1; } };
const chatWait = async (B, re) => (await waitUntil(() => B.msgs.find(x => re.test(x)))) || assert.fail("в чате нет: " + re);

/* ============ 1. входящий звонок: телефон → пространство ============ */
{
  const dad = await browser(port, "Папа");
  const sdpl = p => ["v=0", "o=- 1 1 IN IP4 127.0.0.1", "s=phone", "c=IN IP4 127.0.0.1", "t=0 0",
    `m=audio ${p} RTP/AVP 0 101`, "a=rtpmap:0 PCMU/8000", "a=rtpmap:101 telephone-event/8000", "a=fmtp:101 0-16"].join(CRLF) + CRLF;
  const cid = "phonecall-1";
  phone.send(`INVITE sip:space@127.0.0.1:${SIPPORT} SIP/2.0${CRLF}` +
    `Via: SIP/2.0/UDP 127.0.0.1:${phonePort};branch=z9hG4bK-1${CRLF}` +
    `From: "Бабушка" <sip:+79001234567@127.0.0.1>;tag=phonetag1${CRLF}` +
    `To: <sip:space@127.0.0.1>${CRLF}Call-ID: ${cid}${CRLF}CSeq: 1 INVITE${CRLF}` +
    `Contact: <sip:+79001234567@127.0.0.1:${phonePort}>${CRLF}` +
    `Content-Type: application/sdp${CRLF}Content-Length: ${Buffer.byteLength(sdpl(phonePort))}${CRLF}${CRLF}${sdpl(phonePort)}`, SIPPORT);

  await phone.waitSIP(/^SIP\/2\.0 100 /);
  await phone.waitSIP(/^SIP\/2\.0 180 /);
  const ok200 = await phone.waitSIP(/^SIP\/2\.0 200 /);
  t("входящий: 100 Trying → 180 Ringing → 200 OK", () => {
    assert.match(ok200, /To: <sip:space@127\.0\.0\.1>;tag=/, "200 OK несёт наш тег диалога");
    assert.match(ok200, /a=rtpmap:0 PCMU\/8000/, "в ответе G.711 PCMU/8000");
    assert.match(ok200, /c=IN IP4 127\.0\.0\.1/, "адрес медиа — наш publicIp");
  });
  const m200port = Number(ok200.match(/m=audio (\d+)/)[1]);
  phone.send(`ACK sip:space@127.0.0.1:${SIPPORT} SIP/2.0${CRLF}Via: SIP/2.0/UDP 127.0.0.1:${phonePort};branch=z9hG4bK-2${CRLF}` +
    `From: "Бабушка" <sip:+79001234567@127.0.0.1>;tag=phonetag1${CRLF}` +
    `To: <sip:space@127.0.0.1>;tag=ours${CRLF}Call-ID: ${cid}${CRLF}CSeq: 1 ACK${CRLF}Content-Length: 0${CRLF}${CRLF}`, SIPPORT);

  await waitUntil(() => dad.calls.size === 1, 8000);
  const callId = [...dad.calls.keys()][0];
  t("комната увидела участника-телефон", () => assert.match(dad.calls.get(callId).name, /Телефон: \+79001234567/));

  /* браузер говорит → телефон слышит ТЕ ЖЕ самые G.711-кадры (без перекодирования) */
  const tone = Buffer.alloc(160, 0x35);              // узнаваемый кадр
  const l1 = await leg(dad, callId, tone, 1111);
  const heard = await phone.waitRTP(r => r.pt === 0 && r.payload.length === 160 && r.payload[0] === 0x35);
  t("звук комнаты течёт телефону — те же кадры PCMU насквозь", () => {
    assert.equal(heard.payload[0], 0x35, "кадр дошёл без перекодирования");
  });

  /* телефон говорит → браузер слышит */
  const granuli = Buffer.alloc(160, 0x77);
  phone.speak(0, m200port, granuli);
  await waitUntil(() => l1.stats().got > 0, 8000);
  t("телефон слышен браузеру — кадр дошел целым", () => {
    assert.ok(l1.stats().lastPayload.equals(granuli), "payload 1-в-1");
  });

  /* DTMF: телефон нажимает 5 → дом показывает в чате */
  phone.dtmf(101, m200port, 5);
  await chatWait(dad, /нажал\(а\) «5»/);
  t("DTMF телефона (RFC 4733) пришёл в чат дома", () => {});

  /* телефон кладёт трубку */
  phone.send(`BYE sip:space@127.0.0.1:${SIPPORT} SIP/2.0${CRLF}Via: SIP/2.0/UDP 127.0.0.1:${phonePort};branch=z9hG4bK-9${CRLF}` +
    `From: "Бабушка" <sip:+79001234567@127.0.0.1>;tag=phonetag1${CRLF}` +
    `To: <sip:space@127.0.0.1>;tag=ours${CRLF}Call-ID: ${cid}${CRLF}CSeq: 2 BYE${CRLF}Content-Length: 0${CRLF}${CRLF}`, SIPPORT);
  await phone.waitSIP(/^SIP\/2\.0 200 /);
  await waitUntil(() => dad.calls.size === 0, 6000);
  t("BYE телефона → 200 OK, у участника звонок закрыт", () => {});
  l1.stop(); dad.ws.close();
  await sleep(1200);                                   // дом опустел — мост прощается с АТС
}

/* ============ 2. исходящий звонок: пространство → телефон (кнопка ☎) ============ */
{
  const mom = await browser(port, "Мама");
  mom.ws.send(JSON.stringify({ type: "call-out", number: "89007776655" }));
  const inv = await phone.waitSIP(/^INVITE /);
  t("кнопка ☎: INVITE на номер ушёл АТС", () => {
    assert.match(inv, /^INVITE sip:89007776655@127\.0\.0\.1:\d+ SIP\/2\.0/, "Request-URI — номер");
    assert.match(inv, /a=rtpmap:0 PCMU\/8000/, "предлагаем G.711");
  });
  const mPort = Number(inv.match(/m=audio (\d+)/)[1]);
  const invCid = inv.match(/Call-ID: (.+)\r/)[1];

  phone.send(`SIP/2.0 180 Ringing${CRLF}Via: SIP/2.0/UDP 127.0.0.1:${mPort};branch=z9hG4bK-x${CRLF}` +
    `From: <sip:space@127.0.0.1>;tag=fromtag${CRLF}To: <sip:89007776655@127.0.0.1>;tag=toetag${CRLF}` +
    `Call-ID: ${invCid}${CRLF}CSeq: 1 INVITE${CRLF}Content-Length: 0${CRLF}${CRLF}`, SIPPORT);   // ответы — на SIP-порт моста
  await chatWait(mom, /Набираю 89007776655/);
  t("180 Ringing: в чате «Набираю…»", () => {});

  const sdpl2 = ["v=0", "o=- 9 9 IN IP4 127.0.0.1", "s=ats", "c=IN IP4 127.0.0.1", "t=0 0",
    `m=audio ${phonePort} RTP/AVP 0 101`, "a=rtpmap:0 PCMU/8000", "a=rtpmap:101 telephone-event/8000"].join(CRLF) + CRLF;
  phone.send(`SIP/2.0 200 OK${CRLF}Via: SIP/2.0/UDP 127.0.0.1:${mPort};branch=z9hG4bK-x${CRLF}` +
    `From: <sip:space@127.0.0.1>;tag=fromtag${CRLF}To: <sip:89007776655@127.0.0.1>;tag=toetag${CRLF}` +
    `Call-ID: ${invCid}${CRLF}CSeq: 1 INVITE${CRLF}Content-Type: application/sdp${CRLF}` +
    `Content-Length: ${Buffer.byteLength(sdpl2)}${CRLF}${CRLF}${sdpl2}`, SIPPORT);
  await phone.waitSIP(/^ACK /);
  t("200 OK → мост подтвердил ACK", () => {});

  await chatWait(mom, /Телефон: 89007776655 в разговоре/);
  t("после 200 OK участник-телефон объявлен в комнате", () => {});

  await waitUntil(() => mom.calls.size === 1, 8000);
  const outCall = [...mom.calls.keys()][0];
  const toneOut = Buffer.alloc(160, 0x5a);
  const l2 = await leg(mom, outCall, toneOut, 2222);
  const heardOut = await phone.waitRTP(r => r.pt === 0 && r.payload[0] === 0x5a);
  t("исходящий: голос комнаты течёт телефону (кадр без изменений)", () => assert.equal(heardOut.payload[0], 0x5a));

  phone.speak(0, mPort, Buffer.alloc(160, 0x66), 888);   // аудио телефона — на RTP-порт звонка моста
  await waitUntil(() => l2.stats().got > 0, 8000);
  t("исходящий: телефон слышен комнате", () => {});
  l2.stop();

  /* пустая комната → мост сам кладёт трубку BYE */
  mom.ws.close();
  await phone.waitSIP(/^BYE /);
  t("комната опустела → мост отправил BYE АТС", () => {});
}

/* ============ 3. защита и честные отказы ============ */
{
  const sdplBad = ["v=0", "o=- 1 1 IN IP4 127.0.0.1", "s=phone", "c=IN IP4 127.0.0.1", "t=0 0",
    `m=audio ${phonePort} RTP/AVP 9`, "a=rtpmap:9 G722/8000"].join(CRLF) + CRLF;
  phone.send(`INVITE sip:space@127.0.0.1:${SIPPORT} SIP/2.0${CRLF}` +
    `Via: SIP/2.0/UDP 127.0.0.1:${phonePort};branch=z9hG4bK-b1${CRLF}` +
    `From: <sip:tema-ne-rus@127.0.0.1>;tag=t1${CRLF}To: <sip:space@127.0.0.1>${CRLF}` +
    `Call-ID: bad-1${CRLF}CSeq: 1 INVITE${CRLF}Content-Type: application/sdp${CRLF}` +
    `Content-Length: ${Buffer.byteLength(sdplBad)}${CRLF}${CRLF}${sdplBad}`, SIPPORT);
  await phone.waitSIP(/^SIP\/2\.0 403 /);
  t("чужой номер (не входит в allowFrom) → 403 Forbidden", () => {});

  phone.send(`INVITE sip:space@127.0.0.1:${SIPPORT} SIP/2.0${CRLF}` +
    `Via: SIP/2.0/UDP 127.0.0.1:${phonePort};branch=z9hG4bK-b2${CRLF}` +
    `From: <sip:+79009998877@127.0.0.1>;tag=t2${CRLF}To: <sip:space@127.0.0.1>${CRLF}` +
    `Call-ID: bad-2${CRLF}CSeq: 1 INVITE${CRLF}Content-Type: application/sdp${CRLF}` +
    `Content-Length: ${Buffer.byteLength(sdplBad)}${CRLF}${CRLF}${sdplBad}`, SIPPORT);
  await phone.waitSIP(/^SIP\/2\.0 488 /);
  t("в предложении нет G.711 → 488 Not Acceptable (дом не притворяется)", () => {});
}

phone.close();
await app.close();
console.log(process.exitCode ? "\nSIP-CALL: ЕСТЬ ОШИБКИ" : "\nSIP-CALL: ВСЁ ЗЕЛЁНОЕ");
process.exit(process.exitCode || 0);
