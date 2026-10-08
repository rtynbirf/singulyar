/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · КРИСТАЛЛ — durable журнал, v1.0.0
   ───────────────────────────────────────────────────────────────────
   ХРАНЕНИЕ ≠ ТРАНСПОРТ ≠ СМЫСЛ: журнал хранит канонические события
   и записи доставки; ничего не знает о UI и транспортах.

   IndexedDB 'singulyar-crystal':
     events — канонические semantic events (keyPath 'id');
     seen   — ключи идемпотентности (дедуп повторной доставки переживает
              перезагрузку страницы — в отличие от Set в памяти);
     states — записи доставки {eventId, state, history, attempts}.

   Все функции безопасно падают в отказ при отсутствии IndexedDB
   (возвращают честный null/false/[]) — ядро тогда просто не ведёт
   durable-журнал, связь не ломается.
   ═══════════════════════════════════════════════════════════════════ */

const DB = 'singulyar-crystal';
const STORE = 'events';
const SEEN = 'seen';
const STATES = 'states';

function open() {
  if (!('indexedDB' in globalThis)) return Promise.resolve(null);
  return new Promise(function (resolve) {
    let rq;
    try { rq = indexedDB.open(DB, 1); } catch (e) { resolve(null); return; }
    rq.onupgradeneeded = function () {
      const б = rq.result;
      if (!б.objectStoreNames.contains(STORE)) б.createObjectStore(STORE, { keyPath: 'id' });
      if (!б.objectStoreNames.contains(SEEN)) б.createObjectStore(SEEN, { keyPath: 'key' });
      if (!б.objectStoreNames.contains(STATES)) б.createObjectStore(STATES, { keyPath: 'eventId' });
    };
    rq.onsuccess = function () { resolve(rq.result); };
    rq.onerror = function () { resolve(null); };
    rq.onblocked = function () { resolve(null); };
  });
}

function ход(б, store, mode, работа) {
  return new Promise(function (resolve, reject) {
    let t;
    try { t = б.transaction(store, mode); } catch (e) { reject(e); return; }
    let ответ;
    try { ответ = работа(t.objectStore(store), t); } catch (e) { reject(e); return; }
    t.oncomplete = function () { resolve(ответ && typeof ответ.result !== 'undefined' ? ответ.result : ответ); };
    t.onerror = function () { reject(t.error); };
    t.onabort = function () { reject(t.error || new Error('abort')); };
  });
}

function req(rq, fallback) {
  return new Promise(function (resolve) { rq.onsuccess = function () { resolve(rq.result); }; rq.onerror = function () { resolve(fallback); }; });
}

/* ── события ── */
export async function append(event) {
  const б = await open(); if (!б) return false;
  await ход(б, STORE, 'readwrite', function (s) { s.put(event); });
  return true;
}

export async function all() {
  const б = await open(); if (!б) return [];
  return ход(б, STORE, 'readonly', function (s) { return req(s.getAll(), []); });
}

export async function count() {
  const б = await open(); if (!б) return 0;
  return ход(б, STORE, 'readonly', function (s) { return req(s.count(), 0); });
}

/* ── идемпотентность (durable): атомарно проверить-и-занять ключ ──
   Возвращает true, если ключ новый (событие принимается), false —
   если ключ уже занят (дубликат доставки отбрасывается). */
export async function claimKey(idempotencyKey) {
  const б = await open(); if (!б) return false;          /* журнала нет — дедуп невозможен, честно */
  if (!idempotencyKey) return false;
  return new Promise(function (resolve) {
    let принято = false;
    let t;
    try { t = б.transaction(SEEN, 'readwrite'); } catch (e) { resolve(false); return; }
    const s = t.objectStore(SEEN);
    const rq = s.get(idempotencyKey);
    rq.onsuccess = function () {
      if (!rq.result) { принято = true; try { s.put({ key: idempotencyKey, at: Date.now() }); } catch (e) {} }
    };
    rq.onerror = function () { /* остаёмся в «не принято» */ };
    t.oncomplete = function () { resolve(принято); };
    t.onerror = function () { resolve(false); };
    t.onabort = function () { resolve(false); };
  });
}

export async function hasKey(idempotencyKey) {
  const б = await open(); if (!б) return false;
  return ход(б, SEEN, 'readonly', function (s) { return req(s.get(idempotencyKey), undefined); })
    .then(function (v) { return !!v; });
}

/* ── записи доставки ── */

/* Сырая перезапись (для инструментов/миграций). В живом потоке доставки
   используй applyDelivery — она не затирает факты устаревшей записью. */
export async function setDelivery(delivery) {
  const б = await open(); if (!б) return false;
  await ход(б, STATES, 'readwrite', function (s) { s.put(delivery); });
  return true;
}

/* Атомарное «прочитал → слил → записал» в ОДНОЙ транзакции.
   Слияние по машине состояний (mergeDelivery из ядра): поздний SENT от
   отправителя не откатывает уже записанный DELIVERED получателя; прыжки
   вперёд достраиваются по цепочке легальных шагов.
   Возвращает результат слияния {ok, merged, delivery, reason?} или false. */
export async function applyDelivery(record) {
  const б = await open(); if (!б) return false;
  const { mergeDelivery } = await import('./crystal-core.mjs');
  return new Promise(function (resolve) {
    let итог = null;
    let t;
    try { t = б.transaction(STATES, 'readwrite'); } catch (e) { resolve(false); return; }
    const s = t.objectStore(STATES);
    const rq = s.get(record && record.eventId);
    rq.onsuccess = function () {
      try {
        итог = mergeDelivery(rq.result || null, record);
        if (итог && итог.ok) s.put(итог.delivery);
      } catch (e) { итог = { ok: false, reason: 'MERGE_ERROR' }; }
    };
    rq.onerror = function () { итог = { ok: false, reason: 'GET_ERROR' }; };
    t.oncomplete = function () { resolve(итог || { ok: false, reason: 'NO_RESULT' }); };
    t.onerror = function () { resolve(итог && итог.ok ? итог : false); };
    t.onabort = function () { resolve(false); };
  });
}

export async function getDelivery(eventId) {
  const б = await open(); if (!б) return null;
  return ход(б, STATES, 'readonly', function (s) { return req(s.get(eventId), null); });
}

/* ── retention: убрать истёкшие временные события и их доставки ──
   Возвращает {удалено, осталось} или null (журнала нет). */
export async function purgeExpired(now) {
  now = now || Date.now();
  const б = await open(); if (!б) return null;
  const события = await all();
  const живые = события.filter(function (e) {
    const p = (e && e.policy) || {};
    if (p.retention !== 'temporary' || !Number.isFinite(p.ttl)) return true;
    return e.createdAt + p.ttl > now;
  });
  const истёкшие = события.length - живые.length;
  if (истёкшие > 0) {
    const мёртвыеId = {};
    события.forEach(function (e) {
      const p = (e && e.policy) || {};
      const жив = (p.retention !== 'temporary' || !Number.isFinite(p.ttl)) || (e.createdAt + p.ttl > now);
      if (!жив) мёртвыеId[e.id] = true;
    });
    await new Promise(function (resolve) {
      const t = б.transaction([STORE, STATES], 'readwrite');
      const sE = t.objectStore(STORE), sS = t.objectStore(STATES);
      Object.keys(мёртвыеId).forEach(function (ид) { try { sE.delete(ид); sS.delete(ид); } catch (e) {} });
      t.oncomplete = resolve; t.onerror = resolve; t.onabort = resolve;
    });
  }
  return { удалено: истёкшие, осталось: живые.length };
}

/* Полная очистка (кнопка «стереть журнал связи» модуля может звать). */
export async function clearAll() {
  const б = await open(); if (!б) return false;
  await new Promise(function (resolve) {
    const t = б.transaction([STORE, SEEN, STATES], 'readwrite');
    t.objectStore(STORE).clear(); t.objectStore(SEEN).clear(); t.objectStore(STATES).clear();
    t.oncomplete = resolve; t.onerror = resolve; t.onabort = resolve;
  });
  return true;
}
