# 12 · Дорожная карта и бэклог

## Фазы (из концепции + прототипов)

| Фаза | Содержание | Статус в исходниках |
|---|---|---|
| P0 | Доказательный MVP (FTS + UNKNOWN) | заявлено runnable |
| P1 | Параллельные роли + challenge | заявлено runnable |
| P2 | Симулятор ESE + U(a) | симулятор |
| P3 | FastAPI + OpenSearch + PG v1 | сервисный каркас |
| P4 | v2 vector + graph + BEIR scaffold | расширенный каркас |
| P5 | Chunking, citations, contradiction mining, strict UNKNOWN, rerank | next commit (заявлено) |
| P6 | EvidenceState controller + gate journal | эмерджентный слой пакета |
| P7 | Федеративный поиск (один домен) | концепция |
| P8 | Self-improvement under audit | концепция |

## Бэклог (приоритет)

1. Eval set + baseline BM25/dense/hybrid numbers
2. Real embeddings at ingest (не stub)
3. Cross-encoder rerank
4. min_unique_sources policy wired into /ask
5. Citation spans
6. Contradiction beyond keyword filter
7. PROV-compatible export
8. Web connector (read-only, sandboxed)
9. Multi-modal (таблицы) — после текстового контура

## Риски

- Переоценка «runnable» без инфраструктуры
- Эхо-камеры на веб-корпусе
- Стоимость dense + rerank
- Prompt injection
- Отсутствие qrels → невозможность доказать качество
