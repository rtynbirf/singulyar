// Сквозная проверка моста звонков WhatsApp: поддельный Meta (Graph API + webhook) + настоящий браузер.
// Запуск: PLAYWRIGHT_PATH=... node tests/wa-call.e2e.mjs
// Движок прогона: SG_ENGINE=chromium|firefox|webkit (по умолчанию chromium — как в CI).
import http from "node:http";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { RTCPeerConnection, MediaStreamTrack, RtpPacket, RtpHeader, useOPUS } from "werift";
import { createApp } from "../server/index.mjs";
const pw = createRequire(import.meta.url)(process.env.PLAYWRIGHT_PATH || "playwright");
const engineName = process.env.SG_ENGINE || "chromium";

const ok = (c, m) => { if (!c) throw new Error("FAIL: " + m); console.log("ok  " + m); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
/* ждём состояние, а не тайминг: страж обязан быть устойчивым на медленной машине */
const waitUntil = async (fn, ms = 10_000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await sleep(100); } return fn(); };
const ROOM = "WACALLTEST1", SECRET = "appsecret";

// --- поддельный Graph API ---
const graphCalls = [];
const graph = http.createServer((req, res) => {
  let b = ""; req.on("data", c => b += c);
  req.on("end", () => { graphCalls.push({ url: req.url, auth: req.headers.authorization, body: JSON.parse(b || "{}") }); res.setHeader("content-type", "application/json"); res.end('{"success":true}'); });
});
await new Promise(r => graph.listen(0, "127.0.0.1", r));

const app = createApp({ bridgesConfig: [{
  type: "whatsapp-call", room: ROOM, phoneNumberId: "PN1", accessToken: "TOKEN", verifyToken: "VERIFY", appSecret: SECRET,
  apiBase: `http://127.0.0.1:${graph.address().port}`, graceMs: 400
}] });
const port = await app.listen(0, "127.0.0.1");
const base = `http://localhost:${port}`;

// --- webhook: проверка подписки ---
ok((await (await fetch(`${base}/bridge/whatsapp?hub.mode=subscribe&hub.verify_token=VERIFY&hub.challenge=777`)).text()) === "777", "webhook: проверка подписки Meta");
ok((await fetch(`${base}/bridge/whatsapp?hub.mode=subscribe&hub.verify_token=bad&hub.challenge=1`)).status === 403, "webhook: чужой verify_token отклонён");
const post = async (obj, secret = SECRET) => {
  const raw = JSON.stringify(obj);
  return fetch(`${base}/bridge/whatsapp`, { method: "POST", body: raw, headers: { "x-hub-signature-256": "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex") } });
};
ok((await post({ entry: [] }, "wrong")).status === 403, "webhook: неверная подпись отклонена");

// --- браузеры ---
const LAUNCH_OPTS = {
  chromium: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", "--autoplay-policy=no-user-gesture-required"] },
  firefox: { firefoxUserPrefs: { "media.navigator.streams.fake": true, "media.navigator.permission.disabled": true } },
  webkit: {}
};
const browser = await pw[engineName].launch(LAUNCH_OPTS[engineName] ?? {});
async function person(name) {
  /* firefox: право на микрофон даёт преф media.navigator.permission.disabled — список permissions не поддерживается */
  const ctx = await browser.newContext(engineName === "firefox" ? {} : { permissions: ["microphone", "camera"] });
  const p = await ctx.newPage(); p.on("pageerror", e => console.log("pageerror", name, e.message));
  await p.goto(`${base}/?r=${ROOM}&t=WA`); await p.fill("#name", name); await p.click("#btnJoin");
  await p.waitForSelector("#view-room:not(.hidden)"); return p;
}
const dad = await person("Папа");              // вошёл первым → ведущий
await dad.click("#btnMic");
const gran = await person("Брат");
await dad.waitForFunction(() => document.querySelectorAll(".peer").length === 2);

// --- «бабушка» звонит из WhatsApp ---
const wa = new RTCPeerConnection({ codecs: { audio: [useOPUS()], video: [] } });
const waOut = new MediaStreamTrack({ kind: "audio" });
const waTr = wa.addTransceiver(waOut, { direction: "sendrecv" });
let waGot = 0; waTr.onTrack.subscribe(t => t.onReceiveRtp.subscribe(() => waGot++));
await wa.setLocalDescription(await wa.createOffer());
while (wa.iceGatheringState !== "complete") await sleep(50);
await post({ entry: [{ changes: [{ value: { contacts: [{ wa_id: "37100000", profile: { name: "Бабушка" } }], calls: [{ id: "wacid.T1", from: "37100000", event: "connect", direction: "USER_INITIATED", session: { sdp_type: "offer", sdp: wa.localDescription.sdp } }] } }] }] });

for (let i = 0; i < 50 && !graphCalls.some(c => c.body.action === "accept"); i++) await sleep(100);
const acc = graphCalls.find(c => c.body.action === "accept");
ok(acc && acc.url === "/v23.0/PN1/calls" && acc.auth === "Bearer TOKEN" && acc.body.call_id === "wacid.T1" && acc.body.session.sdp_type === "answer", "мост принял звонок через Calling API (accept + SDP-ответ)");
ok(graphCalls.some(c => c.body.action === "pre_accept"), "pre_accept отправлен");
await wa.setRemoteDescription({ type: "answer", sdp: acc.body.session.sdp });

// «бабушка» говорит (валидные Opus-кадры тишины)
let seq = 1, ts = 0;
const talk = setInterval(() => waOut.writeRtp(new RtpPacket(new RtpHeader({ payloadType: 111, sequenceNumber: seq++, timestamp: ts += 960, ssrc: 4242 }), Buffer.from([0xf8, 0xff, 0xfe]))), 20);

const stats = p => p.evaluate(async () => {
  const c = [...window.__sg.calls.values()][0]; if (!c) return null;
  let inn = 0, out = 0;
  (await c.pc.getStats()).forEach(r => { if (r.type === "inbound-rtp" && r.kind === "audio") inn = r.packetsReceived; if (r.type === "outbound-rtp" && r.kind === "audio") out = r.packetsSent; });
  return { inn, out };
});
for (const p of [dad, gran]) await p.waitForFunction(() => window.__sg.calls.size === 1, null, { timeout: 8000 });
ok(true, "оба браузера увидели звонок-мост");
ok(await waitUntil(() => waGot > 50), `звук комнаты течёт мосту (Meta получил ${waGot} пакетов)`);
const sd = await stats(dad), sg = await stats(gran);
ok(sd.inn > 20 && sg.inn > 20, `звук WhatsApp дошёл обоим (папа ${sd.inn} пакетов, брат ${sg.inn})`);
ok(sd.out > 20, `ведущий (папа) отдаёт смешанный звук мосту (${sd.out} пакетов)`);
ok(sg.out > 0, "0.5.1: микс-трек присоединён у каждого всегда — труба не рвётся при смене ведущего");
{ const w0 = waGot; await sleep(2000); const pps = (waGot - w0) / 2; ok(pps < 75, `двойного звука нет — сервер берёт микс только от ведущего (${pps.toFixed(0)} пакетов/с, один поток ~50)`); }
ok(waGot > 20, `«бабушка» слышит комнату: Meta-сторона получила ${waGot} RTP-пакетов`);
ok((await dad.textContent("#messages")).includes("Бабушка звонит из WhatsApp"), "в чате: уведомление о звонке");

// --- ведущий уходит → роль переходит брату ---
await dad.click("#btnLeave");
await gran.waitForFunction(() => window.__sg.calls.size === 1 && [...window.__sg.calls.values()][0].mixer === window.__sg.id, null, { timeout: 5000 });
ok(true, "ведущий вышел → ведущим стал брат");
await gran.bringToFront(); // человек смотрит в приложение — как в жизни у последнего живого участника
const before = waGot;       // замер ДО включения микрофона: ждём рост после клика
await gran.click("#btnMic");
ok(await waitUntil(() => waGot > before + 20), "после смены ведущего «бабушка» продолжает слышать комнату");

// --- все ушли → мост завершает звонок в Meta ---
await gran.click("#btnLeave");
for (let i = 0; i < 40 && !graphCalls.some(c => c.body.action === "terminate"); i++) await sleep(100);
ok(graphCalls.some(c => c.body.action === "terminate" && c.body.call_id === "wacid.T1"), "комната пуста → звонок завершён через API");

clearInterval(talk); await browser.close(); await app.close(); graph.close(); wa.close();
console.log("\nWA-CALL E2E: ВСЁ ЗЕЛЁНОЕ"); process.exit(0);
