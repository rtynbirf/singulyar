// Mattermost / Rocket.Chat-compatible webhook bridge (текст).
// Входящие: POST /bridge/mattermost  {"username":"...","text":"..."}
// Исходящие: cfg.webhookUrl (Incoming Webhook)
const NUDGE = { wait: "✋", ok: "👍", love: "❤️", call: "🔔", urgent: "🆘" };

export function mattermostBridge(cfg, hub) {
  const via = cfg.via || "Mattermost";
  const out = text => {
    if (!cfg.webhookUrl) return Promise.resolve();
    return fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 3900), username: "СИНГУЛЯР" })
    }).catch(() => {});
  };

  const read = (req, limit = 65536) => new Promise((ok, bad) => {
    const chunks = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > limit) { req.destroy(); bad(new Error("big")); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", bad);
  });

  return {
    type: "mattermost",
    rooms: [cfg.room],

    http(req, res, url) {
      if (url.pathname !== "/bridge/mattermost" || req.method !== "POST") return false;
      if (cfg.token && url.searchParams.get("token") !== cfg.token) {
        res.writeHead(403); res.end("forbidden"); return true;
      }
      read(req).then(raw => {
        let body;
        try { body = JSON.parse(raw.toString()); } catch {
          res.writeHead(400); return res.end("bad");
        }
        res.writeHead(200); res.end("ok");
        const text = body.text || body.message;
        if (!text) return;
        const name = body.username || body.user_name || body.user || via;
        hub.post(cfg.room, { name, text, via });
      }).catch(() => { res.writeHead(400); res.end("bad"); });
      return true;
    },

    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === via) return;
      out(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
    },
    onNudge(room, name, kind) {
      if (room === cfg.room) out(`${name} ${NUDGE[kind] || ""}`);
    }
  };
}
