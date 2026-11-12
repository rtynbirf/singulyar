// СМС-мост: обычный телефон <-> пространство (круг 9, README «0.7.0 — МОСТЫ: СМС — ТЕЛЕФОН»).
// Два честных транспорта:
//   twilio  — входящий webhook с проверкой подписи X-Twilio-Signature
//             (Base64(HMAC-SHA1(AuthToken, полный URL + сортированные POST-поля)) — twilio.com/docs/usage/security),
//             исходящие — REST Messages.json;
//   android — SMS Gateway for Android (docs.sms-gate.app): webhook "sms:received" -> мосту,
//             исходящие — POST /message на телефон; пароль обычный или SHA-256+base64 (passwordHashMode).
// Карта contacts: номер -> имя — дом не показывает людям безликие номера.
// allowFrom — кого пускать (регэксп на номер). Сегментация честная: 3GPP TS 23.038 —
// латиница 160 (сцепка по 153), кириллица/эмодзи UCS-2 70 (сцепка по 67); счёт по КОД-ПОИНТАМ.
import crypto from "node:crypto";

const NUDGE_TEXT = {
  wait: "✋ просит подождать", ok: "👍 понял(а)", love: "❤️ шлёт любовь",
  call: "🔔 просит позвонить", urgent: "🆘 СРОЧНО",
  water: "💧 ВОДА", hurt: "🤕 БОЛИТ", here: "📍 Я ЗДЕСЬ", danger: "⚠️ ОПАСНО"
};
// GSM-7 базовый алфавит + расширение (3GPP TS 23.038 §6.2.1); чего нет — едет UCS-2.
const GSM7 = new Set("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà".split(""));
const GSM7_EXT = new Set("^{}\\[~]|€".split(""));

export function smsEncoding(text) {
  const chars = [...String(text ?? "")];           // КОД-ПОИНТЫ, не UTF-16-единицы
  let ucs2 = false;
  for (let i = 0; i < chars.length; i++) {
    const cp = chars[i].codePointAt(0);
    if (cp > 0xffff) { ucs2 = true; break; }       // астральные (эмодзи) — UCS-2
    if (!GSM7.has(chars[i])) {
      if (GSM7_EXT.has(chars[i])) continue;        // расширение: 2 единицы, но остаёмся в GSM-7
      ucs2 = true; break;
    }
  }
  return ucs2
    ? { encoding: "UCS-2", single: 70, concat: 67 }
    : { encoding: "GSM-7", single: 160, concat: 153 };
}

// Сколько СМС уйдёт (сцепка: первая — single, дальше — concat; для одной — single).
export function smsSegments(text) {
  const { encoding, single, concat } = smsEncoding(text);
  const n = [...String(text ?? "")].length;
  const segments = n <= single ? (n ? 1 : 0) : Math.ceil(n / concat);
  return { encoding, codePoints: n, segments };
}

// Обрезка по КОД-ПОИНТАМ, чтобы не рвать суррогаты (бережёт кошелёк семьи: maxChars).
export function smsClip(text, maxChars) {
  const chars = [...String(text ?? "")];
  return chars.length <= maxChars ? String(text ?? "") : chars.slice(0, maxChars).join("");
}

const same = (a, b) => {
  const x = Buffer.from(String(a ?? "")), y = Buffer.from(String(b ?? ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

// X-Twilio-Signature: Base64(HMAC-SHA1(AuthToken, fullUrl + имена_полей_по_алфавиту + значения_по_алфавиту))
export function twilioSignature(authToken, fullUrl, params) {
  const names = Object.keys(params).sort();
  const data = fullUrl + names.join("") + names.map(k => params[k]).join("");
  return crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf8")).digest("base64");
}

function parseForm(body) {
  const p = new URLSearchParams(body);
  const o = {};
  for (const [k, v] of p) o[k] = v;
  return o;
}

export function smsBridge(cfg, hub) {
  const via = cfg.via || "SMS";
  const maxChars = Number.isFinite(cfg.maxChars) ? Number(cfg.maxChars) : 480;
  const allow = cfg.allowFrom ? new RegExp(cfg.allowFrom) : null;
  const contacts = cfg.contacts && typeof cfg.contacts === "object" ? cfg.contacts : {};
  const numbers = Object.keys(contacts);                       // семья на СМС
  const clip = t => smsClip(t, maxChars);
  const nameOf = num => contacts[num] || num;                  // безликих номеров дом не рисует
  const admitted = num => !allow || allow.test(String(num || ""));

  const sendSms = (to, body) => {
    if (cfg.transport === "android") {
      const user = cfg.user || "";
      const pass = cfg.passwordHashMode === "sha256"
        ? crypto.createHash("sha256").update(String(cfg.password ?? ""), "utf8").digest("base64")
        : String(cfg.password ?? "");
      return fetch(`${(cfg.gatewayUrl || "").replace(/\/$/, "")}/message`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "authorization": "Basic " + Buffer.from(`${user}:${pass}`).toString("base64")
        },
        body: JSON.stringify({ message: body, phoneNumbers: [to] })
      }).then(r => r.ok).catch(() => false);
    }
    // twilio: REST Messages.json, Basic base64(AccountSid:AuthToken), form-urlencoded
    const base = (cfg.apiBase || "https://api.twilio.com").replace(/\/$/, "");
    const form = new URLSearchParams({ To: to, From: cfg.fromNumber || "", Body: body });
    return fetch(`${base}/2010-04-01/Accounts/${cfg.accountSid || ""}/Messages.json`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "authorization": "Basic " + Buffer.from(`${cfg.accountSid || ""}:${cfg.authToken ?? ""}`).toString("base64")
      },
      body: form.toString()
    }).then(r => r.ok).catch(() => false);
  };

  return {
    type: "sms",
    rooms: [cfg.room],
    http(req, res, url) {
      const isTwilio = cfg.transport !== "android" && url.pathname === "/bridge/sms" && req.method === "POST";
      const isAndroid = cfg.transport === "android" && url.pathname === "/bridge/sms-android" && req.method === "POST";
      if (!isTwilio && !isAndroid) return false;
      if (!same(url.searchParams.get("token") || "", cfg.token)) { res.writeHead(403); res.end("forbidden"); return true; }
      let body = "";
      req.on("data", c => { body += c; if (body.length > 16_384) req.destroy(); });
      req.on("end", () => {
        try {
          if (isTwilio) {
            const params = parseForm(body);
            const sig = req.headers["x-twilio-signature"] || "";
            const proto = req.headers["x-forwarded-proto"] || "http";
            const fullUrl = `${proto}://${req.headers.host || "localhost"}${req.url}`;
            const good = twilioSignature(cfg.authToken ?? "", fullUrl, params);
            // подпись сверяем с постоянным сравнением; чужая или отсутствующая — 403
            if (!sig || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) {
              res.writeHead(403); res.end("bad signature"); return;
            }
            const from = params.From || "";
            if (!admitted(from)) { res.writeHead(200); res.end("{}"); return; }   // вне семьи — не проходит
            const ok = !!hub.post(cfg.room, { name: nameOf(from), text: clip(params.Body), via });
            res.writeHead(ok ? 200 : 400, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok }));
          } else {
            const ev = JSON.parse(body || "{}");
            if (ev.event !== "sms:received") { res.writeHead(200); res.end("{}"); return; } // не-то событие — молча
            const p = ev.payload || {};
            const from = p.phoneNumber || "";
            if (!admitted(from)) { res.writeHead(200); res.end("{}"); return; }
            const ok = !!hub.post(cfg.room, { name: nameOf(from), text: clip(p.message), via });
            res.writeHead(ok ? 200 : 400, { "content-type": "application/json" });
            res.end(JSON.stringify({ ok }));
          }
        } catch { res.writeHead(400); res.end("bad request"); }
      });
      return true;
    },
    onRoomMessage(room, msg) {
      if (room !== cfg.room || msg.via === via) return;                        // эхо СМС запрещено
      const line = clip(`${msg.kind === "speech" ? "🎙 " : ""}${msg.name}: ${msg.text}`);
      for (const num of numbers) if (admitted(num)) sendSms(num, line);
    },
    onNudge(room, name, kind) {
      if (room !== cfg.room) return;
      const line = clip(`${name} ${NUDGE_TEXT[kind] || ""}`.trim());
      for (const num of numbers) if (admitted(num)) sendSms(num, line);
    }
  };
}
