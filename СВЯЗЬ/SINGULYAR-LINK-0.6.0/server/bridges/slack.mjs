// Slack Bot ↔ пространство (текст + Events API webhook).
// 1) api.slack.com → Create App → Bot Token (chat:write, channels:history)
// 2) Event Subscriptions → Request URL: https://СЕРВЕР/bridge/slack
//    Subscribe: message.channels
// 3) В bridges.json: token (xoxb-...), channelId (C...), signingSecret (опционально)
import crypto from "node:crypto";

const NUDGE = { wait: "✋ просит подождать", ok: "👍", love: "❤️", call: "🔔 просит позвонить", urgent: "🆘 СРОЧНО" };

export function slackBridge(cfg, hub) {
  const api = (method, body) =>
    fetch(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.token}`,
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify(body)
    }).then(r => r.json()).catch(() => ({}));

  const out = text =>
    api("chat.postMessage", { channel: cfg.channelId, text: text.slice(0, 3900) });

  const read = (req, limit = 65536) => new Promise((ok, bad) => {
    const chunks = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > limit) { req.destroy(); bad(new Error("big")); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", bad);
  });

  return {
    type: "slack",
    rooms: [cfg.room],

    http(req, res, url) {
      if (url.pathname !== "/bridge/slack" || req.method !== "POST") return false;
      read(req).then(raw => {
        let body;
        try { body = JSON.parse(raw.toString()); } catch {
          res.writeHead(400); return res.end("bad");
        }
        // URL verification
        if (body.type === "url_verification") {
          res.writeHead(200, { "content-type": "text/plain" });
          return res.end(body.challenge || "");
        }
        // Optional signature
        if (cfg.signingSecret) {
          const ts = req.headers["x-slack-request-timestamp"];
          const sig = req.headers["x-slack-signature"] || "";
          const base = `v0:${ts}:${raw.toString()}`;
          const want = "v0=" + crypto.createHmac("sha256", cfg.signingSecret).update(base).digest("hex");
          const a = Buffer.from(sig), b = Buffer.from(want);
          if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            res.writeHead(403); return res.end("bad sig");
          }
        }
        res.writeHead(200); res.end("ok");

        const ev = body.event;
        if (!ev || ev.type !== "message" || ev.subtype || ev.bot_id) return;
        if (cfg.channelId && String(ev.channel) !== String(cfg.channelId)) return;
        const text = ev.text;
        if (!text) return;
        hub.post(cfg.room, {
          name: ev.user || "Slack",
          text,
          via: "Slack"
        });
      }).catch(() => { res.writeHead(400); res.end("bad"); });
      return true;
    },

    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === "Slack") return;
      out(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
    },
    onNudge(room, name, kind) {
      if (room === cfg.room) out(`${name} ${NUDGE[kind] || ""}`);
    }
  };
}
