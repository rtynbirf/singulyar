import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { WebSocketServer } from "ws";
import { loadBridges } from "./bridges/index.mjs";
import { listPlatforms, buildInvitesFromCatalog, catalogMeta } from "./catalog/index.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOM_RE = /^[A-Z0-9_-]{6,32}$/;
/* 0.5.3: сигналы для не-читающих (пиктограммы AAC-практики) — water/hurt/here/danger
   прошли через ту же арену: чистка, лимиты, история. */
const NUDGES = new Set(["wait", "ok", "love", "call", "urgent", "water", "hurt", "here", "danger"]);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml"
};

export function createApp({ publicDir = path.join(HERE, "../public"), env = process.env, bridgesConfig } = {}) {
  const MAX_ROOM = Number(env.MAX_ROOM_SIZE || 12);
  const HISTORY = 60;
  const rooms = new Map();   // id -> { id, members:Map<id,ws>, history:[], touched }
  const clients = new Map(); // ws -> client

  const iceServers = [{ urls: env.STUN_URL || "stun:stun.l.google.com:19302" }];
  if (env.TURN_URL) iceServers.push({ urls: env.TURN_URL.split(","), username: env.TURN_USER, credential: env.TURN_PASS });

  const getRoom = id => {
    let r = rooms.get(id);
    if (!r) { r = { id, members: new Map(), history: [], touched: Date.now() }; rooms.set(id, r); }
    r.touched = Date.now();
    return r;
  };
  const send = (ws, v) => { if (ws.readyState === 1) ws.send(JSON.stringify(v)); };
  const broadcast = (room, v, except = null) => { for (const [id, ws] of room.members) if (id !== except) send(ws, v); };
  const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, n);
  const peerInfo = c => ({ id: c.id, name: c.name, needs: c.needs });
  const normNeeds = n => ({ captions: !!n?.captions, speak: !!n?.speak, large: !!n?.large });

  let bridges = [];
  const hub = {
    members: roomId => [...(rooms.get(roomId)?.members.keys() || [])],
    sendTo(roomId, memberId, v) { const ws = rooms.get(roomId)?.members.get(memberId); if (ws) send(ws, v); },
    broadcast(roomId, v) { const r = rooms.get(roomId); if (r) broadcast(r, v); },
    // Сообщение в комнату (из браузера или из моста)
    post(roomId, { from = null, name, text, kind = "text", via = null }) {
      const room = getRoom(roomId);
      const msg = { id: crypto.randomUUID(), from, name: clean(name, 48) || "Гость", text: clean(text, 2000), kind, via, at: Date.now() };
      if (!msg.text) return null;
      room.history.push(msg);
      if (room.history.length > HISTORY) room.history.shift();
      broadcast(room, { type: "chat", msg });
      for (const b of bridges) { try { b.onRoomMessage?.(roomId, msg); } catch {} }
      return msg;
    }
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Permissions-Policy", "camera=(self), microphone=(self), vibrate=(self)");
    res.setHeader("Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; media-src 'self' blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'");

    if (url.pathname === "/health") {
      res.writeHead(200, { "content-type": MIME[".json"] });
      return res.end(JSON.stringify({ status: "ok", rooms: rooms.size, clients: clients.size }));
    }
    if (url.pathname === "/config") {
      res.writeHead(200, { "content-type": MIME[".json"], "cache-control": "no-store" });
      return res.end(JSON.stringify({ iceServers, bridges: bridges.map(b => b.type) }));
    }
    if (url.pathname === "/api/platforms") {
      res.writeHead(200, { "content-type": MIME[".json"], "cache-control": "no-store" });
      const tier = url.searchParams.get("tier");
      return res.end(JSON.stringify({ meta: catalogMeta(), platforms: listPlatforms(tier ? { tier } : {}) }));
    }
    if (url.pathname === "/api/invites") {
      const room = (url.searchParams.get("room") || "").toUpperCase();
      const name = url.searchParams.get("name") || "семья";
      const base = `${url.protocol}//${url.host}`;
      const joinUrl = `${base}/?room=${encodeURIComponent(room)}`;
      res.writeHead(200, { "content-type": MIME[".json"], "cache-control": "no-store" });
      return res.end(JSON.stringify({ room, joinUrl, invites: buildInvitesFromCatalog({ room, joinUrl, familyName: name }) }));
    }

    for (const b of bridges) { if (b.http?.(req, res, url)) return; }

    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/index.html";
    const file = path.join(publicDir, path.normalize(p));
    if (!file.startsWith(publicDir + path.sep)) { res.writeHead(403); return res.end("Forbidden"); }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404, { "content-type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
      res.writeHead(200, { "content-type": MIME[path.extname(file)] || "application/octet-stream", "cache-control": "no-cache" });
      res.end(data);
    });
  });

  const wss = new WebSocketServer({ noServer: true, maxPayload: 64 * 1024 });
  server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url, "http://x").pathname !== "/ws") return socket.destroy();
    wss.handleUpgrade(req, socket, head, ws => wss.emit("connection", ws));
  });

  const membersChanged = roomId => { const ids = hub.members(roomId); for (const b of bridges) { try { b.onMembers?.(roomId, ids); } catch {} } };

  function leave(ws) {
    const c = clients.get(ws);
    if (!c) return;
    clients.delete(ws);
    const room = c.room && rooms.get(c.room);
    if (room) {
      room.members.delete(c.id);
      room.touched = Date.now();
      broadcast(room, { type: "peer-left", id: c.id, name: c.name });
      membersChanged(c.room);
    }
  }

  wss.on("connection", ws => {
    const c = { id: crypto.randomUUID(), room: null, name: "Гость", needs: normNeeds(), t0: Date.now(), n: 0, chatT0: Date.now(), chatN: 0, alive: true };
    clients.set(ws, c);
    send(ws, { type: "welcome", id: c.id });
    ws.on("pong", () => { c.alive = true; });

    ws.on("message", raw => {
      const now = Date.now();
      if (now - c.t0 > 10_000) { c.t0 = now; c.n = 0; }
      if (++c.n > 400) return ws.close(1008, "rate");
      let m;
      try { m = JSON.parse(raw.toString()); } catch { return send(ws, { type: "error", message: "bad json" }); }
      const room = c.room && rooms.get(c.room);

      switch (m.type) {
        case "join": {
          if (c.room) return send(ws, { type: "error", message: "already joined" });
          const id = clean(m.room, 40).toUpperCase();
          if (!ROOM_RE.test(id)) return send(ws, { type: "error", message: "Неверный код пространства" });
          const r = getRoom(id);
          if (r.members.size >= MAX_ROOM) return send(ws, { type: "error", message: "Пространство заполнено" });
          c.room = id; c.name = clean(m.name, 48) || "Гость"; c.needs = normNeeds(m.needs);
          const peers = [...r.members.keys()].map(pid => peerInfo([...clients.values()].find(x => x.id === pid)));
          r.members.set(c.id, ws);
          send(ws, { type: "joined", room: id, id: c.id, peers, history: r.history, bridges: bridges.map(b => b.type), calls: bridges.flatMap(b => b.activeCalls?.() || []) });
          broadcast(r, { type: "peer-joined", peer: peerInfo(c) }, c.id);
          membersChanged(id);
          return;
        }
        case "profile":
          if (!room) return;
          c.needs = normNeeds(m.needs);
          if (m.name) c.name = clean(m.name, 48) || c.name;
          return broadcast(room, { type: "peer-updated", peer: peerInfo(c) });
        case "signal": {
          if (!room) return;
          const to = String(m.to || "");
          if (to.startsWith("bridge:")) { for (const b of bridges) { try { b.onSignal?.(c.room, c.id, to, m.payload || {}); } catch {} } return; }
          const t = room.members.get(to);
          if (t && t !== ws) send(t, { type: "signal", from: c.id, payload: m.payload });
          return;
        }
        case "chat": {
          if (!room) return;
          if (now - c.chatT0 > 10_000) { c.chatT0 = now; c.chatN = 0; }
          if (++c.chatN > 20) return send(ws, { type: "error", message: "Слишком часто" });
          hub.post(c.room, { from: c.id, name: c.name, text: m.text, kind: m.kind === "speech" ? "speech" : "text" });
          return;
        }
        case "caption":
          if (!room) return;
          return broadcast(room, { type: "caption", from: c.id, name: c.name, text: clean(m.text, 300), final: !!m.final }, c.id);
        case "call-out": {   // 0.5.5: позвонить на обычный телефон (мост sip-phone)
          if (!room) return;
          if (now - c.chatT0 > 10_000) { c.chatT0 = now; c.chatN = 0; }
          if (++c.chatN > 20) return send(ws, { type: "error", message: "Слишком часто" });
          const number = clean(m.number, 24);
          if (!/^[\d*#+,]{2,24}$/.test(number)) return send(ws, { type: "error", message: "Номер не понял: только цифры, +, #, *" });
          for (const b of bridges) { try { b.onCallOut?.(c.room, c.id, { number }); } catch {} }
          return;
        }
        case "nudge": {
          if (!room || !NUDGES.has(m.kind)) return;
          broadcast(room, { type: "nudge", from: c.id, name: c.name, kind: m.kind }, c.id);
          for (const b of bridges) { try { b.onNudge?.(c.room, c.name, m.kind); } catch {} }
          return;
        }
        default:
          return send(ws, { type: "error", message: "unknown type" });
      }
    });
    ws.on("close", () => leave(ws));
    ws.on("error", () => leave(ws));
  });

  const timers = [
    setInterval(() => {
      for (const ws of wss.clients) {
        const c = clients.get(ws);
        if (c && !c.alive) { ws.terminate(); continue; }
        if (c) c.alive = false;
        try { ws.ping(); } catch {}
      }
    }, 25_000),
    setInterval(() => {
      const bound = new Set(bridges.flatMap(b => b.rooms || []));
      for (const [id, r] of rooms) if (!r.members.size && !bound.has(id) && Date.now() - r.touched > 6 * 3600_000) rooms.delete(id);
    }, 600_000)
  ];
  timers.forEach(t => t.unref());

  return {
    server, rooms, hub,
    async listen(port = Number(env.PORT || 8787), host = env.HOST || "0.0.0.0") {
      bridges = await loadBridges({ env, hub, config: bridgesConfig });
      for (const b of bridges) b.start?.();
      await new Promise(r => server.listen(port, host, r));
      return server.address().port;
    },
    async close() {
      timers.forEach(clearInterval);
      for (const b of bridges) b.stop?.();
      for (const ws of wss.clients) ws.terminate();
      await new Promise(r => server.close(r));
    }
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const app = createApp();
  const port = await app.listen();
  console.log(`СИНГУЛЯР · ЕДИНОЕ ОКНО → http://localhost:${port}`);
  console.log(`Для семьи нужен публичный HTTPS-адрес: ./start-public.sh`);
  process.on("SIGINT", async () => { await app.close(); process.exit(0); });
}
