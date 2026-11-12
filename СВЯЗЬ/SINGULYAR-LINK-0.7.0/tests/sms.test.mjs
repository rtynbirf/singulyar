// Страж СМС-моста (круг 9): 2 теста, 27 проверок против фальшивых Twilio и шлюза.
// Ровно то, что обещано в README «0.7.0 — МОСТЫ: СМС — ТЕЛЕФОН».
import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import crypto from "node:crypto";
import { WebSocket } from "ws";
import { createApp } from "../server/index.mjs";
import { twilioSignature, smsSegments } from "../server/bridges/sms.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
const ROOM = "FAMILY2026";

function client(port) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const inbox = [];
  ws.on("message", d => inbox.push(JSON.parse(d.toString())));
  const api = {
    ws, inbox,
    open: () => new Promise(r => ws.once("open", r)),
    send: o => ws.send(JSON.stringify(o)),
    until: async (pred, ms = 2000) => {
      const t0 = Date.now();
      while (Date.now() - t0 < ms) { const m = inbox.find(pred); if (m) return m; await wait(15); }
      throw new Error("timeout; inbox=" + JSON.stringify(inbox.map(x => x.type)));
    },
    count: pred => inbox.filter(pred).length
  };
  return api;
}

const post = (port, path, { body, headers = {} }) =>
  fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers, body });

test("СМС-мост Twilio: подпись, чужие, семья, исходящие, сегментация 160·153 и 70·67", async () => {
  // Фальшивый Twilio REST: ловит исходящие Messages.json
  const sent = [];
  const tw = http.createServer((req, res) => {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      sent.push({
        auth: req.headers.authorization || "",
        form: Object.fromEntries(new URLSearchParams(body)),
        path: req.url
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"sid":"SMfake","ok":true}');
    });
  });
  await new Promise(r => tw.listen(0, "127.0.0.1", r));
  const twPort = tw.address().port;

  const cfg = {
    type: "sms", transport: "twilio", room: ROOM, token: "twtok",
    accountSid: "ACxxx", authToken: "AUTHTOKEN", fromNumber: "+70000000000",
    contacts: { "+79001234567": "Бабушка" }, allowFrom: "^\\+7",
    apiBase: `http://127.0.0.1:${twPort}`
  };
  const app = createApp({ bridgesConfig: [cfg] });
  const port = await app.listen(0, "127.0.0.1");
  const a = client(port); await a.open();
  a.send({ type: "join", room: ROOM, name: "Папа" });
  await a.until(m => m.type === "joined");

  const form = new URLSearchParams({ From: "+79001234567", Body: "Купила молока" });
  const url = `/bridge/sms?token=twtok`;
  const fullUrl = `http://127.0.0.1:${port}${url}`;
  const goodSig = twilioSignature("AUTHTOKEN", fullUrl, Object.fromEntries(form));

  // П1: верная подпись принята
  const good = await post(port, url, { body: form.toString(), headers: { "x-twilio-signature": goodSig } });
  assert.equal(good.status, 200);
  const m = await a.until(x => x.type === "chat" && x.msg.via === "SMS");
  // П2: контакты превращают номер в имя; П3: текст дошёл
  assert.equal(m.msg.name, "Бабушка");
  assert.equal(m.msg.text, "Купила молока");

  // П4: чужая подпись -> 403
  const badSig = await post(port, url, {
    body: form.toString(),
    headers: { "x-twilio-signature": twilioSignature("WRONGTOKEN", fullUrl, Object.fromEntries(form)) }
  });
  assert.equal(badSig.status, 403);
  // П5: чужой токен -> 403
  const urlWrong = "/bridge/sms?token=nope";
  const sigWrongUrl = twilioSignature("AUTHTOKEN", `http://127.0.0.1:${port}${urlWrong}`, Object.fromEntries(form));
  const badToken = await post(port, urlWrong, {
    body: form.toString(), headers: { "x-twilio-signature": sigWrongUrl }
  });
  assert.equal(badToken.status, 403);
  // П6: без подписи -> 403
  const noSig = await post(port, url, { body: form.toString() });
  assert.equal(noSig.status, 403);

  // П7: номер вне семьи не проходит (ответ 200, но в комнате тишина)
  const strangerForm = new URLSearchParams({ From: "+33123456789", Body: "bonjour" });
  const strangerSig = twilioSignature("AUTHTOKEN", fullUrl, Object.fromEntries(strangerForm));
  const stranger = await post(port, url, {
    body: strangerForm.toString(), headers: { "x-twilio-signature": strangerSig }
  });
  assert.equal(stranger.status, 200);
  await wait(150);
  assert.equal(a.count(x => x.type === "chat" && x.msg.via === "SMS"), 1);

  // Исходящие: текст, речь, сигналы
  a.send({ type: "chat", text: "Привет, бабушка" });
  a.send({ type: "chat", text: "это сказано голосом", kind: "speech" });
  a.send({ type: "nudge", kind: "call" });
  a.send({ type: "nudge", kind: "water" });
  await wait(400);
  const texts = sent.map(s => s.form.Body);
  // П8-П12
  assert.ok(texts.includes("Папа: Привет, бабушка"), JSON.stringify(texts));
  assert.ok(texts.some(t => t.startsWith("🎙 Папа:")));
  assert.ok(texts.some(t => t.includes("просит позвонить")));
  assert.ok(texts.some(t => t.includes("💧 ВОДА")));
  assert.ok(!texts.some(t => t.includes("Купила молока")), "эхо СМС запрещено");

  // П13: Basic исходящего REST — именно base64(AccountSid:AuthToken)
  assert.equal(sent[0].auth, "Basic " + Buffer.from("ACxxx:AUTHTOKEN").toString("base64"));

  // П14-П16: сегментация честная (3GPP TS 23.038), латиница 160/сцепка 153, кириллица UCS-2 70/сцепка 67
  assert.equal(smsSegments("a".repeat(160)).segments, 1);
  assert.equal(smsSegments("a".repeat(161)).segments, 2);
  assert.equal(smsSegments("б".repeat(71)).segments, 2);

  a.ws.close(); await app.close(); tw.close();
});

test("СМС-мост android-шлюза: события, пароль SHA-256+base64, исходящие, эмодзи по код-поинтам", async () => {
  // Фальшивый SMS Gateway: ловит POST /message
  const out = [];
  const gw = http.createServer((req, res) => {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      out.push({ path: req.url, auth: req.headers.authorization || "", body: body ? JSON.parse(body) : null });
      res.writeHead(200, { "content-type": "application/json" });
      res.end('{"success":true}');
    });
  });
  await new Promise(r => gw.listen(0, "127.0.0.1", r));
  const gwPort = gw.address().port;

  const cfg = {
    type: "sms", transport: "android", room: ROOM, token: "gtok",
    gatewayUrl: `http://127.0.0.1:${gwPort}`, user: "sms", password: "secret",
    passwordHashMode: "sha256",
    contacts: { "+79005556666": "Дедушка" }, allowFrom: "^\\+7"
  };
  const app = createApp({ bridgesConfig: [cfg] });
  const port = await app.listen(0, "127.0.0.1");
  const a = client(port); await a.open();
  a.send({ type: "join", room: ROOM, name: "Внук" });
  await a.until(m => m.type === "joined");

  // П17-П18: не-то событие шлюза молча игнорируется
  const hb = await post(port, "/bridge/sms-android?token=gtok", { body: JSON.stringify({ event: "heartbeat" }) });
  assert.equal(hb.status, 200);
  assert.equal(a.count(x => x.type === "chat" && x.msg.via === "SMS"), 0);

  // П19: чужой токен -> 403
  const badToken = await post(port, "/bridge/sms-android?token=nope", { body: JSON.stringify({ event: "sms:received" }) });
  assert.equal(badToken.status, 403);

  // П20-П21: своё событие проходит, контакты дают имя
  const ok = await post(port, "/bridge/sms-android?token=gtok", {
    body: JSON.stringify({ event: "sms:received", payload: { messageId: 1, phoneNumber: "+79005556666", message: "Позвони мне" } })
  });
  assert.equal(ok.status, 200);
  const m = await a.until(x => x.type === "chat" && x.msg.via === "SMS");
  assert.equal(m.msg.name, "Дедушка");

  // П22: номер вне семьи не проходит
  await post(port, "/bridge/sms-android?token=gtok", {
    body: JSON.stringify({ event: "sms:received", payload: { phoneNumber: "+33123456789", message: "salut" } })
  });
  await wait(150);
  assert.equal(a.count(x => x.type === "chat" && x.msg.via === "SMS"), 1);

  // Исходящее: POST /message на шлюз с SHA-256+base64 паролем
  a.send({ type: "chat", text: "Привет, дедушка" });
  await wait(300);
  // П23-П24: уходит именно /message, номер — массивом phoneNumbers
  const sentMsg = out.find(o => o.path === "/message");
  assert.ok(sentMsg, "исходящее СМС не уехало на шлюз");
  assert.deepEqual(sentMsg.body.phoneNumbers, ["+79005556666"]);
  // П25: Basic-пароль шлюза — именно SHA-256+base64
  const expectSha = "Basic " + Buffer.from("sms:" + crypto.createHash("sha256").update("secret", "utf8").digest("base64")).toString("base64");
  assert.equal(sentMsg.auth, expectSha);

  // П26: эхо СМС запрещено — inbound-текст не возвращается на шлюз
  assert.ok(!out.some(o => JSON.stringify(o.body).includes("Позвони мне")), "эхо СМС запрещено");

  // П27: эмодзи считаются КОД-ПОИНТАМИ (70 -> один сегмент, 70·67)
  assert.equal(smsSegments("💧".repeat(70)).segments, 1);

  a.ws.close(); await app.close(); gw.close();
});
