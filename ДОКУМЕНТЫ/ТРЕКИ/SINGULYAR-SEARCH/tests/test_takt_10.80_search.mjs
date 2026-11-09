// test_takt_10.80_search.mjs — SINGULYAR-SEARCH, такт v10.80 «ХВОСТЫ».
// Бэклог трека (docs/12_ROADMAP_AND_BACKLOG.md), машинная часть пунктов 1/3/5/7:
//   1. Eval set + baseline numbers  → src/eval-set.mjs + fixtures/eval/queries.json (20 запросов)
//   3. Rerank (офлайн BM25-подобный) → src/rerank.mjs
//   5. Citation spans                → src/citation-spans.mjs
//   7. PROV-compatible export        → src/prov-export.mjs
//
// Принцип «против имитации»: каждый модуль гоняется на РЕАЛЬНЫХ данных трека —
// корпус eval-а это собственные документы трека (docs/*.md + README.md — 16 документов,
// как заявлено в fixtures/eval/queries.json), цитаты ищутся в живом тексте docs/06,
// PROV строится из реальной цепочки eval-а.
// 0 сети: модули не делают ни одного запроса (гард-тест внизу файла).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as ev from '../src/eval-set.mjs';
import * as rr from '../src/rerank.mjs';
import * as cs from '../src/citation-spans.mjs';
import * as pv from '../src/prov-export.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DOCS = path.join(ROOT, 'docs');

// Реальный корпус: документы самого трека (docs/*.md через loadCorpusDir + README.md вручную —
// тот же контракт id/заголовка, что и в loadCorpusDir: id = имя без .md, title = первая строка)
function readTrackDoc(file, id) {
  const raw = fs.readFileSync(file, 'utf8');
  const firstLineEnd = raw.indexOf('\n');
  const title = (firstLineEnd === -1 ? raw : raw.slice(0, firstLineEnd)).replace(/^#+\s*/, '').trim();
  return { id, title, text: raw };
}
const corpus = ev.loadCorpusDir(DOCS).concat([
  readTrackDoc(path.join(ROOT, 'README.md'), 'README'),
]);
const queries = ev.loadQueries(path.join(HERE, 'fixtures', 'eval', 'queries.json'));

// ===========================================================================
// Статический гард: 0 сети во всех новых модулях
// ===========================================================================
describe('гард · новые модули трека без сети', () => {
  const FILES = ['src/eval-set.mjs', 'src/rerank.mjs', 'src/citation-spans.mjs', 'src/prov-export.mjs'];
  for (const f of FILES) {
    it(f + ': нет fetch/XHR/WebSocket/http(s)', () => {
      const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
      assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|WebSocket/);
      assert.doesNotMatch(src, /https?:\/\/(?!\u043d)/);
    });
  }
});

// ===========================================================================
// П2.1 · Eval set + MRR@k
// ===========================================================================
describe('П2 · eval-set: MRR@k на фиксированном мини-кейсе', () => {
  it('mrrAtK: известные значения (ранг 1 → 1; ранг 3 → 1/3; вне top-k → 0)', () => {
    assert.equal(ev.mrrAtK(['a', 'b', 'c'], ['a'], 10), 1);
    assert.ok(Math.abs(ev.mrrAtK(['x', 'y', 'a'], ['a'], 10) - 1 / 3) < 1e-12);
    assert.equal(ev.mrrAtK(['x', 'y', 'z'], ['a'], 10), 0);
    assert.equal(ev.mrrAtK(['a', 'x'], ['x'], 1), 0, 'k=1: релевантный на ранге 2 не считается');
    assert.equal(ev.mrrAtK(['x', 'a'], ['x'], 1), 1);
    assert.equal(ev.mrrAtK([], ['a']), 0);
    assert.equal(ev.mrrAtK(['a'], []), 0, 'пустые qrels → 0');
    // несколько релевантных: считается ПЕРВЫЙ
    assert.ok(Math.abs(ev.mrrAtK(['x', 'b', 'a'], ['a', 'b']) - 1 / 2) < 1e-12);
  });

  it('meanMrr: среднее по значениям', () => {
    assert.ok(Math.abs(ev.meanMrr([1, 0.5, 0]) - 0.5) < 1e-12);
    assert.equal(ev.meanMrr([]), 0);
  });

  it('baseline-ретривер на фиксированном мини-корпусе: ожидаемый порядок', () => {
    const mini = [
      { id: 'doc-fusion', title: 'Каналы поиска и fusion', text: 'RRF BM25 fusion каналы поиска' },
      { id: 'doc-roles', title: 'Роли', text: 'роли агентов координатор' },
      { id: 'doc-metrics', title: 'Метрики', text: 'recall ndcg метрики' },
    ];
    const retrieve = ev.buildBaselineRetriever(mini);
    assert.deepEqual(retrieve('RRF BM25 fusion', 3), ['doc-fusion', 'doc-roles', 'doc-metrics']);
    assert.deepEqual(retrieve('ndcg', 3)[0], 'doc-metrics');
  });
});

// ===========================================================================
// П2 · прогон eval-набора на реальном корпусе трека (20 запросов)
// ===========================================================================
const baseline = ev.runEval(corpus, queries, { k: 10 });

describe('П2 · eval на корпусе трека (20 запросов, corpus = docs/*.md + README.md)', () => {
  it('корпус цел: 16 документов, id уникальны, текст не пуст', () => {
    assert.equal(corpus.length, 16, 'docs/*.md (15) + README.md');
    const ids = new Set(corpus.map((d) => d.id));
    assert.equal(ids.size, corpus.length);
    for (const d of corpus) {
      assert.ok(d.title.length > 0, 'title: ' + d.id);
      assert.ok(d.text.length > 100, 'text: ' + d.id);
    }
  });

  it('eval-набор цел: ровно 20 запросов ru/en, у каждого qrels из существующих документов', () => {
    assert.equal(queries.length, 20);
    const ids = new Set(corpus.map((d) => d.id));
    for (const q of queries) {
      assert.ok(q.id && q.query);
      assert.ok(['ru', 'en'].includes(q.lang), 'lang: ' + q.id);
      assert.ok(Array.isArray(q.relevant) && q.relevant.length > 0, 'qrels: ' + q.id);
      for (const r of q.relevant) assert.ok(ids.has(r), 'qrels указывает на несуществующий документ: ' + r);
    }
  });

  it('таблица baseline снята и напечатана (stdout → README/отчёт)', () => {
    console.log('\n=== П2 · EVAL-НАБОР (20 запросов, corpus трека) · BASELINE (лексический TF) ===');
    console.log(ev.formatEvalTable(baseline));
    console.log('=== КОНЕЦ П2 BASELINE ===\n');
    assert.equal(baseline.rows.length, 20);
  });

  it('структурная честность: все MRR в [0,1], meanMrr согласован со строками', () => {
    for (const r of baseline.rows) {
      assert.ok(r.mrr >= 0 && r.mrr <= 1, 'mrr в [0,1]: ' + r.id);
      if (r.firstRank !== null) assert.ok(Math.abs(r.mrr - 1 / r.firstRank) < 1e-9, 'mrr = 1/ранг: ' + r.id);
    }
    const mean = baseline.rows.reduce((s, r) => s + r.mrr, 0) / baseline.rows.length;
    assert.ok(Math.abs(baseline.meanMrr - mean) < 1e-9);
  });
});

// ===========================================================================
// П2.3 · Rerank (BM25-подобный, офлайн)
// ===========================================================================
const index = rr.buildIndex(corpus);

describe('П2 · rerank: BM25-подобный переранжир', () => {
  it('мини-кейс: порядок меняется ожидаемо — короткий точный документ обгоняет длинный размытый', () => {
    const mini = [
      { id: 'short-precise', title: 'Гипотеза', text: 'гипотеза проверена тестом' },
      { id: 'long-diffuse', title: 'Заметки', text: 'гипотеза ' + 'слово '.repeat(99) + ' ещё гипотеза в конце' },
    ];
    const idx = rr.buildIndex(mini);
    // входной порядок: длинный первым (как мог прийти с первого этапа)
    const reranked = rr.rerank(idx, 'гипотеза', ['long-diffuse', 'short-precise']);
    assert.deepEqual(reranked, ['short-precise', 'long-diffuse'], 'BM25 нормализует длину: короткий точный документ выше');
    const scores = ['short-precise', 'long-diffuse'].map((id) => rr.bm25Score(idx, ev.tokenize('гипотеза'), idx.docs.find((d) => d.id === id)));
    assert.ok(scores[0] > scores[1], 'BM25-скор короткого выше: ' + scores.join(' vs '));
  });

  it('длина такта формулы: tf-насыщение и idf честно влияют на скор', () => {
    const mini = [
      { id: 'a', title: '', text: 'термин термин термин шум' },
      { id: 'b', title: '', text: 'термин другое слово длиннее без термина дважды' },
    ];
    const idx = rr.buildIndex(mini);
    const sA = rr.bm25Score(idx, ['термин'], idx.docs[0]);
    const sB = rr.bm25Score(idx, ['термин'], idx.docs[1]);
    assert.ok(sA > sB, 'tf=3 и короче → скор выше');
    assert.ok(rr.bm25Score(idx, ['термин', 'другое'], idx.docs[1]) > 0, 'второй термин добавляет скор');
    assert.equal(rr.bm25Score(idx, ['несуществующий'], idx.docs[0]), 0);
  });

  it('на корпусе трека: rerank даёт детерминированный порядок и не теряет кандидатов', () => {
    const ids = corpus.map((d) => d.id);
    const shuffledIn = [...ids].reverse();
    const out = rr.rerank(index, 'BM25 RRF fusion rerank', shuffledIn, { k: 16 });
    assert.equal(out.length, 16);
    assert.deepEqual([...out].sort(), [...ids].sort(), 'перестановка, без потерь и дублей');
    const out2 = rr.rerank(index, 'BM25 RRF fusion rerank', shuffledIn, { k: 16 });
    assert.deepEqual(out, out2, 'детерминизм');
  });

  it('k ограничивает выдачу: k=3 → 3 документа, лучшие BM25', () => {
    const ids = corpus.map((d) => d.id);
    const top = rr.rerank(index, 'ndcg beir метрики', ids, { k: 3 });
    assert.equal(top.length, 3);
    const full = rr.rerank(index, 'ndcg beir метрики', ids, { k: 16 });
    assert.deepEqual(top, full.slice(0, 3));
  });
});

// === Прогон eval с переранжированием (baseline → rerank) — печатается и фиксируется ===
const rerankFn = rr.buildReranker(corpus);
const withRerank = ev.runEval(corpus, queries, {
  k: 10,
  retrieve: (query, k) => rerankFn(query, ev.buildBaselineRetriever(corpus)(query, 16), k),
});

describe('П2 · eval × rerank: сравнение на фиксированном наборе', () => {
  it('таблица rerank снята и напечатана (stdout → README/отчёт)', () => {
    console.log('=== П2 · EVAL × RERANK (BM25-подобный, офлайн) ===');
    console.log(ev.formatEvalTable(withRerank));
    console.log('=== КОНЕЦ П2 RERANK ===\n');
    assert.equal(withRerank.rows.length, 20);
    assert.ok(withRerank.meanMrr >= 0 && withRerank.meanMrr <= 1);
    console.log('[П2 СНЯТО] MRR@10 baseline = ' + baseline.meanMrr.toFixed(4)
      + ' · MRR@10 + rerank = ' + withRerank.meanMrr.toFixed(4)
      + ' · Δ = ' + (withRerank.meanMrr - baseline.meanMrr >= 0 ? '+' : '')
      + (withRerank.meanMrr - baseline.meanMrr).toFixed(4));
  });

  it('согласованность строк: mrr=1/ранг у каждой строки и при rerank', () => {
    for (const r of withRerank.rows) {
      if (r.firstRank !== null) assert.ok(Math.abs(r.mrr - 1 / r.firstRank) < 1e-9, r.id);
    }
  });
});

// ===========================================================================
// П2.5 · Citation spans
// ===========================================================================
describe('П2 · citation-spans: аннотатор цитат', () => {
  it('splitSentences: границы и абсолютные смещения точны (slice(start,end) === text)', () => {
    const text = 'Один. Два! Три?\nНовая строка. И ещё предложение…';
    const ss = cs.splitSentences(text);
    for (const s of ss) assert.equal(text.slice(s.start, s.end), s.text, 'смещения сходятся');
    assert.deepEqual(ss.map((s) => s.text), ['Один.', 'Два!', 'Три?', 'Новая строка.', 'И ещё предложение…']);
  });

  it('реальный документ трека (docs/06): находит известный спан про UNKNOWN', () => {
    const doc = corpus.find((d) => d.id === '06_VERIFICATION_PROVENANCE');
    // Ответ собран из формулировок документа (цитатный ответ). Честная граница: частичный
    // парафраз («UNKNOWN — обязательный исход при недостатке…») даёт перекрытие всего ~0.43 —
    // аннотатор лексический, без морфологии/синонимии (см. шапку src/citation-spans.mjs),
    // поэтому eval-ответы ожидаются в словоформах источника.
    const answer = 'При дефиците независимых доказательств строгость — от простого UNKNOWN до verify_claim + EvidenceState.';
    const res = cs.annotateCitations(doc.text, answer, { minScore: 0.4 });
    assert.ok(res.spans.length > 0, 'должен найтись хотя бы один спан');
    const best = res.spans[0];
    assert.ok(best.score >= 0.5, 'лучший спан покрывает ≥ 50% ответа: ' + best.score);
    assert.match(best.text, /UNKNOWN/i, 'спан про UNKNOWN: ' + best.text);
    assert.equal(doc.text.slice(best.start, best.end), best.text, 'смещения точны и в живом документе');
  });

  it('minScore и maxSpans уважаются; нерелевантный ответ → пусто (честно)', () => {
    const doc = corpus.find((d) => d.id === '05_SEARCH_AND_FUSION');
    const res = cs.annotateCitations(doc.text, 'полностью посторонний текст про генетику ДНК', { minScore: 0.34 });
    assert.equal(res.spans.length, 0, 'нет лексического перекрытия → нет цитат');
    const rich = cs.annotateCitations(doc.text, 'BM25 dense RRF rerank каналы fusion', { minScore: 0, maxSpans: 2 });
    assert.ok(rich.spans.length <= 2, 'maxSpans=2');
  });

  it('citationsForProv: отсортированы по позиции, поля docId/start/end/quote', () => {
    const doc = corpus.find((d) => d.id === '06_VERIFICATION_PROVENANCE');
    const cites = cs.citationsForProv(doc.id, doc.text, 'source-count вместо statement-count копии одного URL', { minScore: 0.3 });
    assert.ok(cites.length >= 1);
    for (let i = 1; i < cites.length; i++) assert.ok(cites[i].start >= cites[i - 1].end, 'спаны не пересекаются и по порядку');
    for (const c of cites) {
      assert.equal(c.docId, doc.id);
      assert.ok(c.end > c.start);
      assert.ok(c.quote.length > 0);
    }
  });
});

// ===========================================================================
// П2.7 · PROV-экспорт
// ===========================================================================
describe('П2 · prov-export: PROV-подобная запись цепочки', () => {
  // реальная цепочка: запрос q08 → baseline retrieve → rerank → цитаты из docs/06
  const q = queries.find((x) => x.id === 'q08');
  const doc = corpus.find((d) => d.id === '06_VERIFICATION_PROVENANCE');
  const retrieved = ev.buildBaselineRetriever(corpus)(q.query, 5);
  const reranked = rr.rerank(index, q.query, retrieved, { k: 3 });
  const answer = 'PROV-поля: wasDerivedFrom, wasAttributedTo, generatedAtTime; полная PROV-O в коде не заявлена.';
  const citations = cs.citationsForProv(doc.id, doc.text, answer, { minScore: 0.2 });
  const FIXED_TS = '2026-10-12T00:00:00Z'; // из даты сверки трека — детерминизм теста

  const record = pv.buildProvRecord({
    agent: { id: 'agent:singulyar-search-takt-1076', name: 'SINGULYAR-SEARCH offline chain', role: 'search-agent' },
    query: q.query,
    retrieved,
    reranked,
    answer,
    citations,
    generatedAt: FIXED_TS,
  });

  it('JSON валиден и проходит round-trip stringify→parse→stringify', () => {
    const json = pv.provToJson(record);
    const parsed = JSON.parse(json);
    assert.deepEqual(parsed, record);
    assert.equal(pv.provToJson(parsed), json);
  });

  it('обязательные ключи PROV-словаря на месте: agent/entity/generatedAt/wasDerivedFrom (+activity, wasAttributedTo)', () => {
    const check = pv.validateProvRecord(record);
    assert.deepEqual(check, { ok: true, errors: [] }, JSON.stringify(check.errors));
    assert.equal(typeof record.agent.id, 'string');
    assert.equal(typeof record.entity.id, 'string');
    assert.ok(!Number.isNaN(Date.parse(record.generatedAt)));
    assert.ok(Array.isArray(record.wasDerivedFrom));
    assert.equal(record.wasAttributedTo, record.agent.id);
    assert.deepEqual(record.chain.retrieve, retrieved);
    assert.deepEqual(record.chain.rerank, reranked);
    assert.equal(record.chain.query, q.query);
  });

  it('wasDerivedFrom содержит документ цитат с честными спанами', () => {
    const d = record.wasDerivedFrom.find((x) => x.entity === doc.id);
    assert.ok(d, 'документ ' + doc.id + ' в wasDerivedFrom');
    assert.ok(d.citations.length >= 1, 'есть цитаты');
    for (const c of d.citations) {
      assert.ok(c.end > c.start);
      assert.equal(doc.text.slice(c.start, c.end), c.quote, 'цитата вырезается по смещениям');
    }
  });

  it('детерминизм: те же входы и generatedAt → байт-в-байт та же запись', () => {
    const again = pv.buildProvRecord({
      agent: { id: 'agent:singulyar-search-takt-1076', name: 'SINGULYAR-SEARCH offline chain', role: 'search-agent' },
      query: q.query,
      retrieved,
      reranked,
      answer,
      citations,
      generatedAt: FIXED_TS,
    });
    assert.equal(JSON.stringify(again), JSON.stringify(record));
  });

  it('валидатор ловит сломанные записи (нет ключей, не-ISO время, не-массив wasDerivedFrom)', () => {
    assert.equal(pv.validateProvRecord({}).ok, false);
    const broken = JSON.parse(JSON.stringify(record));
    delete broken.wasDerivedFrom;
    broken.generatedAt = 'вчера';
    const check = pv.validateProvRecord(broken);
    assert.equal(check.ok, false);
    assert.ok(check.errors.some((e) => e.includes('wasDerivedFrom')));
    assert.ok(check.errors.some((e) => e.includes('generatedAt')));
    assert.throws(() => pv.buildProvRecord({ agent: { id: 'x' } }), /обязательного поля/);
  });
});
