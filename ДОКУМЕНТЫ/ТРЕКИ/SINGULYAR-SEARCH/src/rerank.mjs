// rerank.mjs — SINGULYAR-SEARCH, такт v10.80 «ХВОСТЫ», бэклог трека п.3 «Cross-encoder rerank».
//
// МАШИННАЯ часть строки: офлайн-лексический ПЕРЕРАНЖИР BM25-подобного вида (Okapi BM25:
// idf + насыщение tf (k1) + нормализация длины документа (b)). Кросс-энкодер требует
// модели и сети — здесь его честная офлайн-замена для машинного контура; замена на
// настоящий cross-encoder — открытая строка (см. README трека, «что НЕ закрыто»).
//
// BM25: score(q,d) = Σ_t idf(t) * tf*(k1+1) / (tf + k1*(1-b+b*|d|/avgdl)),
//       idf(t) = ln(1 + (N-df+0.5)/(df+0.5)).
//
// Честные границы: лексический, без морфологии; детерминирован (тай-брейк — порядок входа);
// 0 сети, без внешних импортов.

import { tokenize } from './eval-set.mjs';

export const DEFAULT_K1 = 1.5;
export const DEFAULT_B = 0.75;

/**
 * Индекс корпуса для BM25: частоты терминов, длины документов, df, avgdl.
 * @param {Array<{id,title,text}>} corpus
 */
export function buildIndex(corpus, { k1 = DEFAULT_K1, b = DEFAULT_B } = {}) {
  const docs = corpus.map((d) => {
    const tokens = tokenize((d.title || '') + ' \n ' + (d.text || ''));
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    return { id: d.id, tf, len: tokens.length };
  });
  const df = new Map();
  for (const d of docs) {
    for (const t of d.tf.keys()) df.set(t, (df.get(t) || 0) + 1);
  }
  const avgdl = docs.length ? docs.reduce((s, d) => s + d.len, 0) / docs.length : 0;
  return { docs, df, avgdl, k1, b, N: docs.length };
}

function idf(index, term) {
  const df = index.df.get(term) || 0;
  return Math.log(1 + (index.N - df + 0.5) / (df + 0.5));
}

/** BM25-скор одного документа по токенам запроса (на статистике индекса). */
export function bm25Score(index, queryTokens, docEntry) {
  let score = 0;
  const denomLenPart = index.k1 * (1 - index.b + index.b * (index.avgdl ? docEntry.len / index.avgdl : 0));
  for (const q of queryTokens) {
    const tf = docEntry.tf.get(q) || 0;
    if (!tf) continue;
    score += idf(index, q) * (tf * (index.k1 + 1)) / (tf + denomLenPart);
  }
  return score;
}

/**
 * Переранжирование кандидатов первого этапа.
 * @param {object} index  — buildIndex от полного корпуса (df/avgdl считаются по нему)
 * @param {string} query  — запрос
 * @param {string[]} candidateIds — id кандидатов (порядок первого этапа)
 * @param {object} [opts] { k } — сколько вернуть
 * @returns {string[]} — id, отсортированные по убыванию BM25 (тай — порядок кандидатов)
 */
export function rerank(index, query, candidateIds, { k = 10 } = {}) {
  const qTokens = tokenize(query);
  const byId = new Map(index.docs.map((d) => [d.id, d]));
  const scored = (candidateIds || [])
    .map((id, order) => ({ id, order, score: byId.has(id) ? bm25Score(index, qTokens, byId.get(id)) : -Infinity }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
  return scored.slice(0, k).map((s) => s.id);
}

/** Удобная сборка: индекс + переранжир одной функцией (для eval-контурa). */
export function buildReranker(corpus, opts = {}) {
  const index = buildIndex(corpus, opts);
  return function rerankFn(query, candidateIds, k) {
    return rerank(index, query, candidateIds, { k });
  };
}
