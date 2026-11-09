# 06 · Проверка, противоречия, provenance

## Механизмы

| Механизм | Как | Где |
|---|---|---|
| UNKNOWN | нет evidence / ranked_ids | все версии |
| supported: False | нет evidence / empty snippet | v1 |
| verify_claim | support vs contradict | v2 |
| VerificationAgent | unique sources ≥2 → VERIFIED; conflicting → CONTRADICTORY | симулятор |
| challenge_agent | слова-сигналы | JSON MVP |
| ContradictionAgent | фильтр oppose | v2 |
| Дедуп | id / source hash | v1, v2, JSON |
| Gate | CLAIM→SOURCE→EVIDENCE→TEST→VERDICT | концепция |
| Source-count | копии одного URL = 1 источник | эмерджентный инвариант |

## W3C PROV (ориентир)

- Entity — claim, document, snippet  
- Activity — search, extract, verify  
- Agent — role / human / system  
- wasDerivedFrom, wasAttributedTo, generatedAtTime  

Полная реализация PROV-O в коде v1/v2 **не** заявлена; поля source/timestamp/version — минимальный каркас.

## Антигаллюцинации

Не выдавать уверенный ответ при дефиците независимых доказательств. Строгость: от простого UNKNOWN до verify_claim + EvidenceState.
