# 04 · Мультиагентность и роли

## Правила (из концепции, усиленные)

1. Агенты получают **разные** задачи, а не повторяют один запрос.
2. Согласие нескольких агентов **не** считается независимым подтверждением, если источник один (source-count).
3. Проверяющий агент вправе отклонить вывод координатора (verifier veto).
4. Все результаты сохраняются в общей структуре данных.
5. Каждый агент ограничен доступом, временем, шагами, бюджетом.

## Роли

| Роль | Задача | Где |
|---|---|---|
| Planner / Architect | план, stop criteria | псевдокод, v1, v2 |
| Searcher | BM25, dense, hybrid | псевдокод, v1, v2 |
| Graph builder | claims, sources, fragments | псевдокод, v2 |
| Verifier | первоисточник, даты, независимость, противоречия | псевдокод, симулятор, v1, v2 |
| Selector | U(a) | псевдокод, симулятор |
| Synthesizer | финальный ответ / UNKNOWN | псевдокод |
| Lexical / Phrase / Coverage / Provenance / Challenge | JSON MVP | JSON MVP |
| SearchAgent / VerificationAgent / CoordinatorAgent | симулятор | симулятор |
| ContradictionAgent | oppose signals | v2 |

**Важно:** это **программные роли** с разными алгоритмами, а не независимые языковые модели. LLM может использоваться внутри роли, но политика и verifier — детерминированный слой.

## Utility

\[
U(a)=\frac{\mathbb{E}[\Delta Q\mid a]}{\operatorname{Cost}(a)}
\]

Калибровка — отдельная задача (eval harness + human labels).
