// eval-set.mjs — SINGULYAR-SEARCH, такт v10.80 «ХВОСТЫ», бэклог трека п.1 «Eval set».
//
// КРИТЕРИЙ СТРОКИ П2: «по мере приложения» — закрыта МАШИННАЯ часть: фиксированный корпус
// запросов (20 ru/en, tests/fixtures/eval/queries.json) с ожидаемыми документами (qrels),
// метрика MRR@k и офлайн-лексический baseline-ретривер. Корпус документов — СОБСТВЕННЫЕ
// файлы трека (docs/*.md + README.md): локальные корпусные файлы есть, поэтому отдельный
// мини-корпус не выдумывается.
//
// Честные границы:
//   - baseline — ЧИСТО лексический (TF + буст заголовка ×2), без морфологии и без dense:
//     запросы составлены в словоформах корпуса; это baseline для сравнения, не продукт;
//   - MRR@k: 1/ранг первого релевантного в top-k, иначе 0; усреднение по запросам;
//   - 0 сети: единственная зависимость — node:fs для загрузки файлов корпуса.

import fs from 'node:fs';
import path from 'node:path';

const STOP_TOKENS = new Set(['и', 'в', 'на', 'по', 'за', 'к', 'с', 'со', 'от', 'до', 'для',
  'the', 'a', 'an', 'of', 'in', 'on', 'at', 'to', 'with', 'and', 'or', 'is', 'are']);

/** Токенизация ru/en: нижний регистр, буквы/цифры/#/точка-в-термине, слова ≥ 2 символов. */
export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/ё/g, 'е')
    .split(/[^0-9a-zа-я#.]+/i)
    .filter((t) => t.length >= 2 && !STOP_TOKENS.has(t) && t !== '#');
}

/**
 * MRR@k по одному запросу: 1/ранг первого релевантного документа в top-k (ранг с 1), иначе 0.
 * @param {string[]} rankedIds — ранжированный список id
 * @param {string[]} relevantIds — релевантные id (qrels)
 */
export function mrrAtK(rankedIds, relevantIds, k = 10) {
  const rel = new Set(relevantIds || []);
  if (!rel.size) return 0;
  const top = (rankedIds || []).slice(0, k);
  for (let i = 0; i < top.length; i++) {
    if (rel.has(top[i])) return 1 / (i + 1);
  }
  return 0;
}

/** Среднее MRR по набору значений (пустой набор → 0). */
export function meanMrr(values) {
  if (!values || !values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/**
 * Baseline-ретривер: лексический TF + буст заголовка ×2.
 * @param {Array<{id,title,text}>} corpus
 * @returns {(query: string, k: number) => string[]}
 */
export function buildBaselineRetriever(corpus) {
  const docs = corpus.map((d) => ({
    id: d.id,
    titleTokens: tokenize(d.title || ''),
    textTokens: tokenize(d.text || ''),
  }));
  return function retrieve(query, k = 10) {
    const qTokens = tokenize(query);
    const scored = docs.map((d) => {
      let score = 0;
      for (const q of qTokens) {
        for (const t of d.titleTokens) if (t === q || t.includes(q) || q.includes(t)) score += 2;
        for (const t of d.textTokens) if (t === q || t.includes(q) || q.includes(t)) score += 1;
      }
      return { id: d.id, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((s) => s.id);
  };
}

/**
 * Прогон eval-набора: для каждого запроса — ранжирование, MRR@k, ранг первого релевантного.
 * @param {Array<{id,title,text}>} corpus
 * @param {Array<{id,query,relevant:string[]}>} queries
 * @returns {{rows, meanMrr, k}}
 */
export function runEval(corpus, queries, { k = 10, retrieve } = {}) {
  if (!retrieve) retrieve = buildBaselineRetriever(corpus);
  const rows = queries.map((q) => {
    const ranked = retrieve(q.query, k);
    const mrr = mrrAtK(ranked, q.relevant, k);
    const firstRank = ranked.findIndex((id) => q.relevant.includes(id));
    return {
      id: q.id,
      query: q.query,
      relevant: q.relevant.join(','),
      mrr,
      firstRank: firstRank === -1 ? null : firstRank + 1,
      top3: ranked.slice(0, 3).join(', '),
    };
  });
  return { rows, meanMrr: meanMrr(rows.map((r) => r.mrr)), k };
}

/** Текстовая таблица eval-прогона (моноширинная, для отчёта). */
export function formatEvalTable(result) {
  const lines = [];
  lines.push('query      MRR@' + result.k + '  ранг  top-3');
  lines.push('-'.repeat(72));
  for (const r of result.rows) {
    lines.push(
      r.id.padEnd(10)
      + r.mrr.toFixed(2).padEnd(9)
      + String(r.firstRank ?? '—').padEnd(6)
      + r.top3
    );
  }
  lines.push('-'.repeat(72));
  lines.push('MEAN MRR@' + result.k + ' = ' + result.meanMrr.toFixed(4) + '  (запросов: ' + result.rows.length + ')');
  return lines.join('\n');
}

/**
 * Загрузка корпуса из каталога с .md-файлами (id = имя файла без расширения,
 * title = первая строка без «#»). Папка трека docs/ — корпусные файлы самого трека.
 */
export function loadCorpusDir(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    if (!name.endsWith('.md')) continue;
    const raw = fs.readFileSync(path.join(dir, name), 'utf8');
    const firstLineEnd = raw.indexOf('\n');
    const title = (firstLineEnd === -1 ? raw : raw.slice(0, firstLineEnd)).replace(/^#+\s*/, '').trim();
    out.push({ id: name.slice(0, -3), title, text: raw });
  }
  return out;
}

/** Загрузка фиксированного eval-набора запросов (JSON: {queries:[{id,query,relevant}]}). */
export function loadQueries(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const queries = Array.isArray(data) ? data : data.queries;
  if (!Array.isArray(queries)) throw new Error('queries.json: нет массива queries');
  return queries;
}
