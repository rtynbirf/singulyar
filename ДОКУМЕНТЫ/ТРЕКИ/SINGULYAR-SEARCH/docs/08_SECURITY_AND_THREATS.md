# 08 · Безопасность и модель угроз

## Угрозы (T-01…T-12)

| ID | Угроза | Митигация |
|---|---|---|
| T-01 | Echo chamber (копии одного источника) | source-count, min_unique_sources |
| T-02 | Устаревшие версии | timestamp, version, challenge |
| T-03 | Ложная предпосылка в запросе | challenge agent, contradiction |
| T-04 | Prompt injection в retrieved content | no execution of content; sandbox |
| T-05 | Отказ / недоступность канала | failover, partial results + limitations |
| T-06 | Resource exhaustion | step budget, cost limit, U(a) stop |
| T-07 | Overconfident generation | UNKNOWN policy, gate |
| T-08 | Скрытие gaps | mandatory limitations block |
| T-09 | Подмена provenance | signed logs / hash-chain (прототип) |
| T-10 | Cross-tenant leakage (multi-tenant) | ACL pre-filter (ориентир) |
| T-11 | Model-suggested unsafe action | host decides; no auto-execute |
| T-12 | Eval overfitting | held-out sets, BEIR-style zero-shot |

## Политика

См. `reference/policy/antihallucination_policy.yaml` и `risk_matrix.yaml`.
