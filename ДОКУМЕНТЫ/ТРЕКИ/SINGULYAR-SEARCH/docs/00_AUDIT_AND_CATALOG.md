# 00 · Аудит и полный каталог артефактов SINGULYAR SEARCH

## Режим антигаллюцинаций

**Источник данных (обязательный контур):** только предоставленные файлы:
1. `Emergent search engine prototyping.txt` — первый и последний фрагмент (дубликат).
2. `# SINGULYAR SEARCH — эмерджентный поисковый.txt` — концепция.
3. `Prototype emergent search engine.txt` — диалог с псевдокодом мультиагентной схемы.
4. `ТЫ ПОЛИМАТ=МУЛЬТИАГЕНТ, А НЕ ДЕГЕНЕРАТ.txt` — высокоуровневый симулятор ESE.
5. `Emergent search engine prototype.txt` — сборка FastAPI + OpenSearch + PostgreSQL v1.
6. `## SINGULYAR SEARCH v2.txt` — расширенный каркас v2: vector index, evidence graph, BEIR-style eval.

**Дополнительный контур (ориентиры, не факты о продукте):** открытые публикации и практики 2025–2026 по hybrid retrieval, multi-agent RAG, provenance (W3C PROV), BEIR/MTEB. Они используются для проектирования и сравнения, но **не** подменяют заявления исходных файлов.

**Что НЕ делается:**
- Не утверждается, что код запущен, протестирован в продакшене или работоспособен на всём вебе.
- Не добавляются внешние «факты» о готовности продукта.
- Всё, что не подтверждено предоставленными текстами, помечается `UNKNOWN` или «требует проверки».
- Тренды 2025–2026 явно отделены от исходного корпуса.

## Статусы в каталоге

| Статус | Значение |
|---|---|
| `КОНЦЕПЦИЯ` | проектная идея, без кода |
| `ПСЕВДОКОД` | логика без полной реализации |
| `СИМУЛЯТОР` | упрощённая исполняемая модель |
| `ЛОКАЛЬНЫЙ RUNNABLE MVP` | заявлен запуск без внешних сервисов |
| `СЕРВИСНЫЙ КАРКАС` | FastAPI + OpenSearch + PostgreSQL, требует инфраструктуры |
| `РАСШИРЕННЫЙ КАРКАС` | vector, evidence graph, eval, agents |
| `ДУБЛИКАТ` | повторяет другой файл |

## Общая карта артефактов

| ID | Файл | Тип | Версия / роль | Ключевое содержание | Статус |
|---|---|---|---|---|---|
| A | `# SINGULYAR SEARCH — эмерджентный поисковый.txt` | Концепция | Архитектура ESE | Принципы, слои, алгоритм ESE, мультиагентность, техстек, этапы, метрики, gate | `КОНЦЕПЦИЯ` |
| B | `Prototype emergent search engine.txt` | Диалог + псевдокод | Мультиагентная схема | 6 агентов: архитектор, поисковик, граф-строитель, верификатор, селектор, синтезатор | `ПСЕВДОКОД` |
| C | `ТЫ ПОЛИМАТ=МУЛЬТИАГЕНТ...txt` | Симулятор | Высокоуровневый ESE | Evidence, Claim, SearchAgent, VerificationAgent, CoordinatorAgent, utility U(a) | `СИМУЛЯТОР` |
| D | `Emergent search engine prototyping.txt` (первый) | Локальный MVP | SQLite FTS5 | singulyar.py: add/search, BM25, FTS5, UNKNOWN | `ЛОКАЛЬНЫЙ RUNNABLE MVP` |
| E | `Emergent search engine prototyping.txt` (второй) | Локальный параллельный MVP | JSON + роли | 5 ролей: lexical, phrase, coverage, provenance, challenge; ThreadPoolExecutor | `ЛОКАЛЬНЫЙ RUNNABLE MVP` |
| F | `Emergent search engine prototype.txt` | Сервисный каркас | v1 | FastAPI + OpenSearch + PostgreSQL + RRF + /ingest, /search, /ask | `СЕРВИСНЫЙ КАРКАС` |
| G | `## SINGULYAR SEARCH v2.txt` | Расширенный каркас | v2 | vector index, evidence graph, claim/source/evidence/test/verdict, parallel executor, BEIR eval | `РАСШИРЕННЫЙ КАРКАС` |
| H | `Emergent search engine prototyping.txt` (последний) | Дубликат | Повтор D/E | Совпадает с первым файлом | `ДУБЛИКАТ` |

## Слои реализации (сводка)

| Слой | Компоненты | Где реализован / заявлен |
|---|---|---|
| Интерфейс | CLI, FastAPI | SQLite MVP, JSON MVP, v1, v2 |
| Координация | Planner, Orchestrator, CoordinatorAgent | JSON MVP, симулятор, v1, v2 |
| Поиск | BM25, FTS5, vector, semantic, hybrid, RRF | SQLite MVP, JSON MVP, v1, v2 |
| Связи | Evidence graph, PROV-идея, source_registry | JSON MVP, v2 |
| Проверка | Verifier, VerificationAgent, challenge_agent | JSON MVP, симулятор, v1, v2 |
| Альтернативы | ContradictionAgent, potential_disagreements | JSON MVP, v2 |
| Время | date, timestamp, version | JSON MVP, симулятор, v1, v2 |
| Мультимодальность | заявлена в концепции | только концепция |
| Память доказательств | EvidenceRecord, Claim, Evidence, Verdict | v1, v2 |
| Результат | AnswerOut, synthesis | все версии |

## Итог аудита

Систематизировано по предоставленным текстам. Ни один код не запускался в продакшене в рамках данного пакета. Статусы «runnable»/«MVP» сохранены как заявления источников. Дополнительный контур трендов 2025–2026 вынесен в `docs/13_SOURCES_AND_TRENDS.md` и в эмерджентный вклад `docs/01_VISION_AND_EMERGENT.md`.
