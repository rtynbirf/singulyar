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
