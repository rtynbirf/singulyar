# SINGULYAR SEARCH · ЕДИНЫЙ АРХИВ v1.0

Эмерджентный поисковый двигатель с мультиагентной проверкой доказательств, явным состоянием evidence-state, gate CLAIM→SOURCE→EVIDENCE→TEST→VERDICT и обязательным исходом UNKNOWN.

Полная систематизация всех предоставленных артефактов (концепция, псевдокод, симулятор, локальные MVP, сервисные каркасы v1/v2), сверка с актуальными мировыми практиками hybrid retrieval / multi-agent RAG / provenance на 2026-10-12, собственный эмерджентный вклад, полное техническое задание, каталог, референс-код, интерактивный прототип и пошаговая дорожная карта реализации.

> Проектная спецификация и систематизация. Не утверждается, что код запущен в продакшене или сертифицирован. Всё, что в исходных текстах названо «runnable», «MVP» или «прототип», сохранено как заявление источника. Внешние тренды приведены как ориентиры для проектирования, а не как утверждение о готовности продукта.

## С чего начать (5 минут)

1. Откройте `prototype/index.html` двойным щелчком (сервер и интернет не нужны) — «Пульт исследования»: цель → план по волнам → параллельные роли → граф доказательств → evidence-state → gate → вердикт / UNKNOWN; лаборатория атак на эхо-камеру и ложные предпосылки.
2. Прочитайте `docs/00_AUDIT_AND_CATALOG.md` — карта артефактов A–H и статус каждого.
3. Прочитайте `docs/01_VISION_AND_EMERGENT.md` — главный принцип и **собственный эмерджентный вклад** (то, чего нет в исходных файлах как готовой формулировки).
4. Выполните `cd reference/search_core && python3 -m pytest -q` — тесты ядра (симулятор, verifier, utility, metrics).
5. Для реализации идите по `docs/10_IMPLEMENTATION_GUIDE.md` и `docs/12_ROADMAP_AND_BACKLOG.md`.

## Состав

| Путь | Содержимое |
|---|---|
| `docs/00_AUDIT_AND_CATALOG.md` | аудит, карта артефактов A–H, статусы, слои |
| `docs/01_VISION_AND_EMERGENT.md` | видение, 5 опор, **эмерджентное сингулярное свойство**, инварианты |
| `docs/02_TZ.md` | **полное техническое задание**: FR / NFR / IF / DR, критерии приёмки |
| `docs/03_ARCHITECTURE.md` | слои, координатор, память доказательств, evidence-state controller |
| `docs/04_MULTIAGENT_AND_ROLES.md` | роли, правила, utility U(a), отличие от LLM-роя |
| `docs/05_SEARCH_AND_FUSION.md` | BM25, dense, RRF, rerank, chunking — с опорой на практики 2025–2026 |
| `docs/06_VERIFICATION_PROVENANCE.md` | UNKNOWN, contradictions, W3C PROV, source-count vs statement-count |
| `docs/07_METRICS_AND_EVAL.md` | Recall@k, nDCG@k, BEIR, MTEB, RCP-nDCG, RAGAS-ориентиры |
| `docs/08_SECURITY_AND_THREATS.md` | модель угроз T-01…T-12, prompt injection, echo chamber |
| `docs/09_DATA_MODELS.md` | модели данных от SQLite до v2 evidence graph |
| `docs/10_IMPLEMENTATION_GUIDE.md` | **пошаговая инструкция** (шаги 0–16) |
| `docs/11_TEST_AND_EVAL_PLAN.md` | тесты, атаки, eval harness, приёмка |
| `docs/12_ROADMAP_AND_BACKLOG.md` | фазы, бэклог, риски, приоритеты |
| `docs/13_SOURCES_AND_TRENDS.md` | источники и тренды 2025–2026 (hybrid, multi-agent RAG, PROV) |
| `catalog/` | catalog.csv, catalog.json, stats, build script |
| `reference/search_core/` | ядро: models, agents, utility, metrics, corpus + тесты |
| `reference/schemas/` | JSON Schema: Claim, Evidence, Verdict, Plan, EvidenceState |
| `reference/policy/` | antihallucination_policy, risk_matrix |
| `reference/deploy/` | docker-compose reference (OpenSearch + Postgres) |
| `prototype/index.html` | интерактивный прототип (самодостаточный) |

## Ключевые решения (кратко)

- Человек задаёт цель; система не скрывает неопределённость и не отнимает контроль.
- **UNKNOWN** — обязательный исход при недостатке независимых доказательств.
- Согласие нескольких ролей на **одном источнике** не считается независимым подтверждением (source-count, не statement-count).
- Gate: `CLAIM → SOURCE → EVIDENCE → TEST → VERDICT` логируется полностью.
- Utility следующего шага: \( U(a) = \mathbb{E}[\Delta Q \mid a] / \mathrm{Cost}(a) \).
- Программные роли с разными алгоритмами — не «рой LLM»; verifier вправе отклонить координатора.
- Hybrid retrieval (BM25 + dense + RRF k=60) + cross-encoder rerank — рабочий стандарт 2025–2026; SINGULYAR добавляет поверх него evidence-state и gate.

## Что проверено, а что нет

Проверено: структура каталога, согласованность статусов A–H, 8+ тестов ядра, прототип открывается без сервера, schema-валидность на уровне структуры.
Не проверено: Docker/OpenSearch/PostgreSQL (требуют инфраструктуры), реальный Recall@k на полном BEIR, веб-коннекторы, юридическая корректность.

## Версия и воспроизводимость

Дата сверки стандартов и трендов: 2026-10-12. Каталог пересобирается: `python3 catalog/build_catalog.py`.

## Такт v10.80 «ХВОСТЫ» — офлайн-контур поиска (допись · Task ID 1076-D)

Машинная часть бэклога трека (см. `docs/12_ROADMAP_AND_BACKLOG.md`, пункты 1/3/5/7): eval set, rerank, citation spans, PROV-экспорт. Всё офлайн, 0 сети, ES-модули без внешних зависимостей.

| Путь | Содержимое |
|---|---|
| `src/eval-set.mjs` | токенизация ru/en, `mrrAtK` / `meanMrr`, baseline-ретривер (TF + буст заголовка ×2), `runEval`, загрузчики `loadCorpusDir` / `loadQueries` |
| `src/rerank.mjs` | офлайн-переранжир Okapi BM25 (k1=1.5, b=0.75): `buildIndex` / `bm25Score` / `rerank` / `buildReranker` |
| `src/citation-spans.mjs` | `splitSentences` с абсолютными смещениями (инвариант `docText.slice(start,end) === text`) + `annotateCitations` (лексическое перекрытие, minScore/maxSpans) + `citationsForProv` |
| `src/prov-export.mjs` | `buildProvRecord` / `validateProvRecord` / `provToJson` — PROV-подобный экспорт `singulyar.prov-like/0.1` |
| `tests/fixtures/eval/queries.json` | фиксированный eval-набор: 20 запросов ru/en с qrels по топику (не по вхождению слова) |
| `tests/test_takt_10.80_search.mjs` | 26 тестов node:test на реальном корпусе трека (docs/*.md + README.md = 16 документов) |

### Формат PROV-экспорта (`singulyar.prov-like/0.1`)

Имена полей выровнены на словарь W3C PROV (`docs/06_VERIFICATION_PROVENANCE.md`); полная PROV-O онтология не заявлена — минимальный честный каркас цепочки «запрос → ретрив → реранк → ответ → цитаты»:

```json
{
  "format": "singulyar.prov-like/0.1",
  "agent":          { "id", "type": "SoftwareAgent", "name", "role" },
  "entity":         { "id", "type": "Answer", "content", "citationsCount" },
  "activity":       { "id", "type": "SearchChain", "steps": ["retrieve","rerank","answer","cite"] },
  "generatedAt":    "<ISO-8601>",
  "wasAttributedTo": "<agent.id>",
  "wasDerivedFrom": [ { "entity": "<docId>", "role": "evidence|context",
                        "citations": [ { "start", "end", "quote" } ] } ],
  "chain": { "query", "retrieve": ["<docId>…"], "rerank": ["<docId>…"], "answer" }
}
```

Смещения цитат — в символах исходного документа (`docText.slice(start, end) === quote`); документы цепочки без цитат честно помечены `role: "context"`.

### Числа (прогон в тестах печатает таблицы по всем 20 запросам)

- Корпус: собственные документы трека (`docs/*.md` + `README.md`, 16 документов); запросы — `tests/fixtures/eval/queries.json`.
- **MRR@10 baseline** (лексический TF) = **0.5660**.
- **MRR@10 + офлайн BM25-переранжир** = **0.8158** (Δ +0.2498; восемь запросов поднимаются на ранг 1 — q05, q06, q08, q11, q12, q13, q15, q17, ещё три улучшают ранг — q02, q04, q09; q20 без изменений; единственный честный спад — q07: BM25 нормализует длину документа иначе, чем TF-буст заголовка).
- Citation spans: в живом `docs/06` аннотатор находит спан про UNKNOWN с покрытием 0.6; частичный парафраз даёт ~0.43 — лексическая граница (без морфологии/синонимии) задокументирована в шапке модуля.
- Честная самоссылочность: `README.md` входит в корпус (как заявлено в queries.json), поэтому правка этого README меняет статистику корпуса и сами числа — числа выше сняты на ЭТОМ тексте README; при будущих правках README их нужно переснять (`node --test tests/test_takt_10.80_search.mjs`).

### Честные границы

- Rerank — офлайн-лексическая замена cross-encoder (модель/сеть не требуются); настоящая замена на cross-encoder и dense-канал остаётся открытой строкой бэклога.
- qrels ставились по ТОПИКУ запроса; промахи baseline-а на многословных документах — данные eval-а, а не ошибка разметки.
- README обновлён дописью: всё выше этого раздела байт-в-байт равно main.
