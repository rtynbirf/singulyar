// Discord Bot API ↔ пространство (текст).
// 1) Discord Developer Portal → Bot → token, MESSAGE CONTENT Intent
// 2) Пригласи бота на сервер (scopes: bot, applications.commands)
// 3) channelId — id текстового канала (режим разработчика в Discord)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NUDGE = { wait: "✋ просит подождать", ok: "👍", love: "❤️", call: "🔔 просит позвонить", urgent: "🆘 СРОЧНО" };

export function discordBridge(cfg, hub) {
  const base = cfg.apiBase || "https://discord.com/api/v10";
  const headers = () => ({
    authorization: `Bot ${cfg.token}`,
    "content-type": "application/json"
  });
  let stopped = false, cursor = cfg.cursor || null;

  async function api(method, path, body) {
    const r = await fetch(`${base}${path}`, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 429) {
      const j = await r.json().catch(() => ({}));
      await sleep(((j.retry_after || 1) * 1000) + 100);
      return api(method, path, body);
    }
    return r.json().catch(() => ({}));
  }

  // Long-poll через channel messages (без полного Gateway — проще для прототипа)
  async function loop() {
    while (!stopped) {
      try {
        const q = cursor ? `?after=${cursor}&limit=20` : "?limit=5";
        const list = await api("GET", `/channels/${cfg.channelId}/messages${q}`);
        if (Array.isArray(list) && list.length) {
          // Discord отдаёт от новых к старым
          const ordered = [...list].reverse();
          for (const m of ordered) {
            cursor = m.id;
            if (m.author?.bot) continue;
            const text = m.content;
            if (!text) continue;
            const name = m.author?.global_name || m.author?.username || "Discord";
            hub.post(cfg.room, { name, text, via: "Discord" });
          }
        }
        await sleep(cfg.pollMs ?? 2500);
      } catch {
        await sleep(5000);
      }
    }
  }

  const out = text =>
    api("POST", `/channels/${cfg.channelId}/messages`, { content: text.slice(0, 1900) }).catch(() => {});

  return {
    type: "discord",
    rooms: [cfg.room],
    start() { loop(); },
    stop() { stopped = true; },
    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === "Discord") return;
      out(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
    },
    onNudge(room, name, kind) {
      if (room === cfg.room) out(`${name} ${NUDGE[kind] || ""}`);
    }
  };
}
