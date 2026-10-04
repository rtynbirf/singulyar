import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {fileURLToPath} from "node:url";
import {WebSocketServer} from "ws";

/* ═══ SINGULAR SERVER v1 — сервер связей СИНГУЛЯРА (по ТЗ «СОБЫТИЕ / СОВМЕСТНОЕ ПЕНИЕ / ПАМЯТЬ»)
   Метаданные: JSON-файлы с атомарной записью (интерфейс хранилища один — замена на SQLite не переписывает сервер).
   Блобы: data/recordings/{id}/final.webm + manifest.json + participants/p1.webm (структура перемикширования).
   TEMPORARY: expiresAt = now + TTL_TEMP_MS (по умолчанию 7 дней, как в ТЗ). Человек сохраняет → MEMORY.
   GC: при старте и каждые 60 с удаляет просроченные: и метаданные, и блоб — проверяется интеграционным тестом.
   Аудио НИКОГДА не хранится в базе метаданных. Signaling: только события/presence/команды, не живой звук. */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT || 8787);           /* PORT=0 → случайный (для тестов) */
const TTL_TEMP_MS = Number(process.env.TTL_TEMP_MS || 604800000);   /* 7 дней */
const MAX_FINAL_MB = Number(process.env.MAX_FINAL_MB || 60);
const MAX_PART_MB = Number(process.env.MAX_PART_MB || 20);
const TOKEN_TTL_MS = Number(process.env.TOKEN_TTL_MS || 43200000);  /* 12 ч */
const TICKET_TTL_MS = Number(process.env.TICKET_TTL_MS || 30000);   /* 30 с: одноразовый билет на ws */
const CHALLENGE_TTL_MS = 300000;                          /* 5 мин */
const STATIC_EXT = {".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".webmanifest":"application/manifest+json",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".md":"text/markdown; charset=utf-8",".json":"application/json"};
const BOOT = Date.now();

const DATA = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, "data");
const REC_DIR = path.join(DATA, "recordings");
fs.mkdirSync(REC_DIR, {recursive: true});

const read = (f, d) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), "utf8")); } catch { return d; } };
const users = read("users.json", {});          /* id → {id,name,publicKey,createdAt} */
let rel = read("relations.json", []);          /* [{a,b,state,createdAt,updatedAt}] */
const recs = read("recordings.json", {});      /* id → метаданные записи (не аудио) */
const pushes = read("push.json", {});          /* uid → subscription */
const save = (f, x) => { const p = path.join(DATA, f), t = p + ".tmp"; fs.writeFileSync(t, JSON.stringify(x, null, 1)); fs.renameSync(t, p); };

const sessions = new Map();     /* sessionId → {id,host,hallCode,song,participants:Set,startedAt,savePolicy} */
const sockets = new Map();      /* uid → Set<ws> */
const tokens = new Map();       /* token → {uid,exp} */
const tickets = new Map();      /* ticket → {uid,exp} — одноразовый вход в ws (v1.25.1: токен больше не ездит в query) */
const challenges = new Map();   /* uid → {c,exp} */
const inbox = new Map();        /* uid → [{m,exp}] — живые события ждут, пока человек появится (косяк прототипа: сообщение в пустоту) */
const INVITE_TTL_MS = 86400000; /* приглашение живёт сутки — дальше зал неактуален */
const id = () => crypto.randomUUID();
const now = () => Date.now();
const pub = u => ({id: u.id, name: u.name, createdAt: u.createdAt});

function json(res, c, d) {
  res.writeHead(c, {
    "content-type": "application/json", "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization,content-type,x-session-id",
    "access-control-allow-methods": "GET,POST,OPTIONS"
  });
  res.end(JSON.stringify(d));
}
async function body(req, limitMb) {
  const limit = (limitMb || 2) * 1048576;
  const chunks = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > limit) throw new Error("too_large"); chunks.push(c); }
  const buf = Buffer.concat(chunks);
  const ct = (req.headers["content-type"] || "");
  if (ct.includes("application/json")) return JSON.parse(buf.toString("utf8") || "{}");
  return buf; /* бинарный аплоад */
}
function auth(req) {
  const x = (req.headers.authorization || "").replace("Bearer ", ""), a = tokens.get(x);
  return a && a.exp > now() ? a.uid : null;
}
const друзья = uid => rel.filter(r => r.state === "accepted" && (r.a === uid || r.b === uid))
  .map(r => users[r.a === uid ? r.b : r.a]).filter(Boolean).map(pub);
const связь = (a, b) => rel.find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a));
function send(uid, m) { for (const ws of sockets.get(uid) || []) if (ws.readyState === 1) ws.send(JSON.stringify(m)); }
function доставь(uid, m) {
  const открыт = (sockets.get(uid) || []).some(ws => ws.readyState === 1);
  if (открыт) { send(uid, m); return; }
  let q = inbox.get(uid);
  if (!q) inbox.set(uid, q = []);
  q.push({m, exp: now() + INVITE_TTL_MS});
  if (q.length > 20) q.shift();
}
function флашВходящих(uid) {
  const q = inbox.get(uid);
  if (!q) return;
  const живые = q.filter(x => x.exp > now());
  inbox.delete(uid);
  for (const x of живые) send(uid, x.m);
}
async function push(uid, title, bodyText, data = {}) {
  const sub = pushes[uid];
  if (!sub || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  try {
    const mod = await import("web-push").catch(() => null);
    if (!mod) return;
    const webpush = mod.default || mod;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.invalid", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    await webpush.sendNotification(sub, JSON.stringify({title, body: bodyText, data}));
  } catch {}
}
/* ── GC: метаданные + блоб вместе (интеграционный тест CREATE→TEMP→EXPIRE→GC→absent) ── */
function gc() {
  let удалено = 0;
  for (const [rid, r] of Object.entries(recs)) {
    if (r.state === "temporary" && (r.expiresAt || 0) < now()) {
      fs.rmSync(path.join(REC_DIR, rid), {recursive: true, force: true});
      delete recs[rid]; удалено++;
    }
  }
  for (const [t, a] of tokens) if (a.exp < now()) tokens.delete(t);
  for (const [t, a] of tickets) if (a.exp < now()) tickets.delete(t);
  for (const [uid, ch] of challenges) if (ch.exp < now()) challenges.delete(uid);
  if (удалено) save("recordings.json", recs);
  return удалено;
}
setInterval(gc, Number(process.env.GC_INTERVAL_MS || 60000)).unref();

/* ── маршруты ── */
async function route(req, res) {
  const u = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === "OPTIONS") return json(res, 204, {});
  /* статика репозитория для локальной отладки (в проде клиент живёт на Pages/CDN) */
  if (req.method === "GET" && !u.pathname.startsWith("/api/") && u.pathname !== "/health") {
    const relp = decodeURIComponent(u.pathname === "/" ? "/СИНГУЛЯР_19_ЧЕЛОВЕК.html" : u.pathname).replace(/^\/+/, "");
    const file = path.normalize(path.join(ROOT, relp));
    if (file.startsWith(ROOT) && !file.includes(path.join(ROOT, "server")) && !relp.startsWith(".") &&
        STATIC_EXT[path.extname(file).toLowerCase()] && fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, {"content-type": STATIC_EXT[path.extname(file).toLowerCase()]});
      return fs.createReadStream(file).pipe(res);
    }
    return json(res, 404, {error: "not_found"});
  }
  if (req.method === "GET" && u.pathname === "/health") return json(res, 200, {
    ok: true, service: "SINGULAR_SERVER", version: 1, uptime: Math.round((now() - BOOT) / 1000),
    ttlTempMs: TTL_TEMP_MS, users: Object.keys(users).length, relations: rel.filter(r => r.state === "accepted").length,
    recordings: Object.values(recs).filter(r => r.state === "temporary").length, memories: Object.values(recs).filter(r => r.state === "memory").length
  });
  if (req.method === "GET" && u.pathname === "/api/vapid-public") return json(res, 200, {publicKey: process.env.VAPID_PUBLIC_KEY || null});

  /* ── личность: регистрация и подпись вместо пароля ── */
  if (req.method === "POST" && u.pathname === "/api/register") {
    const b = await body(req), name = String(b.name || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!name) return json(res, 400, {error: "name_required"});
    if (!b.publicKey || !b.publicKey.crv || !b.publicKey.x || !b.publicKey.y) return json(res, 400, {error: "ecdsa_jwk_required"});
    let k;
    try { k = crypto.createPublicKey({key: b.publicKey, format: "jwk"}); } catch { return json(res, 400, {error: "bad_public_key"}); }
    if (k.asymmetricKeyType !== "ec") return json(res, 400, {error: "bad_public_key"});
    const uid = id();
    users[uid] = {id: uid, name, publicKey: b.publicKey, createdAt: now()};
    save("users.json", users);
    return json(res, 201, {user: pub(users[uid])});
  }
  if (req.method === "POST" && u.pathname === "/api/auth/challenge") {
    const b = await body(req), x = users[b.userId];
    if (!x) return json(res, 404, {error: "unknown_user"});
    challenges.set(b.userId, {c: crypto.randomBytes(32).toString("base64url"), exp: now() + CHALLENGE_TTL_MS});
    return json(res, 200, {challenge: challenges.get(b.userId).c});
  }
  if (req.method === "POST" && u.pathname === "/api/auth/verify") {
    const b = await body(req), x = users[b.userId], ch = challenges.get(b.userId);
    if (!x || !ch || ch.exp < now()) return json(res, 401, {error: "auth_failed"});
    let ok = false;
    /* WebCrypto (браузер) даёт raw IEEE P1363; DER по умолчанию ловил бы 401 на каждой настоящей подписи */
    try { ok = crypto.verify("sha256", Buffer.from(ch.c), {key: crypto.createPublicKey({key: x.publicKey, format: "jwk"}), dsaEncoding: "ieee-p1363"}, Buffer.from(b.signature, "base64url")); } catch {}
    if (!ok) return json(res, 401, {error: "auth_failed"});
    challenges.delete(b.userId);
    const t = crypto.randomBytes(32).toString("base64url");
    tokens.set(t, {uid: x.id, exp: now() + TOKEN_TTL_MS});
    return json(res, 200, {token: t, user: pub(x)});
  }

  const me = auth(req);
  if (!me) return json(res, 401, {error: "unauthorized"});

  /* v1.25.1 (ревью S1): короткоживущий одноразовый билет на ws-рукопожатие.
     Долгий токен больше не ездит в URL (логи/прокси/истории браузера его копили);
     ticket живёт 30 с, гасится при первом использовании, проверяется и в gc(). */
  if (req.method === "POST" && u.pathname === "/api/ws/ticket") {
    const t = crypto.randomBytes(32).toString("base64url");
    tickets.set(t, {uid: me, exp: now() + TICKET_TTL_MS});
    return json(res, 200, {ticket: t, ttlMs: TICKET_TTL_MS});
  }

  if (req.method === "GET" && u.pathname === "/api/me") {
    const входящие = rel.filter(r => r.state === "pending" && r.b === me).map(r => users[r.a]).filter(Boolean).map(pub);
    const исходящие = rel.filter(r => r.state === "pending" && r.a === me).map(r => users[r.b]).filter(Boolean).map(pub);
    return json(res, 200, {user: pub(users[me]), friends: друзья(me), incoming: входящие, outgoing: исходящие});
  }
  if (req.method === "GET" && u.pathname === "/api/people") {
    const q = (u.searchParams.get("q") || "").toLocaleLowerCase();
    return json(res, 200, {people: Object.values(users).filter(x => x.id !== me && x.name.toLocaleLowerCase().includes(q)).slice(0, 20).map(pub)});
  }
  if (req.method === "POST" && u.pathname === "/api/friends/request") {
    const b = await body(req);
    if (!users[b.userId] || b.userId === me) return json(res, 404, {error: "not_found"});
    let r = связь(me, b.userId);
    if (r && r.state === "blocked") return json(res, 403, {error: "blocked"});
    if (!r) { r = {a: me, b: b.userId, state: "pending", createdAt: now(), updatedAt: now()}; rel.push(r); }
    else { r.state = "pending"; r.a = me; r.b = b.userId; r.updatedAt = now(); }  /* фикс: после remove можно позвать снова */
    save("relations.json", rel);
    доставь(b.userId, {type: "friend_request", from: pub(users[me])});
    push(b.userId, "Новый человек", `${users[me].name} хочет быть в твоих людях.`, {type: "friend"});
    return json(res, 200, {ok: true, state: "pending"});
  }
  if (req.method === "POST" && u.pathname === "/api/friends/accept") {
    const b = await body(req), r = связь(me, b.userId);
    if (!r || r.state !== "pending" || r.b !== me) return json(res, 404, {error: "not_found"});
    r.state = "accepted"; r.updatedAt = now(); save("relations.json", rel);
    send(b.userId, {type: "friend_accepted", user: pub(users[me])});
    return json(res, 200, {ok: true});
  }
  if (req.method === "POST" && u.pathname === "/api/friends/remove") {
    const b = await body(req), r = связь(me, b.userId);
    if (r && r.state !== "removed") { r.state = "removed"; r.updatedAt = now(); save("relations.json", rel); }
    send(b.userId, {type: "friend_removed", userId: me});
    return json(res, 200, {ok: true});
  }
  if (req.method === "POST" && u.pathname === "/api/friends/block") {
    const b = await body(req), r = связь(me, b.userId);
    if (!r) { rel.push({a: me, b: b.userId, state: "blocked", createdAt: now(), updatedAt: now()}); }
    else { r.state = "blocked"; r.updatedAt = now(); }
    save("relations.json", rel);
    return json(res, 200, {ok: true});
  }
  if (req.method === "POST" && u.pathname === "/api/push/subscribe") {
    const b = await body(req); pushes[me] = b.subscription; save("push.json", pushes);
    return json(res, 200, {ok: true});
  }

  /* ── события: пригласить спеть (код зала ·18 внутри приглашения) ── */
  if (req.method === "POST" && u.pathname === "/api/sessions") {
    const b = await body(req);
    const s = {id: id(), host: me, hallCode: String(b.hallCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5),
      song: b.song || null, savePolicy: b.savePolicy === "all" ? "all" : "any", participants: new Set([me]), startedAt: null};
    if (!s.hallCode) return json(res, 400, {error: "hallCode_required"});
    sessions.set(s.id, s);
    for (const x of (b.invitees || [])) {
      if (x === me || !users[x]) continue;
      if (связь(me, x)?.state !== "accepted") continue;
      доставь(x, {type: "sing_invite", sessionId: s.id, from: pub(users[me]), song: s.song, hallCode: s.hallCode});
      push(x, "Позвали спеть", `${users[me].name} зовёт в зал ${s.hallCode}.`, {type: "sing", sessionId: s.id, hallCode: s.hallCode});
    }
    return json(res, 201, {sessionId: s.id, hallCode: s.hallCode, savePolicy: s.savePolicy});
  }
  let m = u.pathname.match(/^\/api\/sessions\/([^/]+)\/(join|leave|start)$/);
  if (req.method === "POST" && m) {
    const s = sessions.get(m[1]);
    if (!s) return json(res, 404, {error: "session_not_found"});
    if (m[2] === "join") {
      if (me !== s.host && связь(me, s.host)?.state !== "accepted") return json(res, 403, {error: "not_friend"});
      s.participants.add(me);
      const p = [...s.participants].map(x => pub(users[x])).filter(Boolean);
      for (const x of s.participants) send(x, {type: "session_update", sessionId: s.id, participants: p});
      return json(res, 200, {ok: true, participants: p});
    }
    if (m[2] === "leave") {
      s.participants.delete(me);
      const p = [...s.participants].map(x => pub(users[x])).filter(Boolean);
      for (const x of s.participants) send(x, {type: "participant_left", sessionId: s.id, participants: p});
      if (!s.participants.size) sessions.delete(s.id);
      return json(res, 200, {ok: true});
    }
    if (m[2] === "start") {
      if (s.host !== me) return json(res, 403, {error: "host_only"});
      const b = await body(req);
      if (b.song) s.song = b.song;
      s.startedAt = now();
      for (const x of s.participants) send(x, {type: "session_started", sessionId: s.id, song: s.song, startedAt: s.startedAt});
      return json(res, 200, {ok: true, startedAt: s.startedAt});
    }
  }

  /* ── записи: финал + участники + манифест; TEMPORARY → MEMORY решает человек ── */
  if (req.method === "POST" && u.pathname === "/api/recordings") {
    const sid = req.headers["x-session-id"], s = sessions.get(sid);
    if (!s || !s.participants.has(me)) return json(res, 403, {error: "forbidden"});
    const buf = await body(req, MAX_FINAL_MB);
    if (!buf || buf.length < 32) return json(res, 400, {error: "empty_recording"});
    const rid = id();
    fs.mkdirSync(path.join(REC_DIR, rid, "participants"), {recursive: true});
    fs.writeFileSync(path.join(REC_DIR, rid, "final.webm"), buf);
    recs[rid] = {id: rid, sessionId: sid, owner: me, state: "temporary", createdAt: now(),
      expiresAt: now() + TTL_TEMP_MS, policy: s.savePolicy, agrees: [], note: null, photo: null};
    save("recordings.json", recs);
    return json(res, 201, {recording: {id: rid, state: "temporary", expiresAt: recs[rid].expiresAt, policy: recs[rid].policy}});
  }
  m = u.pathname.match(/^\/api\/recordings\/([^/]+)\/manifest$/);
  if (req.method === "POST" && m) {
    const r = recs[m[1]];
    if (!r || r.owner !== me) return json(res, 404, {error: "not_found"});
    const b = await body(req, 2);
    fs.writeFileSync(path.join(REC_DIR, r.id, "manifest.json"), JSON.stringify(b, null, 1));
    return json(res, 200, {ok: true});
  }
  m = u.pathname.match(/^\/api\/recordings\/([^/]+)\/participants\/(\d+)$/);
  if (req.method === "POST" && m) {
    const r = recs[m[1]];
    if (!r || r.owner !== me) return json(res, 404, {error: "not_found"});
    const buf = await body(req, MAX_PART_MB);
    if (!buf || buf.length < 32) return json(res, 400, {error: "empty_part"});
    fs.writeFileSync(path.join(REC_DIR, r.id, "participants", `p${m[2]}.webm`), buf);
    return json(res, 200, {ok: true, part: `p${m[2]}.webm`});
  }
  m = u.pathname.match(/^\/api\/recordings\/([^/]+)\/agree$/);
  if (req.method === "POST" && m) {
    const r = recs[m[1]];
    if (!r || !r.agrees) return json(res, 404, {error: "not_found"});
    const s = sessions.get(r.sessionId);
    if (r.policy !== "all" || !s) return json(res, 400, {error: "agreement_not_required"});
    if (!s.participants.has(me)) return json(res, 403, {error: "forbidden"});
    if (!r.agrees.includes(me)) r.agrees.push(me);
    save("recordings.json", recs);
    return json(res, 200, {ok: true, agrees: r.agrees.length, need: s.participants.size});
  }
  m = u.pathname.match(/^\/api\/recordings\/([^/]+)\/save$/);
  if (req.method === "POST" && m) {
    const r = recs[m[1]];
    if (!r) return json(res, 404, {error: "not_found"});
    if (r.owner !== me) return json(res, 403, {error: "only_owner_saves"});  /* policy any: владелец решает */
    if (r.state === "memory") return json(res, 200, {recording: r});
    if (r.policy === "all") {
      const s = sessions.get(r.sessionId);
      const нужно = s ? s.participants.size : 1;
      if ((r.agrees || []).length < нужно) return json(res, 403, {error: "not_everyone_agreed", agrees: (r.agrees || []).length, need: нужно});
    }
    const b = await body(req, 1);
    if (b && b.note) r.note = String(b.note).slice(0, 500);
    if (b && typeof b.photo === "string" && b.photo.startsWith("data:image/") && b.photo.length <= 560000) r.photo = b.photo;
    r.state = "memory"; r.savedAt = now(); delete r.expiresAt;
    save("recordings.json", recs);
    return json(res, 200, {recording: {id: r.id, state: "memory", savedAt: r.savedAt, note: r.note || null}});
  }
  m = u.pathname.match(/^\/api\/recordings\/([^/]+)$/);
  if (req.method === "GET" && m) {
    const r = recs[m[1]];
    if (!r || r.state !== "memory") return json(res, 404, {error: "not_available"});
    const f = path.join(REC_DIR, r.id, "final.webm");
    if (!fs.existsSync(f)) return json(res, 404, {error: "missing"});
    res.writeHead(200, {"content-type": "audio/webm", "cache-control": "private"});
    return fs.createReadStream(f).pipe(res);
  }
  if (req.method === "GET" && u.pathname === "/api/memories") {
    const list = Object.values(recs).filter(r => r.state === "memory" && r.owner === me)
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
      .map(r => ({id: r.id, savedAt: r.savedAt, note: r.note, photo: r.photo ? true : false, sessionId: r.sessionId}));
    return json(res, 200, {memories: list});
  }
  json(res, 404, {error: "not_found"});
}

const server = http.createServer((req, res) => route(req, res).catch(e => {
  console.error(new Date().toISOString(), e.message);
  if (!res.headersSent) json(res, e.message === "too_large" ? 413 : 500, {error: e.message === "too_large" ? "too_large" : "server_error"});
}));

const wss = new WebSocketServer({noServer: true});
server.on("upgrade", (req, socket, head) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  /* v1.25.1 (ревью S1): только одноразовый ticket — путь /ws?token= закрыт НАВСЕГДА */
  const tk = u.searchParams.get("ticket") || "";
  const a = tickets.get(tk);
  if (u.pathname !== "/ws" || !a) { if (tk) tickets.delete(tk); return socket.destroy(); }
  if (a.exp < now()) { tickets.delete(tk); return socket.destroy(); }
  tickets.delete(tk);   /* одноразовость: второй раз тот же ticket не впустит */
  wss.handleUpgrade(req, socket, head, ws => {
    const uid = a.uid;
    let set = sockets.get(uid);
    if (!set) sockets.set(uid, set = new Set());
    set.add(ws);
    флашВходящих(uid);
    send(uid, {type: "presence", userId: uid, online: true});
    ws.on("message", raw => {
      let msg;
      try { msg = JSON.parse(raw); } catch { return; }
      const s = sessions.get(msg.sessionId);
      if (!s || !s.participants.has(uid)) return;
      if (["offer", "answer", "ice"].includes(msg.type) && s.participants.has(msg.to)) send(msg.to, {...msg, from: uid});
    });
    ws.on("close", () => { set.delete(ws); if (!set.size) sockets.delete(uid); send(uid, {type: "presence", userId: uid, online: false}); });
  });
});

gc();
server.listen(PORT, () => {
  const addr = server.address();
  console.log(`SINGULAR_SERVER v1: http://localhost:${addr.port} · TTL временных записей: ${Math.round(TTL_TEMP_MS / 86400000)} дн.`);
});
