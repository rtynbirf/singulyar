/* ═══════════════════════════════════════════════════════════════════
   СИНГУЛЯР · КРИСТАЛЛ — протокольное ядро связи, v1.0.0
   ───────────────────────────────────────────────────────────────────
   НОРМАТИВНЫЙ ФАЙЛ. Изменения требуют версии и заметок о миграции
   (protocol/README и README кристалла). Источник инвариантов:
   reference-архив SINGULYAR_KRISTALL_REFERENCE (2026-10-03),
   protocol/DELIVERY.md, protocol/semantic-event.schema.json.

   Инвариант:
     СМЫСЛ ≠ ПРЕДСТАВЛЕНИЕ ≠ КАНАЛ ≠ ТРАНСПОРТ ≠ ХРАНЕНИЕ

   Поток:
     ЧЕЛОВЕК → HUMAN INTENT → SEMANTIC EVENT → REPRESENTATION ADAPTER
            → CHANNEL POLICY → TRANSPORT → DELIVERY STATE → DURABLE JOURNAL

   Правила:
     • явный выбор человека сильнее автоматики; fallback наблюдаем;
     • событие неизменно: retry не трогает semantic payload;
     • идемпотентный ключ стабилен между повторами;
     • ACK ≠ READ; падение транспорта ≠ падение сообщения, пока
       политика повторов не исчерпана;
     • протокол ничего не знает о конкретных UI-контрактах модулей.

   Границы (честно, см. README кристалла): E2EE, сигналинг, серверный
   релей, multi-device конфликт-слияние — вне этого файла.
   ═══════════════════════════════════════════════════════════════════ */

export const CRYSTAL = Object.freeze({ name: 'singulyar-crystal', version: '1.0.0' });

export function id(prefix = 'id') { return prefix + '_' + crypto.randomUUID(); }

/* Режимы представления и их требования к среде. Норматив. */
export const MODES = Object.freeze({
  text:        { requires: [] },
  captions:    { requires: [] },
  braille:     { requires: [] },
  tts:         { requires: ['speechSynthesis'] },
  tactile:     { requires: ['vibrate'] },
  translation: { requires: [] }
});

/* ── SEMANTIC EVENT: смысл, отделённый от всего остального ── */
export function message({ from, conversation, text = '', attachments = [], replyTo = null,
                          retention = 'persistent', ttl = null, capabilities = null,
                          idempotencyKey = null }) {
  return {
    ver: CRYSTAL.version,
    type: 'semantic.message',
    id: id('msg'),
    idempotencyKey: idempotencyKey || id('idem'),
    from: String(from == null ? '' : from),
    conversation: String(conversation == null ? '' : conversation),
    createdAt: Date.now(),
    semantic: { text: String(text == null ? '' : text), attachments: [...attachments], replyTo },
    policy: { retention, ttl },
    capabilities: capabilities || Object.keys(MODES),
    revision: 1
  };
}

/* Проверка одного требования к среде исполнения. */
function hasCapability(name, runtime) {
  if (name === 'speechSynthesis') return !!runtime?.speechSynthesis;
  if (name === 'vibrate') return typeof runtime?.navigator?.vibrate === 'function';
  return true;
}

function supported(mode, runtime) {
  return ((MODES[mode] || {}).requires || []).every(function (x) { return hasCapability(x, runtime); });
}

/* ── ВЫБОР ПРЕДСТАВЛЕНИЯ: человек первый, fallback наблюдаем ──
   Гарантии (тесты фиксируют):
   1. явный выбор человека, если он доступен — без fallback;
   2. явный выбор недоступен → обход preferred, причина
      'explicit-choice-unavailable', fallback:true (не молчим);
   3. ничего не подошло → текст как безопасный fallback;
   4. текст запрещён и всё остальное недоступно → mode:null,
      причина 'no-compatible-representation' — честный отказ. */
export function chooseRepresentation(msg, preference = {}, runtime = globalThis) {
  const allowed = new Set(msg.capabilities || ['text']);
  const preferred = (Array.isArray(preference.preferred) && preference.preferred.length)
    ? preference.preferred : ['text'];
  const disabled = new Set(preference.disabled || []);
  if (preference.explicit && allowed.has(preference.explicit)
      && !disabled.has(preference.explicit) && supported(preference.explicit, runtime)) {
    return { mode: preference.explicit, reason: 'human-choice', fallback: false };
  }
  const явныйНедоступен = !!preference.explicit;
  for (const mode of preferred) {
    if (allowed.has(mode) && !disabled.has(mode) && supported(mode, runtime)) {
      return { mode, reason: явныйНедоступен ? 'explicit-choice-unavailable' : 'preferred', fallback: явныйНедоступен };
    }
  }
  if (allowed.has('text') && !disabled.has('text')) {
    return { mode: 'text', reason: явныйНедоступен ? 'explicit-choice-unavailable' : 'safe-fallback', fallback: true };
  }
  return { mode: null, reason: 'no-compatible-representation', fallback: true };
}

/* ── ПРЕДСТАВЛЕНИЕ: строится из события, смысл не меняется ── */
export function represent(msg, decision, preference = {}) {
  if (!decision?.mode) return { ok: false, error: 'NO_REPRESENTATION' };
  const text = msg.semantic?.text ?? '';
  switch (decision.mode) {
    case 'tts':         return { ok: true, mode: 'tts', text, voice: preference.voice ?? null, rate: preference.rate ?? 1, pitch: preference.pitch ?? 1 };
    case 'captions':    return { ok: true, mode: 'captions', text, punctuation: preference.punctuation !== false };
    case 'braille':     return { ok: true, mode: 'braille', text, grade: preference.grade ?? 'auto' };
    case 'tactile':     return { ok: true, mode: 'tactile', text, pattern: preference.pattern ?? 'default' };
    case 'translation': return { ok: true, mode: 'translation', text, target: preference.language ?? 'ru', provider: preference.provider ?? 'user-selected' };
    default:            return { ok: true, mode: 'text', text };
  }
}

/* ── КОНВЕРТ: транспорт-нейтральная оболочка события ── */
export function envelope(event, transport = 'local') {
  return { ver: CRYSTAL.version, type: 'crystal.envelope', id: id('env'), transport, ts: Date.now(), event };
}

/* ── RETENTION: временное умирает, постоянное живёт ── */
export function retentionFilter(events, now = Date.now()) {
  return events.filter(function (e) {
    const p = e?.policy || {};
    if (p.retention !== 'temporary' || !Number.isFinite(p.ttl)) return true;
    return e.createdAt + p.ttl > now;
  });
}

/* ── АУДИТ: честная запись заявления с доказательством ──
   Статус по умолчанию UNKNOWN — недоказанное не объявляется доказанным. */
export function audit(claim, evidence, status = 'UNKNOWN') {
  return { id: id('audit'), at: Date.now(), claim, evidence, status };
}

/* ── ИДЕМПОТЕНТНОСТЬ: повторная доставка не создаёт копий ── */
export function applyIdempotent(seen, event) {
  if (seen.has(event.idempotencyKey)) return { accepted: false, reason: 'DUPLICATE' };
  seen.add(event.idempotencyKey);
  return { accepted: true, reason: 'NEW' };
}

/* ═══ МАШИНА ДОСТАВКИ (protocol/DELIVERY.md, норматив) ═══
   CREATED → QUEUED → SENT → ACKED → DELIVERED → READ
   Ошибка: QUEUED/SENT → RETRY[n] → FAILED (FAILED → QUEUED — ремонт).
   Событие id стабильно; ключ идемпотентности стабилен между повторами;
   retry не меняет semantic payload; ACK ≠ READ. */
export const DELIVERY = Object.freeze({
  STATES: Object.freeze(['CREATED', 'QUEUED', 'SENT', 'ACKED', 'DELIVERED', 'READ', 'RETRY', 'FAILED']),
  LEGAL: Object.freeze({
    CREATED:   ['QUEUED', 'FAILED'],
    QUEUED:    ['SENT', 'RETRY', 'FAILED'],
    SENT:      ['ACKED', 'DELIVERED', 'RETRY', 'FAILED'],
    ACKED:     ['DELIVERED', 'FAILED'],
    DELIVERED: ['READ'],
    READ:      [],
    RETRY:     ['QUEUED', 'SENT', 'FAILED'],
    FAILED:    ['QUEUED']
  })
});

/* Проверка одного перехода. Нелегальный переход — наблюдаемая ошибка,
   а не тихое игнорирование (диагностика важнее красивого вранья). */
export function canTransition(from, to) {
  const list = DELIVERY.LEGAL[from];
  return !!list && list.indexOf(to) !== -1;
}

/* Продвинуть запись доставки. Запись: {eventId, state, history[], attempts}.
   Возвращает {ok:true, delivery} или {ok:false, reason}. Payload события
   здесь не трогается физически — функция принимает только запись доставки. */
export function advance(delivery, to, note = '') {
  if (!delivery || typeof delivery.state !== 'string') return { ok: false, reason: 'NO_DELIVERY' };
  if (!canTransition(delivery.state, to)) {
    return { ok: false, reason: 'ILLEGAL_TRANSITION', from: delivery.state, to };
  }
  const d = { eventId: delivery.eventId, state: to,
              history: (delivery.history || []).concat([{ state: to, at: Date.now(), note: String(note || '') }]),
              attempts: delivery.attempts || 0 };
  if (to === 'RETRY') d.attempts = (delivery.attempts || 0) + 1;
  return { ok: true, delivery: d };
}

/* ── СЛИЯНИЕ ЗАПИСЕЙ ДОСТАВКИ (журнал фактов, а не слепая перезапись) ──
   Один и тот же eventId может приходить в журнал с разных сторон
   (отправитель шлёт SENT, получатель — DELIVERED; при общем журнале
   устройства вкладки соревнуются в порядке записи). Правила:
   • запись «впереди» по цепочке и легальная от текущей — применяется;
   • прыжок вперёд через состояния достраивается по цепочке легальных
     шагов (факты это позволяют: транспорт доставил — значит был SENT);
   • запись «позади» текущей — устаревшая, состояние не откатывается;
   • RETRY/FAILED применяются, если переход легален от текущей. */
const РАНГ = { CREATED: 0, QUEUED: 1, SENT: 2, ACKED: 3, DELIVERED: 4, READ: 5 };
function ранг(с) { return (с in РАНГ) ? РАНГ[с] : 2.5; }   /* RETRY/FAILED ≈ уровень SENT */

export function mergeDelivery(current, incoming) {
  if (!incoming || typeof incoming.state !== 'string') return { ok: false, reason: 'NO_INCOMING' };
  if (!current) return { ok: true, merged: true, delivery: incoming };
  if (current.eventId !== incoming.eventId) return { ok: false, reason: 'EVENT_MISMATCH' };
  if (current.state === incoming.state) return { ok: true, merged: false, delivery: current };
  const вперёд = ранг(incoming.state) > ранг(current.state);
  if (вперёд && canTransition(current.state, incoming.state)) {
    const история = (current.history || []).concat(
      (incoming.history || []).filter(function (h) {
        return !(current.history || []).some(function (x) { return x.state === h.state; });
      }));
    return { ok: true, merged: true, delivery: {
      eventId: current.eventId, state: incoming.state, history: история,
      attempts: Math.max(current.attempts || 0, incoming.attempts || 0) } };
  }
  if (вперёд && (incoming.state in РАНГ)) {
    /* достройка по цепочке QUEUED→SENT→ACKED→DELIVERED→READ */
    const ЦЕПЬ = ['QUEUED', 'SENT', 'ACKED', 'DELIVERED', 'READ'];
    let з = current;
    for (const шаг of ЦЕПЬ) {
      if (ранг(шаг) <= ранг(з.state)) continue;
      const р = advance(з, шаг, 'достроено при слиянии');
      if (!р.ok) return { ok: false, reason: 'MERGE_GAP', from: з.state, to: incoming.state };
      з = р.delivery;
      if (шаг === incoming.state) return { ok: true, merged: true, delivery: з };
    }
    return { ok: false, reason: 'MERGE_UNREACHABLE', to: incoming.state };
  }
  if (вперёд) {
    /* RETRY/FAILED вперёд по рангу, но без прямой цепочки — только легальный переход */
    if (canTransition(current.state, incoming.state)) {
      return advance(current, incoming.state, (incoming.history || []).slice(-1)[0]?.note || 'слияние');
    }
    return { ok: false, reason: 'ILLEGAL_TRANSITION', from: current.state, to: incoming.state };
  }
  return { ok: true, merged: false, delivery: current, reason: 'STALE' };
}
