// Настоящий мост через официальный Bot API Telegram: группа Telegram <-> пространство.
// Бот: @BotFather -> токен; добавить бота в группу; chatId — id группы (отрицательное число).
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NUDGE_TEXT = { wait: "✋ просит подождать", ok: "👍 понял(а)", love: "❤️ шлёт любовь", call: "🔔 просит позвонить", urgent: "🆘 СРОЧНО, нужен ответ" };

export function telegramBridge(cfg, hub) {
  const base = `${cfg.apiBase || "https://api.telegram.org"}/bot${cfg.token}`;
  let offset = 0, stopped = false, ctl = null;
  const call = (method, body, signal) =>
    fetch(`${base}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal }).then(r => r.json());

  async function loop() {
    while (!stopped) {
      try {
        ctl = new AbortController();
        const r = await call("getUpdates", { offset, timeout: cfg.pollSeconds ?? 25, allowed_updates: ["message"] }, ctl.signal);
        if (!r.ok) { await sleep(5000); continue; }
        for (const u of r.result) {
          offset = u.update_id + 1;
          const m = u.message;
          if (!m || String(m.chat?.id) !== String(cfg.chatId)) continue; // только своя группа
          const text = m.text || m.caption;
          if (!text) continue;
          const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(" ") || m.from?.username || "Telegram";
          hub.post(cfg.room, { name, text, via: "Telegram" });
        }
      } catch (e) { if (!stopped) await sleep(5000); }
    }
  }

  const out = text => call("sendMessage", { chat_id: cfg.chatId, text }).catch(() => {});
  return {
    type: "telegram",
    rooms: [cfg.room],
    start() { loop(); },
    stop() { stopped = true; ctl?.abort(); },
    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === "Telegram") return;
      out(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
    },
    onNudge(room, name, kind) { if (room === cfg.room) out(`${name} ${NUDGE_TEXT[kind] || ""}`); }
  };
}
