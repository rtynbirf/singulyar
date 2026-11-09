# 03 · Архитектура

## Слои двигателя

1. **Человек и цель** — вопрос, ограничения, критерии успеха, формат, разрешения, бюджет.
2. **Координатор исследования** — планирует, распределяет роли, контролирует время/стоимость/остановку по U(a) и политике.
3. **Поиск** — веб (заявлено), индексы, файлы, API; каналы BM25, dense, phrase, coverage, challenge.
4. **Связи** — граф claims/sources/fragments/contradictions; версионирование.
5. **Проверка** — support vs oppose; unique sources; veto.
6. **Альтернативы** — конкурирующие гипотезы, contradiction mining.
7. **Время** — свежесть, история, deprecated.
8. **Мультимодальность** — заявлена в концепции (текст, таблицы, изображения); в коде v1/v2 не реализована.
9. **Общая память доказательств** — Document, Claim, Evidence, Verdict; EvidenceState.
10. **Проверяемый результат** — ответ, источники, аргументы, UNKNOWN, gaps, limitations, следующие действия.

## Evidence-State Controller (эмерджентный слой)

Поверх списка evidence поддерживается состояние:

```
EvidenceState:
  sufficiency: float   # 0..1
  reliability: float
  conflict: float
  uncertainty: float
  gaps: list[str]
  cost_spent: float
  unique_sources: int
```

Обновление после каждого batch поиска и verification. Решение «ответить / искать дальше / UNKNOWN» — функция состояния и политики, не «голосованием LLM».

## Технологическая основа

| Компонент | Начальный выбор | Примечание 2026 |
|---|---|---|
| Полнотекстовый индекс | OpenSearch / SQLite FTS5 | OpenSearch hybrid + knn_vector |
| Семантический поиск | Embedding + vector index | MTEB/BEIR ориентиры; dim 384+ |
| Fusion | RRF k=60 | Default без нормализации scores |
| Rerank | Cross-encoder (опционально) | После fusion, top-M |
| Хранилище | PostgreSQL / SQLite | Entities + relations |
| Provenance | W3C PROV-совместимые поля | Entity / Activity / Agent |
| Координатор | Детерминированный planner + limits | Не LLM-only |
| Качество | Recall@k, nDCG@k, contradiction rate | BEIR-style harness |

## Структура репозитория (целевая v2+)

```
singulyar-search/
  app/
    main.py, config.py, schemas.py, db.py, os_client.py
    graph.py, pipeline.py, verifier.py, planner.py
    orchestrator.py, executor.py, evidence_state.py
    ingest/ (indexer, embedder, chunker, loader)
    search/ (bm25, vector, hybrid, rerank)
    eval/ (beir_eval, metrics)
    agents/ (base, search, verify, contradiction, planner, challenge)
  tests/
  docker-compose.yml
  Dockerfile
  requirements.txt
```

## Поток /ask

1. Parse intent → Claim.
2. make_plan → list of queries.
3. run_parallel_search (roles + hybrid).
4. dedupe → add_evidence.
5. update EvidenceState.
6. verify_claim → Verdict.
7. if U(next) high and budget left → loop.
8. else synthesize: answer | UNKNOWN + gaps + limitations + gate log.
