// Локальный звуковой мост Viber ↔ пространство (точка расширения 0.5).
//
//  У Viber нет публичного Calling API, через который сервер мог бы
//  принять/инициировать звонок и получить RTP. Поэтому единственный
//  реалистичный путь «бабушка звонит в Viber → все в пространстве слышат»:
//
//  1. На выделенном ПК (Windows/macOS/Linux) запущен Viber Desktop.
//  2. Звук звонка Viber направляется в виртуальный кабель
//     (VB-Audio Cable / BlackHole / PulseAudio null-sink).
//  3. Локальный агент (этот мост или отдельный helper) захватывает
//     виртуальный вход, кодирует в Opus и отдаёт в пространство
//     как «участника»-мост. Обратный путь — микшер комнаты → виртуальный
//     микрофон Viber.
//
//  Этот файл — контракт и заготовка. Реальный захват звука требует
//  native helper (или Electron/Tauri-агент) с доступом к WASAPI/CoreAudio/Pulse.
//  Пока мост регистрируется, принимает команды и готов к подключению media.

export function viberAudioBridge(cfg, hub) {
  const room = cfg.room;
  const bridgeId = cfg.bridgeId || "bridge:viber-audio";
  let active = false;
  let agentOnline = false;

  function announce() {
    return {
      type: "call-bridge",
      id: bridgeId,
      name: cfg.displayName || "Viber (ПК-мост)",
      via: "Viber",
      state: active ? "active" : (agentOnline ? "ready" : "offline")
    };
  }

  return {
    type: "viber-audio",
    rooms: [room],

    /**
     * HTTP endpoint для локального агента на ПК.
     * Агент шлёт heartbeat и (позже) RTP/описания.
     * POST /bridge/viber-audio  { "action": "heartbeat" | "start" | "stop", ... }
     */
    http(req, res, url) {
      if (url.pathname !== "/bridge/viber-audio") return false;
      if (req.method !== "POST") return false;

      let body = "";
      req.on("data", c => body += c);
      req.on("end", () => {
        let msg;
        try { msg = JSON.parse(body || "{}"); } catch {
          res.writeHead(400); return res.end("bad json");
        }

        // Простая авторизация по токену
        if (cfg.token && msg.token !== cfg.token) {
          res.writeHead(403); return res.end("forbidden");
        }

        if (msg.action === "heartbeat") {
          agentOnline = true;
          res.writeHead(200, { "content-type": "application/json" });
          res.end(JSON.stringify({ ok: true, room, bridgeId }));
          return;
        }

        if (msg.action === "start") {
          active = true;
          agentOnline = true;
          hub.post(room, {
            name: "Система",
            text: "📞 Viber-мост активен: звук с ПК идёт в пространство",
            via: "Viber"
          });
          hub.broadcast(room, announce());
          res.writeHead(200); res.end("started");
          return;
        }

        if (msg.action === "stop") {
          active = false;
          hub.broadcast(room, { type: "call-bridge-end", id: bridgeId });
          hub.post(room, {
            name: "Система",
            text: "📞 Viber-мост остановлен",
            via: "Viber"
          });
          res.writeHead(200); res.end("stopped");
          return;
        }

        res.writeHead(400); res.end("unknown action");
      });
      return true;
    },

    onSignal(roomId, fromId, to, payload) {
      if (roomId !== room || to !== bridgeId) return;
      // Здесь будет обмен SDP/ICE с локальным агентом, когда media-путь появится.
      console.log("[viber-audio] signal", fromId, payload?.description?.type || "candidate");
    },

    onMembers(roomId, ids) {
      if (roomId !== room) return;
      if (!ids.length && active) {
        // Комната пуста — можно попросить агент остановить захват
        active = false;
        hub.broadcast(room, { type: "call-bridge-end", id: bridgeId });
      }
    },

    activeCalls: () => (active ? [announce()] : []),

    stop() {
      active = false;
      agentOnline = false;
    },

    info: {
      status: "extension-point",
      needs: [
        "Viber Desktop на выделенном ПК",
        "Виртуальный аудиокабель (VB-Cable / BlackHole / PulseAudio)",
        "Локальный агент (захват → Opus → WebSocket/WebRTC в пространство)",
        "Обратный путь: микшер комнаты → виртуальный микрофон Viber"
      ],
      note: "Полноценный media-путь вынесен в отдельный helper. Этот мост только регистрирует участника и принимает команды агента."
    }
  };
}
