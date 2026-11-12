// Мост Microsoft Teams ↔ пространство (скелет под Graph Calling / Calling Bot).
//
//  Статус 0.5: контракт и точки расширения готовы. Живой Graph Calling Bot
//  требует Azure AD app + Calling Policy + лицензии (Teams Phone / Resource Account).
//  Этот файл принимает webhook от Graph, регистрирует «участника»-мост в комнате
//  и готов принимать/отдавать сигналинг, когда появится реальный media-путь.
//
//  Документация Microsoft:
//  - https://learn.microsoft.com/en-us/graph/api/resources/call
//  - https://learn.microsoft.com/en-us/microsoftteams/platform/bots/calls-and-meetings/calls-meetings-bots-overview
//
//  Ограничения:
//  - Нужен tenant с нужными лицензиями и зарегистрированный Calling Bot.
//  - Media (RTP) обычно идёт через Microsoft media processor; полноценный
//    двусторонний аудиомост потребует либо Media Platform SDK, либо
//    SIP/WebRTC-шлюз (например через Azure Communication Services).
//  - Пока мост работает как «сигнальный + текстовый»: входящие события
//    объявляются в комнате, исходящие сообщения можно слать в чат Teams.

import crypto from "node:crypto";

export function teamsBridge(cfg, hub) {
  const room = cfg.room;
  const calls = new Map(); // callId -> { bridgeId, name, state }
  const graphBase = cfg.apiBase || "https://graph.microsoft.com/v1.0";

  function graph(path, body, method = "POST") {
    return fetch(`${graphBase}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${cfg.accessToken}`
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(r => r.json().catch(() => ({}))).catch(e => ({ error: String(e) }));
  }

  function announce(c) {
    return {
      type: "call-bridge",
      id: c.bridgeId,
      name: c.name,
      via: "Teams",
      state: c.state
    };
  }

  async function onIncomingCall(ev) {
    const callId = ev.id || ev.callId;
    if (!callId || calls.has(callId)) return;

    const name = ev.source?.identity?.user?.displayName
      || ev.from?.displayName
      || "Teams";

    const call = {
      id: callId,
      bridgeId: "bridge:teams:" + callId,
      name: "Teams: " + name,
      state: "incoming"
    };
    calls.set(callId, call);

    hub.post(room, {
      name: "Система",
      text: `📞 Входящий звонок Teams от ${name}. Мост готов к answer (нужен media-путь).`,
      via: "Teams"
    });
    hub.broadcast(room, announce(call));

    // Опциональный авто-answer (только если явно включено и media готов)
    if (cfg.autoAnswer && cfg.mediaReady) {
      // Реальный answer требует callbackUri + mediaConfig по спецификации Graph.
      // Оставляем точку расширения:
      // await graph(`/communications/calls/${callId}/answer`, { ... });
      call.state = "answered";
      hub.broadcast(room, announce(call));
    }
  }

  function onCallEnded(callId) {
    const call = calls.get(callId);
    if (!call) return;
    calls.delete(callId);
    hub.broadcast(room, { type: "call-bridge-end", id: call.bridgeId });
    hub.post(room, {
      name: "Система",
      text: `📞 ${call.name} — звонок Teams завершён`,
      via: "Teams"
    });
  }

  const read = (req, limit = 262_144) => new Promise((ok, bad) => {
    const chunks = []; let n = 0;
    req.on("data", c => {
      n += c.length;
      if (n > limit) { req.destroy(); bad(new Error("big")); }
      else chunks.push(c);
    });
    req.on("end", () => ok(Buffer.concat(chunks)));
    req.on("error", bad);
  });

  return {
    type: "teams",
    rooms: [room],

    /**
     * HTTP endpoint для Graph notifications.
     * Зарегистрируй в Azure: notificationUrl = https://ТВОЙ-СЕРВЕР/bridge/teams
     */
    http(req, res, url) {
      if (url.pathname !== "/bridge/teams") return false;

      // Validation token (Graph subscription handshake)
      if (req.method === "POST" && url.searchParams.has("validationToken")) {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end(url.searchParams.get("validationToken"));
        return true;
      }

      if (req.method !== "POST") return false;

      read(req).then(raw => {
        // Опциональная проверка clientState / подписи
        if (cfg.clientState) {
          // Graph шлёт clientState в теле уведомления — проверяем при необходимости
        }
        res.writeHead(202);
        res.end("accepted");

        let body;
        try { body = JSON.parse(raw.toString()); } catch { return; }

        const values = body.value || [body];
        for (const n of values) {
          const resData = n.resourceData || n;
          const changeType = (n.changeType || "").toLowerCase();
          const state = (resData.state || "").toLowerCase();

          if (changeType === "created" || state === "incoming") {
            onIncomingCall(resData);
          } else if (state === "terminated" || changeType === "deleted") {
            onCallEnded(resData.id || resData.callId);
          }
        }
      }).catch(() => {
        res.writeHead(400);
        res.end("bad");
      });
      return true;
    },

    // Сигналинг из комнаты к мосту (заготовка под media legs)
    onSignal(roomId, fromId, to, payload) {
      if (roomId !== room) return;
      const call = [...calls.values()].find(c => c.bridgeId === to);
      if (!call) return;
      // TODO: когда появится media-путь (ACS / SIP / media processor) —
      // сюда же придёт SDP/ICE между браузером и Teams.
      console.log("[teams] signal from", fromId, "to", to, payload?.description?.type || payload?.candidate ? "candidate" : "?");
    },

    onMembers(roomId, ids) {
      if (roomId !== room) return;
      // При пустой комнате можно завершать активные звонки (когда media будет)
    },

    onRoomMessage(roomId, msg) {
      if (roomId !== room || msg.via === "Teams") return;
      // Исходящее сообщение в Teams-чат (если настроен chatId / conversation)
      if (cfg.chatId && cfg.accessToken) {
        // graph(`/chats/${cfg.chatId}/messages`, { body: { content: `${msg.name}: ${msg.text}` } });
      }
    },

    activeCalls: () => [...calls.values()].map(announce),

    stop() {
      for (const id of [...calls.keys()]) onCallEnded(id);
    },

    // Метаданные для UI / диагностики
    info: {
      status: "skeleton",
      needs: [
        "Azure AD App Registration with Calls.Initiate.All / Calls.AccessMedia.All",
        "Calling Bot registered in Teams Developer Portal",
        "Resource Account + Calling Policy",
        "Public HTTPS notification URL",
        "Media path (ACS or Media Platform) for real audio"
      ]
    }
  };
}
