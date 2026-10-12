# СИНГУЛЯР · ЛАДОМ — полный комплект поставки

Дата: 2026-10-12

## Быстрый старт

1. Откройте **`LADOM_SINGULAR_COMPOSITION_v1.html`** в браузере (двойной клик или file://).
2. Сеть и API-ключ **не нужны**.
3. Добавляйте visual / music / event регионы, перетаскивайте, экспортируйте JSON, включайте/выключайте адаптеры.

## Состав архива

| Файл / папка | Назначение |
|---|---|
| **LADOM_SINGULAR_COMPOSITION_v1.html** | Главный рабочий прототип: единый IR (visual+music+event), валидатор, undo, снимки, партитура, адаптеры TTS/вибро/пульс |
| **LADOM_SINGULAR_TZ_AND_ROADMAP.md** | Полное ТЗ, архитектура, Definition of Done, дорожная карта P0→P4 |
| ladom-layout-studio-p0.html | Более ранний P0 только layout-регионов |
| P0_DELIVERY_RU.md | Краткое описание layout-studio P0 |
| 09_ARCHITECTURE_BLUEPRINT_RU.md | Архитектурный чертёж layout-first системы |
| 08_EXPERIMENT_PLAN_RU.md | План экспериментов и метрики |
| 07_RESEARCH_MATRIX_RU.md | Матрица смежных областей |
| 10_SOURCE_TRUST_AND_UNKNOWN_RU.md | Реестр достоверности источников |
| reve_sdk_delivery/ | Аудит Reve SDK, ТЗ адаптера, acceptance tests, пример JSON, ранний HTML |

## Принцип

Произведение = структура (Composition IR).  
Восприятие и рендер = сменные адаптеры.  
Совместность возникает из общего IR, а не из одинакового интерфейса.

## Ограничения P0

- Нет вызовов Reve API и нет токена.
- TTS/вибрация — браузерные API (могут быть недоступны).
- Multi-device sync, Web Audio синтез, OCR QA — этапы P1–P4 (см. ТЗ).
