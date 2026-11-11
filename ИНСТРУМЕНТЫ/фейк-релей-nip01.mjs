/* ═══════════════════════════════════════════════════════════════════
   ФЕЙК-NOSTR-РЕЛЕЙ NIP-01 — ИНСТРУМЕНТЫ/фейк-релей-nip01.mjs
   Локальный WebSocket-сервер без единой внешней зависимости (RFC 6455
   руками, node:http/crypto): детерминированный стенд для e2e стражей
   связи дома (test_приглашение_22.mjs). Никакой внешней сети —
   «приглашение собирает людей» доказывается на своём порте.

   Говорит NIP-01 ровно настолько, насколько нужно транспорту:
     ["EVENT", ev]  → сохраняет, отвечает ["OK", id, true, ""],
                      рассылает всем подписчикам с матч-фильтром
     ["REQ", subId, ...filters] → реплей стока + ["EOSE", subId]
     ["CLOSE", subId] → подписка снята
   Матч фильтра — канонический NIP-01: kinds, authors, ids, "#x"-теги.
   Подписи событий релей не проверяет (это право настоящих релеев;
   стенд проверяет ПРОВОДКУ дома, а не криптографию Nostr).

   Запуск: import { поднятьФейкРелей } from './фейк-релей-nip01.mjs'
   ═══════════════════════════════════════════════════════════════════ */
import http from 'node:http';
import crypto from 'node:crypto';

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

function матч(фильтр, событие) {
  try {
    if (!фильтр || typeof фильтр !== 'object') return true;
    if (фильтр.ids && !фильтр.ids.some((п) => String(событие.id || '').startsWith(п))) return false;
    if (фильтр.authors && !фильтр.authors.includes(событие.pubkey)) return false;
    if (фильтр.kinds && !фильтр.kinds.includes(событие.kind)) return false;
    for (const ключ of Object.keys(фильтр)) {
      if (!ключ.startsWith('#')) continue;
      const имя = ключ.slice(1);
      const значения = фильтр[ключ];
      const теги = (событие.tags || []).filter((т) => Array.isArray(т) && т[0] === имя).map((т) => т[1]);
      if (!значения.some((з) => теги.includes(з))) return false;
    }
    return true;
  } catch (е) { return false; }
}

export function поднятьФейкРелей(журнал) {
  const сервер = http.createServer((req, res) => { res.writeHead(404); res.end(); });
  привинтитьФейкРелей(сервер, журнал);
  return new Promise((res) => {
    сервер.listen(0, '127.0.0.1', () => {
      res({
        порт: сервер.address().port,
        url: 'ws://127.0.0.1:' + сервер.address().port,
        событий: () => события.size,
        закрыть: () => сервер.close()
      });
    });
  });
}

/* Привинтить релей к ЧУЖОМУ http-серверу: тот же порт, что у статики —
   тогда ws://host:порт входит в CSP 'self' страницы стенда (страница
   дома разрешает connect-src 'self' wss:; чужой порт был бы отрезан). */
export function привинтитьФейкРелей(сервер, журнал) {
  const события = new Map();          /* id → событие (сток на время прогона) */
  const клиенты = new Set();
  let счёт = 0;

  сервер.on('upgrade', (req, сокет) => {
    const ключ = req.headers['sec-websocket-key'];
    if (!ключ) { сокет.destroy(); return; }
    const ответ = crypto.createHash('sha1').update(ключ + WS_GUID).digest('base64');
    сокет.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
      'Sec-WebSocket-Accept: ' + ответ + '\r\n\r\n');
    сокет.setNoDelay(true);
    const клиент = { сокет, буфер: Buffer.alloc(0), фраг: null, подписки: new Map() };
    клиенты.add(клиент);
    if (журнал) журнал('релей: соединение №' + (++счёт));

    function послать(объект) {
      try { сокет.write(кадрТекст(JSON.stringify(объект))); } catch (е) { /* мёртвый сокет не роняет релей */ }
    }
    function рассылать(событие) {
      for (const другой of клиенты) {
        for (const [subId, фильтры] of другой.подписки) {
          if (фильтры.some((ф) => матч(ф, событие))) другой.отправить(["EVENT", subId, событие]);
        }
      }
    }
    клиент.отправить = послать;

    function сообщение(текст) {
      let пачка;
      try { пачка = JSON.parse(текст); } catch (е) { послать(["NOTICE", "плохой json"]); return; }
      if (!Array.isArray(пачка)) { послать(["NOTICE", "не массив"]); return; }
      const тип = пачка[0];
      if (тип === 'EVENT' && пачка[1] && пачка[1].id) {
        const событие = пачка[1];
        события.set(String(событие.id), событие);
        послать(["OK", событие.id, true, ""]);
        рассылать(событие);
      } else if (тип === 'REQ') {
        const subId = String(пачка[1]);
        const фильтры = пачка.slice(2).filter((ф) => ф && typeof ф === 'object');
        клиент.подписки.set(subId, фильтры);
        for (const событие of события.values()) {
          if (фильтры.some((ф) => матч(ф, событие))) послать(["EVENT", subId, событие]);
        }
        послать(["EOSE", subId]);
      } else if (тип === 'CLOSE') {
        клиент.подписки.delete(String(пачка[1]));
      }
    }

    сокет.on('data', (чанк) => {
      клиент.буфер = Buffer.concat([клиент.буфер, чанк]);
      for (;;) {
        const кадр = разобратьКадр(клиент);
        if (!кадр) break;
        if (кадр.op === 0x8) { /* close */
          try { сокет.write(кадрЗакрытие()); } catch (е) {}
          сокет.end(); continue;
        }
        if (кадр.op === 0x9) { try { сокет.write(кадрПонг(кадр.данные)); } catch (е) {} continue; }
        if (кадр.op === 0xA) continue; /* pong */
        if (кадр.op === 0x1 || кадр.op === 0x0) { /* текст/продолжение */
          if (!кадр.fin) { клиент.фраг = клиент.фраг ? Buffer.concat([клиент.фраг, кадр.данные]) : кадр.данные; continue; }
          const весь = кадр.op === 0x0 ? Buffer.concat([(клиент.фраг || Buffer.alloc(0)), кадр.данные]) : кадр.данные;
          клиент.фраг = null;
          сообщение(весь.toString('utf-8'));
        }
        /* бинарные кадры (0x2) стенд молча игнорирует: Nostr едет текстом */
      }
    });
    const закрыть = () => { клиенты.delete(клиент); };
    сокет.on('close', закрыть);
    сокет.on('error', закрыть);
  });

  return { событий: () => события.size };
}

/* ── RFC 6455 кадры ────────────────────────────────────────────────── */
function разобратьКадр(клиент) {
  const б = клиент.буфер;
  if (б.length < 2) return null;
  const fin = (б[0] & 0x80) !== 0;
  const op = б[0] & 0x0f;
  const маскирован = (б[1] & 0x80) !== 0;
  let длина = б[1] & 0x7f;
  let смещ = 2;
  if (длина === 126) { if (б.length < 4) return null; длина = б.readUInt16BE(2); смещ = 4; }
  else if (длина === 127) { if (б.length < 10) return null; длина = Number(б.readBigUInt64BE(2)); смещ = 10; }
  if (!Number.isSafeInteger(длина) || длина > 64 * 1024 * 1024) return null; /* стенду хватит */
  let маска = null;
  if (маскирован) { if (б.length < смещ + 4) return null; маска = б.subarray(смещ, смещ + 4); смещ += 4; }
  if (б.length < смещ + длина) return null;
  let данные = б.subarray(смещ, смещ + длина);
  if (маска) { данные = Buffer.from(данные); for (let i = 0; i < данные.length; i++) данные[i] ^= маска[i % 4]; }
  клиент.буфер = б.subarray(смещ + длина);
  return { fin, op, данные };
}

function кадрТекст(текст) {
  const данные = Buffer.from(текст, 'utf-8');
  const голова = данные.length < 126 ? Buffer.from([0x81, данные.length])
    : Buffer.concat([Buffer.from([0x81, 126]), (() => { const б = Buffer.alloc(2); б.writeUInt16BE(данные.length); return б; })()]);
  return Buffer.concat([голова, данные]); /* сервер не маскирует (RFC 6455 §5.1) */
}

function кадрПонг(полезное) {
  const голова = Buffer.from([0x8A, Math.min(полезное.length, 125)]);
  return Buffer.concat([голова, полезное.subarray(0, 125)]);
}

function кадрЗакрытие() { return Buffer.from([0x88, 0x00]); }
