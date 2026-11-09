# Реестр доказательств: CLAIM → CODE → OFFICIAL SPEC → TEST → VERDICT

| ID | CLAIM | CODE / наблюдаемый артефакт | OFFICIAL SPEC / источник | TEST | VERDICT |
|---|---|---|---|---|---|
| R-01 | Репозиторий позиционирует себя как SDK для Reve image API | Репозиторий и каталоги SDK | https://github.com/reve-ai/reve-sdk | Осмотр README/структуры в предыдущем ходе | VERIFIED (по публичному README) |
| R-02 | Python API v1 включает create/remix/edit и вспомогательные операции | Python README | https://raw.githubusercontent.com/reve-ai/reve-sdk/main/python/README.md | Документарная сверка; не live API | DOC-VERIFIED |
| R-03 | API v2 предоставляет workflow layout/create/render/extract/reconcile | Python README и skill | ссылки в `01_AUDIT_RU.md` | Примерный pipeline документирован; реальный токен не использован | DOC-VERIFIED, API-RUN UNKNOWN |
| R-04 | Layout использует регионы с bbox и текстовыми полями | README/пример | Python README | В прототипе реализована локальная модель регионов | PARTIALLY VERIFIED; локальная модель не доказывает точную API-схему |
| R-05 | Можно изменять layout командами add/shift/remove/place/keep/change | Skill | SKILL.md | Проверка по документации, без вызова удалённого сервиса | DOC-VERIFIED |
| R-06 | Web SDK не скрывает токен от пользователя в браузере | README говорит об обёртке fetch; браузерный контекст публичен | Web SDK README | Архитектурный анализ | SECURITY CONSEQUENCE VERIFIED; реализация приложения должна проверяться отдельно |
| R-07 | Nodes example — production-ready сервис | README описывает demo и ограничения | Nodes README | Сопоставление заявленных ограничений | REJECTED: документация указывает на demo-статус |
| R-08 | SDK раскрывает точный внутренний алгоритм модели | В репозитории SDK нет полного обучения/весов/внутреннего sampler | публичный SDK и его документация | Поиск соответствующих контрактов в исследованных файлах | NOT ESTABLISHED / UNKNOWN |
| R-09 | Локальный редактор экспортирует/импортирует JSON и позволяет менять bbox | `ladom-composition-studio.html` | локальный код прототипа | Ручные тесты из `05_ACCEPTANCE_TESTS.md` | Требует выполнения тестов в браузере; не заявлять автоматический PASS без запуска |
| R-10 | Комплект интегрирован с настоящим Reve API | API token отсутствует; сетевые вызовы не запускались | API docs | Не выполнялся | NOT TESTED |

## Правило обновления
Каждое новое утверждение должно иметь ссылку на конкретный исходник/версию, тестовый сценарий, результат и дату. `UNKNOWN` — корректный итог при недостатке доказательств, а не приглашение заменить отсутствие данных выдумкой.
