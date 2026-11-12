// Универсальный мост: всё, что умеет HTTP (Matrix-бот, n8n, Home Assistant, свой скрипт).
// Входящие:  POST /bridge/webhook?token=...  {"name":"Бабушка","text":"Привет"}
// Исходящие: каждое сообщение пространства уходит POST-ом на cfg.url (JSON).
import crypto from "node:crypto";

export function webhookBridge(cfg, hub) {
  const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  return {
    type: "webhook",
    rooms: [cfg.room],
    http(req, res, url) {
      if (url.pathname !== "/bridge/webhook" || req.method !== "POST") return false;
      if (!same(url.searchParams.get("token") || "", cfg.token)) { res.writeHead(403); res.end("forbidden"); return true; }
      let body = "";
      req.on("data", c => { body += c; if (body.length > 16_384) req.destroy(); });
      req.on("end", () => {
        try {
          const m = JSON.parse(body);
          const ok = hub.post(cfg.room, { name: m.name || cfg.name || "Webhook", text: m.text, via: cfg.via || "Webhook" });
          res.writeHead(ok ? 200 : 400, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: !!ok }));
        } catch { res.writeHead(400); res.end("bad json"); }
      });
      return true;
    },
    onRoomMessage(room, msg) {
      if (!cfg.url || room !== cfg.room || msg.via === (cfg.via || "Webhook")) return;
      fetch(cfg.url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ room, name: msg.name, text: msg.text, kind: msg.kind, at: msg.at }) }).catch(() => {});
    }
  };
}
