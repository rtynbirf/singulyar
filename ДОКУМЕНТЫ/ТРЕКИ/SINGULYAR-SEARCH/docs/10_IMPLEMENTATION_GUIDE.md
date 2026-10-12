# 10 · Пошаговая инструкция по реализации

## Шаг 0 — Окружение
Python 3.11+, pytest. Опционально Docker для OpenSearch/Postgres.

## Шаг 1 — SQLite FTS5 MVP
Реализовать singulyar.py: connect, add_document, search (MATCH + bm25), make_excerpt, UNKNOWN. Тестовый набор запросов.

## Шаг 2 — JSON параллельные роли
5 агентов (lexical, phrase, coverage, provenance, challenge) + ThreadPoolExecutor. Веса и ranked_ids. Limitations в ответе.

## Шаг 3 — Симулятор ESE
dataclasses Evidence/Claim; SearchAgent; VerificationAgent; CoordinatorAgent; U(a); research loop; synthesize.

## Шаг 4 — Сервисный каркас v1
FastAPI, OpenSearch, PostgreSQL, RRF, /ingest /search /ask. Semantic/rerank могут быть stubs.

## Шаг 5 — v2
knn_vector, evidence graph, claim→source→evidence→test→verdict, parallel executor, BEIR scaffold, agents package.

## Шаг 6 — Chunker + loader
Контекстные чанки; ingest pipeline; embeddings при ingest.

## Шаг 7 — Citation spans
Привязка snippet к offsets в документе.

## Шаг 8 — Contradiction mining
Замена примитивного "not"-фильтра на сопоставление claim vs oppose evidence.

## Шаг 9 — Strict UNKNOWN
Политика AH-*: min_unique_sources, empty → UNKNOWN always.

## Шаг 10 — Reranker
Cross-encoder на top-M после RRF.

## Шаг 11 — EvidenceState controller
Явное состояние sufficiency/conflict/gaps; решение stop/continue/unknown.

## Шаг 12 — Eval harness
Recall@k, nDCG@k на своём qrels; опционально subset BEIR.

## Шаг 13 — Gate journal
Персистентный лог CLAIM→…→VERDICT (hash-chain опционально).

## Шаг 14 — Федеративный поиск (фаза)
Веб / научные каталоги / локальные файлы — по одному домену за раз.

## Шаг 15 — Self-improvement under audit
Предложения изменений только после регрессионных тестов.

## Шаг 16 — Приёмка
Критерии A1–A7 из ТЗ; человеческий review limitations и UNKNOWN.

**Приоритет:** сначала качество hybrid + verification на воспроизводимых тестах; только потом масштабирование роя и веба.
