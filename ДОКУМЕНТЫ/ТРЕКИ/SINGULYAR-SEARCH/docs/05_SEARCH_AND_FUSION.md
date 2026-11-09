# 05 · Поисковые каналы и fusion (с практиками 2025–2026)

## Каналы

| Канал | Реализация | Версии |
|---|---|---|
| FTS5 BM25 | SQLite MATCH, bm25() | SQLite MVP |
| Лексический / фразовый / coverage | JSON MVP | JSON MVP |
| Challenge | слова-сигналы несогласия | JSON MVP |
| BM25 OpenSearch | multi_match title^2, text | v1, v2 |
| Vector kNN | knn_vector (dim 384+) | v2 |
| Semantic | заглушка в v1 | v1 |
| RRF | rank fusion k=60 | v1, v2 |
| Rerank | заглушка / заявлен | v1, v2 |

## Практики 2025–2026 (ориентиры)

- **Hybrid first:** BM25 + dense, не «сначала только vector».
- **RRF k=60** — zero-config default; не смешивать raw BM25 и cosine без нормализации.
- **Rerank:** cross-encoder на top-M после fusion; MMR для дедупа near-duplicates.
- **Chunking:** контекстные чанки важнее «ещё одной модели»; не рвать таблицы/код.
- **Метрики:** Hybrid часто +10–20 pp Recall@10 vs dense-only на смешанных корпусах; точные цифры — только на своём eval set.

## RRF

\[
\mathrm{score}(d)=\sum_r \frac{1}{k+\mathrm{rank}_r(d)},\quad k=60
\]

Документ, попавший в несколько списков, усиливается; нормализация scores не нужна.
