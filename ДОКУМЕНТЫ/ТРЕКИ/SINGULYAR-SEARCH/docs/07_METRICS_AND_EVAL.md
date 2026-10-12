# 07 · Метрики и оценка

## Метрики из концепции и каркасов

| Метрика | Где |
|---|---|
| Recall@k | концепция, v1 next, v2 recall_at_k |
| nDCG@k | концепция, v2 ndcg_at_k |
| Полнота доказательств | концепция |
| Точность поддержки утверждений | концепция |
| Обнаружение противоречий | концепция |
| Калибровка уверенности | концепция |
| Задержка / стоимость | концепция |
| BEIR | концепция, v2 beir_eval.py |
| NIST AI RMF | концепция (governance) |

## Ориентиры 2025–2026

- **BEIR** — zero-shot retrieval, headline nDCG@10.
- **MTEB** — embedding quality across tasks; retrieval — один из срезов.
- **RCP-nDCG** — расширение nDCG с rubric-anchored judgments (Cohere 2026).
- **RAGAS** — faithfulness / context recall для end-to-end (ориентир, не замена retrieval metrics).

## Сравнение минимум 4 вариантов

1. Полнотекстовый (BM25).
2. Семантический (dense).
3. Hybrid + RRF (± rerank).
4. Hybrid + adaptive plan + verification (SINGULYAR-контур).

## Обязательные испытания (из концепции)

Редкий термин / имя / код / цитата; multi-source вопрос; устаревшая документация; копии одного первоисточника; ложная предпосылка; недостаточные сведения → UNKNOWN; отказ агента; prompt injection в контенте.
