// citation-spans.mjs — SINGULYAR-SEARCH, такт v10.80 «ХВОСТЫ», бэклог трека п.5 «Citation spans».
//
// МАШИННАЯ часть строки: офлайн-аннотатор цитат. Для пары (документ, ответ) выдаёт
// спаны [start, end] поддерживающих ПРЕДЛОЖЕНИЙ документа по лексическому перекрытию
// с токенами ответа. Смещения — в СИМВОЛАХ исходной строки документа (включая терминатор
// предложения), т.е. docText.slice(start, end) === span.text.
//
// Честные границы:
//   - перекрытие ЛЕКСИЧЕСКОЕ, без синонимии/морфологии: score предложения =
//     |уникальные токены ответа ∩ токены предложения| / |уникальные токены ответа|;
//   - предложение считаем поддерживающим при score ≥ minScore (по умолчанию 0.34);
//   - разбивка на предложения детерминированная: конец по [.!?…] + пробел/конец текста
//     или по переводам строк; сокращения («т. д.») могут резать предложение — это
//     зафиксированное упрощение, не баг;
//   - 0 сети, без внешних импортов.

import { tokenize } from './eval-set.mjs';

/**
 * Разбивка текста на предложения с абсолютными смещениями.
 * @returns {Array<{start, end, text}>} — end включает завершающий знак; краевые пробелы
 *          обрезаны СО СДВИГОМ границ: docText.slice(start, end) === text всегда
 */
export function splitSentences(text) {
  const src = String(text);
  const out = [];
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const isTerminator = '.!?…'.includes(ch);
    const isBreak = ch === '\n';
    if (!isTerminator && !isBreak) continue;
    let end = i + 1;
    if (isTerminator) {
      // тянем многоточие/!? целиком и следующий пробел — предложение читается целиком
      while (end < src.length && '.!?…'.includes(src[end])) end++;
    }
    // несколько переводов строк подряд — одно «тише» не создаём: каждый \n заканчивает строку-предложение
    const next = src[end];
    if (isTerminator && next && !/\s/.test(next)) continue; // «т.» внутри «т.д.» — не конец
    out.push({ start, end, text: src.slice(start, end) });
    start = end;
  }
  if (start < src.length) out.push({ start, end: src.length, text: src.slice(start) });
  // Краевые пробелы (маркдаун-переносы «  \n» и т. п.) НЕ часть предложения: сдвигаем
  // границы вместе с текстом — инвариант docText.slice(start, end) === text держится всегда.
  return out
    .map((s) => {
      const raw = s.text;
      const text = raw.trim();
      const from = s.start + (raw.length - raw.trimStart().length);
      return { start: from, end: from + text.length, text };
    })
    .filter((s) => tokenize(s.text).length > 0);
}

/**
 * Аннотация цитат: какие предложения документа поддерживают ответ.
 * @param {string} docText — полный текст документа
 * @param {string} answer  — ответ (утверждение), для которого ищем цитаты
 * @param {object} [opts]  { minScore=0.34, maxSpans=5 }
 * @returns {{spans, coverage, answerTokens, sentencesTotal}}
 *   spans отсортированы по убыванию score (при равенстве — по началу в документе),
 *   ограничены maxSpans; coverage — покрытие ответа лучшим спаном.
 */
export function annotateCitations(docText, answer, { minScore = 0.34, maxSpans = 5 } = {}) {
  const answerTokens = [...new Set(tokenize(answer))];
  if (!answerTokens.length) {
    return { spans: [], coverage: 0, answerTokens: [], sentencesTotal: 0 };
  }
  const sentences = splitSentences(docText);
  const spans = [];
  for (const s of sentences) {
    const stokens = new Set(tokenize(s.text));
    let hit = 0;
    for (const t of answerTokens) if (stokens.has(t)) hit++;
    const score = hit / answerTokens.length;
    if (score >= minScore) {
      spans.push({ start: s.start, end: s.end, text: s.text, score: Math.round(score * 1000) / 1000 });
    }
  }
  spans.sort((a, b) => b.score - a.score || a.start - b.start);
  const top = spans.slice(0, maxSpans);
  return {
    spans: top,
    coverage: top.length ? top[0].score : 0,
    answerTokens,
    sentencesTotal: sentences.length,
  };
}

/**
 * Цитаты в «логическом» виде для PROV-экспорта: отсортированы по позиции в документе.
 */
export function citationsForProv(docId, docText, answer, opts) {
  const { spans } = annotateCitations(docText, answer, opts);
  return spans
    .slice()
    .sort((a, b) => a.start - b.start)
    .map((s) => ({ docId, start: s.start, end: s.end, quote: s.text, score: s.score }));
}
