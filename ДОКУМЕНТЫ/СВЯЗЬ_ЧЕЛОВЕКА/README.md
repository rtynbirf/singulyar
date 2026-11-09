# СВЯЗЬ ЧЕЛОВЕКА — пакет владельца v0.1 (принят тактом v11.27 «СВЯЗЬ», С105)

> Источник: блокнот владельца `notebook.google.com_1` (14 окт. 2026, 2-я выгрузка, 25 источников Google Drive — сессия NotebookLM «Контур человеческой связи»). Приказ владельца: «ВСЁ И ВСЯ ВНЕСТИ В ДОРОЖНУЮ КАРТУ И ВСЁ ИНТЕГРИРОВАТЬ В ПРОЕКТ И ДОДЕЛЫВАТЬ ВСЕ хВОСТЫ РАННИЕ ЧТО НЕ ДОДЕЛАНЫ В ПРИНУДИТЕЛЬНОМ ПОРЯДКЕ!!!» (trace 1a139f1c5afdbf25).
> Дисциплина приёмки: байты владельца не тронуты; SHA256-реестр — [SHA256SUMS](SHA256SUMS); интеграционный контракт — [integration/DOOR-INTEGRATION.md](ПАКЕТ_v0.1/integration/DOOR-INTEGRATION.md) (соблюдён: минимальный diff, ·53 свободна, исходные ссылки хаба сверены до/после).

## Что здесь лежит

- [ПАКЕТ_v0.1/](ПАКЕТ_v0.1/README_RU.md) — финальный инженерный бандл владельца целиком (17 файлов): `prototype/index.html`, `spec/` (архитектура, ТЗ, модель угроз, протокол, контракт адаптеров, ADR, JSON-схема), `integration/` (DOOR-INTEGRATION, CONTEXT-MAP), `roadmap/` (ROADMAP, WORK_BREAKDOWN), `tests/` (ACCEPTANCE, validate_bundle.py), `research/SOURCES.md`, `MANIFEST.sha256`.
- [ЯДРО_PYTHON/singulyar_core.py](ЯДРО_PYTHON/singulyar_core.py) — исполняемое ядро v0.1: объектная модель, SHA-256 манифест, машина состояний (draft → locally_saved → queued → attempting → accepted_by_transport → acknowledged_by_recipient → read), RelationshipStore, LocalAdapter/FileExportAdapter, ConformanceTestSuite.
- [СБОРКИ_ИСТОРИЯ/](СБОРКИ_ИСТОРИЯ/) — 9 архивов эволюции сессии как есть: ядро v0.1 → emergent v0.2 (синтез 6 агентов) → integrated-full v0.3 (интеграционный патч ·53) → production-engine v0.4 (IndexedDB + E2EE + invite-токены + EmailAdapter + ValueAdapter) → v1.0 Final (CI/CD deploy.yml) → v1.1 (pr_check.yml + ISSUE_TEMPLATE) → v1.2 (патчи BUG-01…BUG-05: Tamper-Evident Guard, Idempotency Vault, хеш-цепочки аудита, Intent Spawner, from_dict) → meta-year → emergent_singular_full.
- [ИСТОЧНИК/](ИСТОЧНИК/) — блокнот владельца (текст сессии) + визуальные артефакты `MATRIX_PUNCH.html`, `SINGULYAR.html`. Внимание: оба HTML тянут внешние шрифты Google Fonts — это артефакт источника; в дом не подключается, в пре-кэш не встаёт, в двери не вшивается (закон дома: ноль внешних скриптов и шрифтов).

## Поверка пакета (измерено, 2026-10-14)

| Проба | Результат |
|---|---|
| `python3 tests/validate_bundle.py` | PASS (обязательные файлы, JSON-схема, маркеры честности/a11y прототипа, ноль внешних script-тегов) |
| `python3 singulyar_core.py` (ConformanceTestSuite) | ALL 7 CONFORMANCE TESTS PASSED |
| `sha256sum -c MANIFEST.sha256` | 17/17 OK |
| Дом-реестр приёмки | SHA256SUMS, 32 файла, 478 871 Б |

## Дверь ·53 СВЯЗЬ ЧЕЛОВЕКА

Собрана из `prototype/index.html` пакета по контракту DOOR-INTEGRATION: байты прототипа владельца не тронуты (контент, стили, скрипт), дом-обвязка по канону ·38 — КОРД, CSP-постур А, canonical/og-меты, manifest/favicon, sg-registry (организм-бирка), навигатор SG65, такт-штамп. Файл: [../../СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html](../../СИНГУЛЯР_53_СВЯЗЬ_ЧЕЛОВЕКА.html).

## Честный статус (из README пакета, не смягчён)

Работает локально в одном браузере: контакты, намерения, журнал, экспорт/импорт, профиль доступности. Не реализовано в v0.1: реальная доставка, E2EE, звонки, почтовый сервер, виртуальный номер, eSIM, SMS, платёжная сеть, синхронизация — всё честно помечено «не подключён» в интерфейсе и запроектировано сменяемыми адаптерами (инвариант «Намерение ≠ Транспорт»).
