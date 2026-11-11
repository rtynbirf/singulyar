import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket } from "ws";
import { createApp } from "../server/index.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
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
    }
  };
  return api;
}
const ROOM = "FAMILY2026";

test("комната: вход, участники, чат, история, профиль, сигналы", async () => {
  const app = createApp({ bridgesConfig: [] });
  const port = await app.listen(0, "127.0.0.1");
  const a = client(port), b = client(port);
  await a.open(); await b.open();
  a.send({ type: "join", room: ROOM, name: "Папа", needs: {} });
  const ja = await a.until(m => m.type === "joined");
  assert.equal(ja.peers.length, 0);
  b.send({ type: "join", room: ROOM, name: "Бабушка", needs: { captions: true, speak: true } });
  const jb = await b.until(m => m.type === "joined");
  assert.equal(jb.peers.length, 1);
  assert.equal(jb.peers[0].name, "Папа");
  const pj = await a.until(m => m.type === "peer-joined");
  assert.equal(pj.peer.needs.captions, true);   // Папа знает: бабушке нужны субтитры

  a.send({ type: "chat", text: "Привет всем" });
  const c1 = await b.until(m => m.type === "chat");
  assert.equal(c1.msg.text, "Привет всем");
  await a.until(m => m.type === "chat");         // эхо отправителю

  const c = client(port); await c.open();
  c.send({ type: "join", room: ROOM, name: "Дочь" });
  const jc = await c.until(m => m.type === "joined");
  assert.equal(jc.history.length, 1);            // опоздавший видит историю

  a.send({ type: "caption", text: "говорю вслух", final: false });
  assert.equal((await b.until(m => m.type === "caption")).text, "говорю вслух");

  a.send({ type: "nudge", kind: "call" });
  assert.equal((await b.until(m => m.type === "nudge")).kind, "call");
  a.send({ type: "nudge", kind: "evil" });       // неизвестный сигнал игнорируется
  await wait(80);
  assert.equal(b.inbox.filter(m => m.type === "nudge").length, 1);

  // 0.5.3: пиктограммы не-читающим (AAC-практика) идут через ту же арену
  a.send({ type: "nudge", kind: "water" });
  assert.equal((await b.until(m => m.type === "nudge" && m.kind === "water")).kind, "water");
  a.send({ type: "nudge", kind: "danger" });
  assert.equal((await b.until(m => m.type === "nudge" && m.kind === "danger")).kind, "danger");

  b.send({ type: "profile", needs: { large: true } });
  assert.equal((await a.until(m => m.type === "peer-updated")).peer.needs.large, true);

  a.send({ type: "signal", to: jb.id, payload: { description: { type: "offer", sdp: "x" } } });
  const sg = await b.until(m => m.type === "signal");
  assert.equal(sg.from, ja.id);

  c.send({ type: "signal", to: "нет-такого", payload: {} });  // не падает
  b.ws.close();
  assert.equal((await a.until(m => m.type === "peer-left")).name, "Бабушка");
  for (const x of [a, c]) x.ws.close();
  await app.close();
});

test("защита: плохой код, лимиты, XSS-имя, кривой JSON, заголовки", async () => {
  const app = createApp({ bridgesConfig: [], env: { MAX_ROOM_SIZE: "2" } });
  const port = await app.listen(0, "127.0.0.1");
  const a = client(port); await a.open();
  a.send({ type: "join", room: "x" });
  assert.match((await a.until(m => m.type === "error")).message, /код/i);
  a.ws.send("{not json");
  await a.until(m => m.type === "error" && m.message === "bad json");
  a.send({ type: "join", room: ROOM, name: "<img src=x onerror=1>" });
  await a.until(m => m.type === "joined");
  const b = client(port), c = client(port); await b.open(); await c.open();
  b.send({ type: "join", room: ROOM }); await b.until(m => m.type === "joined");
  c.send({ type: "join", room: ROOM });
  assert.match((await c.until(m => m.type === "error")).message, /заполнено/);
  for (let i = 0; i < 25; i++) a.send({ type: "chat", text: "spam" + i });
  await a.until(m => m.type === "error" && /часто/.test(m.message));
  const res = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("referrer-policy"), "no-referrer");
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  assert.equal((await fetch(`http://127.0.0.1:${port}/..%2f..%2fpackage.json`)).status, 404);
  const cfg = await (await fetch(`http://127.0.0.1:${port}/config`)).json();
  assert.ok(cfg.iceServers.length >= 1);
  for (const x of [a, b, c]) x.ws.close();
  await app.close();
});

test("TURN из переменных окружения попадает в /config", async () => {
  const app = createApp({ bridgesConfig: [], env: { TURN_URL: "turn:t.example:3478,turns:t.example:5349", TURN_USER: "u", TURN_PASS: "p" } });
  const port = await app.listen(0, "127.0.0.1");
  const cfg = await (await fetch(`http://127.0.0.1:${port}/config`)).json();
  assert.equal(cfg.iceServers[1].username, "u");
  assert.equal(cfg.iceServers[1].urls.length, 2);
  await app.close();
});

test("мост Telegram: группа ↔ пространство (против поддельного Bot API)", async () => {
  const sent = []; let delivered = false;
  const tg = http.createServer((req, res) => {
    let body = ""; req.on("data", c => body += c);
    req.on("end", () => {
      const json = JSON.parse(body || "{}");
      res.setHeader("content-type", "application/json");
      if (req.url.endsWith("/getUpdates")) {
        if (!delivered) {
          delivered = true;
          return res.end(JSON.stringify({ ok: true, result: [
            { update_id: 1, message: { chat: { id: -100 }, from: { first_name: "Мама" }, text: "Привет из Telegram" } },
            { update_id: 2, message: { chat: { id: -999 }, from: { first_name: "Чужой" }, text: "не из нашей группы" } }
          ] }));
        }
        return setTimeout(() => res.end(JSON.stringify({ ok: true, result: [] })), 150);
      }
      if (req.url.endsWith("/sendMessage")) { sent.push(json); return res.end('{"ok":true}'); }
      res.end('{"ok":false}');
    });
  });
  await new Promise(r => tg.listen(0, "127.0.0.1", r));
  const app = createApp({ bridgesConfig: [{ type: "telegram", token: "T", chatId: "-100", room: ROOM, apiBase: `http://127.0.0.1:${tg.address().port}`, pollSeconds: 1 }] });
  const port = await app.listen(0, "127.0.0.1");
  const a = client(port); await a.open();
  a.send({ type: "join", room: ROOM, name: "Папа" });
  const j = await a.until(m => m.type === "joined");
  assert.deepEqual(j.bridges, ["telegram"]);
  // входящее из Telegram (history или живое)
  const inTg = j.history.find(h => h.via === "Telegram") || (await a.until(m => m.type === "chat" && m.msg.via === "Telegram")).msg;
  assert.equal(inTg.name, "Мама");
  assert.ok(![...j.history, ...a.inbox.filter(m => m.type === "chat").map(m => m.msg)].some(h => h.text.includes("не из нашей")));
  // исходящее в Telegram: текст, речь, сигнал
  a.send({ type: "chat", text: "Привет, мама" });
  a.send({ type: "chat", text: "это сказано голосом", kind: "speech" });
  a.send({ type: "nudge", kind: "call" });
  await wait(300);
  const texts = sent.map(s => s.text);
  assert.ok(texts.includes("Папа: Привет, мама"), JSON.stringify(texts));
  assert.ok(texts.includes("🎙 Папа: это сказано голосом"));
  assert.ok(texts.some(t => t.includes("просит позвонить")));
  assert.ok(!texts.some(t => t.includes("Привет из Telegram")), "эхо в Telegram запрещено");
  a.ws.close(); await app.close(); tg.close();
});

test("мост webhook: вход по токену, чужой токен отклонён", async () => {
  const app = createApp({ bridgesConfig: [{ type: "webhook", room: ROOM, token: "sekret", via: "Matrix" }] });
  const port = await app.listen(0, "127.0.0.1");
  const a = client(port); await a.open();
  a.send({ type: "join", room: ROOM, name: "Папа" });
  await a.until(m => m.type === "joined");
  const bad = await fetch(`http://127.0.0.1:${port}/bridge/webhook?token=nope`, { method: "POST", body: "{}" });
  assert.equal(bad.status, 403);
  const ok = await fetch(`http://127.0.0.1:${port}/bridge/webhook?token=sekret`, { method: "POST", body: JSON.stringify({ name: "Тётя", text: "из Matrix" }) });
  assert.equal(ok.status, 200);
  const m = await a.until(m => m.type === "chat");
  assert.equal(m.msg.via, "Matrix");
  a.ws.close(); await app.close();
});
