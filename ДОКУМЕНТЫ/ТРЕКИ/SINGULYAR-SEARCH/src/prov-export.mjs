// prov-export.mjs — SINGULYAR-SEARCH, такт v10.80 «ХВОСТЫ», бэклог трека п.7 «PROV-compatible export».
//
// МАШИННАЯ часть строки: экспорт цепочки «запрос → ретрив → реранк → ответ → цитаты»
// в PROV-ПОДОБНЫЙ JSON-документ. W3C PROV-O — ориентир (docs/06_VERIFICATION_PROVENANCE.md),
// полная PROV-O онтология здесь НЕ заявлена: поля — минимальный честный каркас:
//
//   {
//     format: "singulyar.prov-like/0.1",
//     agent:          { id, type: "SoftwareAgent", name, role },        // кто произвёл
//     entity:         { id, type: "Answer", content, citationsCount },  // что произведено
//     activity:       { id, type: "SearchChain", steps: [..] },         // в каком процессе
//     generatedAt:    "<ISO-8601>",                                     // когда
//     wasAttributedTo: "<agent.id>",                                    // атрибуция
//     wasDerivedFrom: [ { entity: "<docId>", role: "evidence", citations: [{docId,start,end,quote}] } ],
//     chain: { query, retrieve: [docId..], rerank: [docId..], answer }
//   }
//
// Все имена полей выровнены на словарь PROV (agent/entity/activity/generatedAt/
// wasAttributedTo/wasDerivedFrom) — формат задокументирован в README трека.
// Честные границы: источник (документ-корпус) атрибутируется как corpus-артефакт трека;
// «0 сети» — записи не содержат URL-загрузок, только локальные id документов.

/**
 * Сборка PROV-подобной записи цепочки.
 * @param {object} o
 * @param {object}  o.agent        {id, name, role?}
 * @param {string}  o.query        исходный запрос
 * @param {string[]} o.retrieved   id документов после ретрива (первый этап)
 * @param {string[]} o.reranked    id документов после реранка (второй этап)
 * @param {string}  o.answer       ответ (текст)
 * @param {Array}   o.citations    [{docId, start, end, quote, score?}]
 * @param {string}  o.generatedAt  ISO-время (передаётся явно — детерминизм в тестах)
 * @param {string}  [o.entityId]   id сущности-ответа (по умолчанию answer-<hash>)
 * @param {string}  [o.activityId]
 * @returns {object}
 */
export function buildProvRecord(o) {
  if (!o || typeof o !== 'object') throw new Error('нужен объект параметров');
  for (const key of ['agent', 'query', 'answer', 'generatedAt']) {
    if (o[key] == null) throw new Error('нет обязательного поля: ' + key);
  }
  const citations = (o.citations || []).map((c) => ({
    docId: c.docId, start: c.start, end: c.end, quote: c.quote,
    ...(c.score != null ? { score: c.score } : {}),
  }));
  const derived = new Map();
  for (const c of citations) {
    if (!derived.has(c.docId)) derived.set(c.docId, { entity: c.docId, role: 'evidence', citations: [] });
    derived.get(c.docId).citations.push({ start: c.start, end: c.end, quote: c.quote });
  }
  // документы из цепочки без цитат — тоже производные (участвовали в контексте)
  for (const id of [...(o.reranked || []), ...(o.retrieved || [])]) {
    if (!derived.has(id)) derived.set(id, { entity: id, role: 'context', citations: [] });
  }
  return {
    format: 'singulyar.prov-like/0.1',
    agent: {
      id: String(o.agent.id),
      type: 'SoftwareAgent',
      name: String(o.agent.name || o.agent.id),
      role: String(o.agent.role || 'search-agent'),
    },
    entity: {
      id: String(o.entityId || 'answer-' + simpleHash(o.answer)),
      type: 'Answer',
      content: String(o.answer),
      citationsCount: citations.length,
    },
    activity: {
      id: String(o.activityId || 'chain-' + simpleHash(o.query)),
      type: 'SearchChain',
      steps: ['retrieve', 'rerank', 'answer', 'cite'],
    },
    generatedAt: String(o.generatedAt),
    wasAttributedTo: String(o.agent.id),
    wasDerivedFrom: [...derived.values()],
    chain: {
      query: String(o.query),
      retrieve: [...(o.retrieved || [])],
      rerank: [...(o.reranked || [])],
      answer: String(o.answer),
    },
  };
}

/** Структурная проверка PROV-записи: обязательные ключи, ISO-время, массивы. */
export function validateProvRecord(rec) {
  const errors = [];
  if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
    return { ok: false, errors: ['корень не объект'] };
  }
  for (const key of ['format', 'agent', 'entity', 'activity', 'generatedAt', 'wasAttributedTo', 'wasDerivedFrom', 'chain']) {
    if (rec[key] === undefined) errors.push('нет ключа: ' + key);
  }
  if (rec.agent && typeof rec.agent.id !== 'string') errors.push('agent.id не строка');
  if (rec.entity && typeof rec.entity.id !== 'string') errors.push('entity.id не строка');
  if (rec.generatedAt) {
    const t = Date.parse(rec.generatedAt);
    if (Number.isNaN(t)) errors.push('generatedAt не ISO-8601');
  }
  if (rec.wasDerivedFrom !== undefined) {
    if (!Array.isArray(rec.wasDerivedFrom)) errors.push('wasDerivedFrom не массив');
    else {
      rec.wasDerivedFrom.forEach((d, i) => {
        if (!d || typeof d.entity !== 'string') errors.push('wasDerivedFrom[' + i + ']: нет entity');
      });
    }
  }
  if (rec.chain) {
    for (const key of ['query', 'retrieve', 'rerank', 'answer']) {
      if (rec.chain[key] === undefined) errors.push('chain.' + key + ': нет поля');
    }
    if (!Array.isArray(rec.chain.retrieve)) errors.push('chain.retrieve не массив');
    if (!Array.isArray(rec.chain.rerank)) errors.push('chain.rerank не массив');
  }
  return { ok: errors.length === 0, errors };
}

/** Собрать PROV-запись и вернуть как JSON-строку (для файла/лога). */
export function provToJson(rec) {
  return JSON.stringify(rec, null, 2);
}

// FNV-1a (первые 8 hex) — стабильный суффикс id; модуль самодостаточен
function simpleHash(str) {
  let h = 0x811c9dc5;
  const bytes = new TextEncoder().encode(String(str));
  for (let i = 0; i < bytes.length; i++) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
