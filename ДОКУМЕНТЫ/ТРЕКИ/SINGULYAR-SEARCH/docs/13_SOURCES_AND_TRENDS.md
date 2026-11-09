# 13 · Источники и тренды (сверка 2026-10-12)

## Исходный корпус
Файлы A–H (см. docs/00). Только они задают заявления о «runnable» / MVP.

## Тренды hybrid retrieval 2025–2026
- Hybrid (BM25 + dense) + RRF k=60 — default production pattern.
- Rerank cross-encoder после fusion даёт существенный прирост top-k precision.
- Raw score mixing BM25+cosine без нормализации — антипаттерн; RRF обходит проблему.
- Chunking и contextual embeddings часто важнее смены embedding-модели.
- OpenSearch: hybrid query + search pipeline; knn_vector; native sparse ANN (3.x).

## Multi-agent RAG
- MA-RAG, MASS-RAG и аналоги: role-specialized agents + synthesis.
- Verification / admissibility of retrieved memory — отдельный контур (2026 papers).
- «Copies or sources»: агрегатор должен считать источники, не пересказы.

## Provenance
- W3C PROV-DM / PROV-O: Entity, Activity, Agent.
- TRACE / inference-time provenance для AI-mediated scholarly content (2026).

## Evaluation
- BEIR nDCG@10; MTEB retrieval subset; RCP-nDCG; RAGAS для faithfulness.

## Как использовать
Тренды — **ориентиры проектирования**. Они не превращают исходные MVP в production-ready продукт и не отменяют UNKNOWN.
