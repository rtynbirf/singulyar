// Google Chat ↔ пространство (входящий webhook + исходящий webhook URL).
// Входящие: Google Chat app шлёт POST на /bridge/googlechat
// Исходящие: cfg.webhookUrl — Incoming Webhook пространства Google Chat
const NUDGE = { wait: "✋", ok: "👍", love: "❤️", call: "🔔", urgent: "🆘" };

export function googleChatBridge(cfg, hub) {
  const out = text => {
    if (!cfg.webhookUrl) return Promise.resolve();
    return fetch(cfg.webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 3900) })
    }).catch(() => {});
  };

  const read = (req, limit = 65536) => new Promise((ok, bad) => {
    const chunks = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > limit) { req.destroy(); bad(new Error("big")); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", bad);
  });

  return {
    type: "googlechat",
    rooms: [cfg.room],

    http(req, res, url) {
      if (url.pathname !== "/bridge/googlechat" || req.method !== "POST") return false;
      read(req).then(raw => {
        let body;
        try { body = JSON.parse(raw.toString()); } catch {
          res.writeHead(400); return res.end("bad");
        }
        // Google Chat sometimes sends type=ADDED_TO_SPACE etc.
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");

        const msg = body.message;
        if (!msg?.text) return;
        if (msg.sender?.type === "BOT") return;
        const name = msg.sender?.displayName || "Google Chat";
        hub.post(cfg.room, { name, text: msg.text, via: "Google Chat" });
      }).catch(() => { res.writeHead(400); res.end("bad"); });
      return true;
    },

    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === "Google Chat") return;
      out(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
    },
    onNudge(room, name, kind) {
      if (room === cfg.room) out(`${name} ${NUDGE[kind] || ""}`);
    }
  };
}
