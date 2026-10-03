/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · КРИСТАЛЛ — КРИПТА (E2EE-слой), v1.0.0
   ───────────────────────────────────────────────────────────────────
   НЕНОРМАТИВНЫЙ файл: потребители контракта, а не его часть.
   Ядро (crystal-core.mjs), журнал (journal.mjs) и схема не тронуты.

   Задача (правило дома): тёрки в зале остаются в зале. Смысл текста
   запечатывается ДО провода и ДО журнала — транспорт и хранение видят
   только шифровку. «Я, ты и вся Европа» → Европа видит шум.

   Математика (всё — стандартный WebCrypto, без самоделок):
     • ключ зала: PBKDF2-SHA256 (210 000 итераций) из парольной фразы,
       соль = SHA-256('singulyar-hall-v1:' + код зала) → AES-GCM-256;
       одинаковая фраза у своих = одинаковый ключ (kid совпадает);
     • запечатывание: AES-GCM (256), свежий 96-битный IV на каждое
       сообщение; kid = отпечаток ключа (первые 16 hex);
     • личность: ECDH P-256 (секрет пары) + ECDSA P-256 (подпись);
       приватные ключи non-extractable — экспортировать их нельзя даже
       случайно; наружу идут только публичные JWK;
     • цепь журнала (tamper-evident, «мини-блокчейн» честно названный):
       каждое звено = SHA-256(предыдущий хэш + факт события). Проверяемая
       печать от подделки истории — НЕ распределённый блокчейн:
       без сервера он не нужен и притворяться им мы не будем.

   Правила дома:
     • ключ зала живёт ТОЛЬКО в памяти вкладки: не localStorage, не
       IndexedDB, не файлы, не провод. Перезагрузил вкладку — введи
       фразу снова (это не баг: это цена настоящей приватности);
     • фраза не ходит по проводу вообще — только изо рта в ухо, как и
       код зала;
     • у кого нет ключа — тот видит честное «запечатано», а не пустоту;
     • падение WebCrypto = честный флаг ДОСТУПНО=false с причиной:
       модули работают без крипты как раньше (fallback наблюдаемый).

   Честные границы v1.0.0 (не притворяемся):
     • голосовые/файлы едут как раньше (запечатан только текст);
     • ротация ключей и верификация личности через ·19 — следующий шаг;
     • UI-журнал ·22 у участника хранит вскрытый текст на его же
       устройстве (тот же домен безопасности, что и экран). Канонический
       журнал кристалла хранит ТОЛЬКО шифровку.
   ═══════════════════════════════════════════════════════════════════ */

export const КРИПТА = Object.freeze({ name: 'singulyar-crystal-crypto', version: '1.0.0' });

const СУБ = (globalThis.crypto && globalThis.crypto.subtle) ? globalThis.crypto.subtle : null;
export const ДОСТУПНО = !!СУБ;
export const ПРИЧИНА = ДОСТУПНО ? '' : 'WebCrypto недоступен в этой среде';

export const ИТЕРАЦИИ = 210000;
const ДОМЕН_ЗАЛА = 'singulyar-hall-v1';
const КОДЕР = new TextEncoder();
const РАЗДЕЛ = new TextDecoder();

/* ── кодировки: байты ↔ base64/hex (для провода JSON) ── */
function б64(буфер) {
  const б = new Uint8Array(буфер); let с = '';
  for (let i = 0; i < б.length; i++) с += String.fromCharCode(б[i]);
  return btoa(с);
}
function б64обр(строка) {
  const с = atob(String(строка || ''));
  const б = new Uint8Array(с.length);
  for (let i = 0; i < с.length; i++) б[i] = с.charCodeAt(i);
  return б;
}
function б16(буфер) {
  const б = new Uint8Array(буфер); let с = '';
  for (let i = 0; i < б.length; i++) с += ('0' + б[i].toString(16)).slice(-2);
  return с;
}

function гарантия() {
  if (!ДОСТУПНО) throw new Error('КРИПТА: ' + ПРИЧИНА);
}

/* ── ключ зала: фраза → PBKDF2 → AES-GCM-256 ──
   Соль детерминирована от кода зала (она не секрет — код и так общий),
   секрет — сама фраза. Одинаковая фраза = одинаковый ключ и kid. */
export async function ключИзФразы(фраза, кодЗала) {
  гарантия();
  const ф = String(фраза == null ? '' : фраза);
  if (!ф) throw new Error('КРИПТА: пустая фраза — ключ не из чего вывести');
  const соль = await СУБ.digest('SHA-256', КОДЕР.encode(ДОМЕН_ЗАЛА + ':' + String(кодЗала == null ? '' : кодЗала)));
  const база = await СУБ.importKey('raw', КОДЕР.encode(ф), 'PBKDF2', false, ['deriveKey']);
  const ключ = await СУБ.deriveKey(
    { name: 'PBKDF2', salt: соль, iterations: ИТЕРАЦИИ, hash: 'SHA-256' },
    база, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  const отпечаток = await СУБ.digest('SHA-256', КОДЕР.encode(ДОМЕН_ЗАЛА + ':' + String(кодЗала == null ? '' : кодЗала) + ':' + ф));
  return { ключ: ключ, kid: б16(отпечаток).slice(0, 16), алг: 'A256GCM', итерации: ИТЕРАЦИИ };
}

/* ── запечатать: AES-GCM, свежий IV на каждое сообщение ──
   Возвращает печать (JSON-легальную для провода и журнала). */
export async function запечатай(текст, ключ, kid) {
  гарантия();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const шф = await СУБ.encrypt({ name: 'AES-GCM', iv: iv }, ключ, КОДЕР.encode(String(текст == null ? '' : текст)));
  return Object.freeze({ v: 1, alg: 'A256GCM', iv: б64(iv), ct: б64(шф), kid: String(kid == null ? '' : kid) });
}

/* ── вскрыть: чужой ключ или подделка = честная ошибка, не пустота ── */
export async function вскрой(печать, ключ) {
  гарантия();
  const п = печать || {};
  if (п.alg !== 'A256GCM' || !п.iv || !п.ct) throw new Error('КРИПТА: печать не той формы');
  try {
    const б = await СУБ.decrypt({ name: 'AES-GCM', iv: б64обр(п.iv) }, ключ, б64обр(п.ct));
    return РАЗДЕЛ.decode(б);
  } catch (е) {
    throw new Error('КРИПТА: не вскрылось — чужой ключ или шифровка подделана');
  }
}

/* ── личность: ECDH (секрет пары) + ECDSA (подпись) ──
   Приватные ключи non-extractable: наружу — только публичные JWK. */
export async function создайПару() {
  гарантия();
  const обмен = await СУБ.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
  /* usages ['sign','verify']: спецификация пересекает их по ключам пары —
     приватный получит sign, публичный verify (иначе у публичного пустые
     usages и key_ops:[] в JWK, и чужая сторона не сможет проверить подпись) */
  const подпись = await СУБ.generateKey({ name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' }, false, ['sign', 'verify']);
  return {
    id: 'ид-' + (globalThis.crypto.randomUUID ? globalThis.crypto.randomUUID() : б16(await СУБ.digest('SHA-256', КОДЕР.encode(String(Date.now() + Math.random())))).slice(0, 12)),
    обмен: обмен,
    публичнаяОбмена: await СУБ.exportKey('jwk', обмен.publicKey),
    подпись: подпись,
    публичнаяПодпись: await СУБ.exportKey('jwk', подпись.publicKey),
    создана: Date.now()
  };
}

/* секрет пары: мой приватный ECDH + чужая публичная JWK → AES-GCM-256
   (у обоих сторон секрет одинаков — математика Диффи-Хеллмана) */
export async function секретПары(мояПриватнаяОбмена, чужаяПубличнаяJWK) {
  гарантия();
  const чужая = await СУБ.importKey('jwk', чужаяПубличнаяJWK, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return await СУБ.deriveKey(
    { name: 'ECDH', public: чужая }, мояПриватнаяОбмена,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/* подпись ECDSA: завери/проверь (подпись — base64, для JSON) */
export async function завери(байты, ключПодписи) {
  гарантия();
  return б64(await СУБ.sign({ name: 'ECDSA', hash: 'SHA-256' }, ключПодписи, байты));
}
export async function верьПодписи(байты, подписьБ64, публичнаяПодписьJWK) {
  гарантия();
  try {
    const пк = await СУБ.importKey('jwk', публичнаяПодписьJWK, { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' }, false, ['verify']);
    return await СУБ.verify({ name: 'ECDSA', hash: 'SHA-256' }, пк, б64обр(подписьБ64), байты);
  } catch (е) { return false; }
}

/* ── цепь журнала: tamper-evident печать фактов ──
   Сортировка детерминирована (время, потом id) — порядок звеньев
   одинаков у всех, кто пересчитывает цепь над одним журналом. */
export async function цепьСобытий(события) {
  гарантия();
  const отсорт = [...(события || [])].sort(function (а, б) {
    return (а.createdAt || 0) - (б.createdAt || 0) || String(а.id || '').localeCompare(String(б.id || ''));
  });
  const звенья = [];
  let пред = '0'.repeat(64);
  for (const с of отсорт) {
    /* хэш-тело покрывает ВЕСЬ смысл: текст + вложения + replyTo —
      подмена любого поля ломает цепь в этом звене */
    const смысл = JSON.stringify({ t: (с.semantic && с.semantic.text) || '', a: (с.semantic && с.semantic.attachments) || [], r: (с.semantic && с.semantic.replyTo) || null });
    const тело = КОДЕР.encode(пред + '|' + String(с.id || '') + '|' + String(с.idempotencyKey || '') + '|' + String(с.createdAt || 0) + '|' + смысл);
    const х = б16(await СУБ.digest('SHA-256', тело));
    звенья.push({ id: String(с.id || ''), предХэш: пред, хэш: х });
    пред = х;
  }
  return Object.freeze({ версия: 1, звенья: звенья, вершина: пред });
}

/* пересчитать цепь и сверить с эталоном: ok=false → позиция первого разрыва */
export async function проверьЦепь(события, эталон) {
  гарантия();
  try {
    const свеж = await цепьСобытий(события);
    const эт = эталон || { звенья: [], вершина: '0'.repeat(64) };
    const этЗвенья = эт.звенья || [];
    /* сначала ищем первое подделанное звено (точный адрес), и только потом
       говорим про вершину/длину — иначе позиция разрыва теряется */
    const мин = Math.min(свеж.звенья.length, этЗвенья.length);
    for (let i = 0; i < мин; i++) {
      if (свеж.звенья[i].хэш !== этЗвенья[i].хэш || свеж.звенья[i].предХэш !== этЗвенья[i].предХэш) {
        return { ok: false, позиция: i, причина: 'звено ' + i + ' подделано' };
      }
    }
    if (свеж.вершина !== эт.вершина || свеж.звенья.length !== этЗвенья.length) {
      return { ok: false, позиция: мин, причина: 'вершина/длина разошлись' };
    }
    return { ok: true, позиция: -1 };
  } catch (е) { return { ok: false, позиция: -1, причина: String((е && е.message) || е) }; }
}
