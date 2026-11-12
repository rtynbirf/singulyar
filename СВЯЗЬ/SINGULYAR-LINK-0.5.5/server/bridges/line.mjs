// LINE Messaging API ↔ пространство.
// 1) developers.line.biz → Messaging API channel → Channel access token
// 2) Webhook URL: https://СЕРВЕР/bridge/line
// 3) groupId / userId — куда слать исходящие (группа или 1:1)
import crypto from "node:crypto";

const NUDGE = { wait: "✋", ok: "👍", love: "❤️", call: "🔔", urgent: "🆘" };

export function lineBridge(cfg, hub) {
  const push = messages =>
    fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        authorization: `Bearer ${cfg.token}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({ to: cfg.toId, messages })
    }).then(r => r.json()).catch(() => ({}));

  const out = text =>
    push([{ type: "text", text: text.slice(0, 4900) }]);

  const read = (req, limit = 65536) => new Promise((ok, bad) => {
    const chunks = []; let n = 0;
    req.on("data", c => { n += c.length; if (n > limit) { req.destroy(); bad(new Error("big")); } else chunks.push(c); });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", bad);
  });

  return {
    type: "line",
    rooms: [cfg.room],

    http(req, res, url) {
      if (url.pathname !== "/bridge/line" || req.method !== "POST") return false;
      read(req).then(raw => {
        if (cfg.channelSecret) {
          const sig = req.headers["x-line-signature"] || "";
          const want = crypto.createHmac("sha256", cfg.channelSecret).update(raw).digest("base64");
          const a = Buffer.from(sig), b = Buffer.from(want);
          if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            res.writeHead(403); return res.end("bad sig");
          }
        }
        res.writeHead(200); res.end("ok");
        let body;
        try { body = JSON.parse(raw.toString()); } catch { return; }
        for (const ev of body.events || []) {
          if (ev.type !== "message" || ev.message?.type !== "text") continue;
          const name = ev.source?.userId || "LINE";
          hub.post(cfg.room, { name, text: ev.message.text, via: "LINE" });
        }
      }).catch(() => { res.writeHead(400); res.end("bad"); });
      return true;
    },

    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === "LINE") return;
      out(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
    },
    onNudge(room, name, kind) {
      if (room === cfg.room) out(`${name} ${NUDGE[kind] || ""}`);
    }
  };
}
