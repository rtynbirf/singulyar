# 11 · План тестирования и оценки

## Юнит-тесты ядра
- SearchAgent возвращает релевантные документы
- VerificationAgent: CONTRADICTORY / VERIFIED / UNVERIFIED
- Coordinator research → статус из допустимого множества
- U(a) выше для uncertain claim
- recall_at_k, ndcg_at_k

## Сценарии прототипа
1. Достаточные независимые источники → SUPPORTED
2. Conflict > support → CONTRADICTED
3. Пустой корпус → UNKNOWN
4. Один источник → UNKNOWN / echo-chamber warning
5. Challenge signals в тексте

## Eval harness
- Контрольный набор запросов + qrels
- Сравнение BM25 / dense / hybrid / hybrid+verify
- Регрессия при изменении chunking / weights

## Атаки
- Prompt injection в document text
- Массовые копии одного URL
- Устаревший manual vs новый doc
- Запрос с ложной предпосылкой
