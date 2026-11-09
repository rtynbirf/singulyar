# СИНГУЛЯР · ЛАДОМ — Эмерджентная композиция

**Дата:** 2026-10-12  
**Статус:** сформулированная задача · прототип IR · ТЗ · дорожная карта  
**Артефакты:** `LADOM_SINGULAR_COMPOSITION_v1.html` · этот документ

---

## 1. Задача (сформулирована целиком)

Не «добавить фичи в караоке» и не «скопировать Reve».

**Задача:** сделать **одно редактируемое произведение**, в котором  
музыкальная структура, визуальная композиция, тактильные сигналы и совместные действия людей  
являются **разными представлениями одного Layout IR**.

Тот же принцип, который Reve применил к изображению («layout вместо английского промпта»),  
переносится на совместное событие: **структура первично, renderer/адаптер — сменный**.

Человек не подстраивается под интерфейс.  
Среда согласует разные способы восприятия и действия вокруг **общей структуры**.

---

## 2. Сверка с мировыми практиками 2025–2026

| Практика | Источник | Что берём | Что не копируем |
|---|---|---|---|
| Layout как IR | Reve «The Layout Bet», API v2 create/render/extract/reconcile | Иерархия регионов, bbox, локальный prompt, отделение plan от paint | Внутренности модели, Qwen-гипотезы, «native 4K» без теста |
| Think → Plan → Paint | ATLAS (arXiv 2607.16409, 2026) | Layout как мост reasoning → generation | Масштаб 80B, RL-alignment как обязательный шаг MVP |
| Spatial canvas | Compo (arXiv 2610.12230) | Пользователь расставляет области до генерации | Только постерный домен |
| Scene graph → layout → image | SG2IM-линия, InstanceAssemble, SSMG | Явные отношения и слои | Полный GCN-pipeline в браузере |
| Адаптеры / multi-view | WCAG 2.2, WAI-ARIA APG | Независимые каналы, отключение без поломки | Формальный сертификат ≠ UX для всех |
| Collaborative audio | Web Audio Modules, AudioWorklet, SeqRoom, sequencer.party, CRDT | Низколатентный локальный движок, синхр. состояния | Обязательный сервер в P0 |
| Offline-first | Service Worker, IndexedDB (MDN) | Работа без сети для структуры | Background Sync не везде |

**Вывод сверки:** прогрессивный тренд — **структурированное промежуточное представление + независимые исполнители**.  
Эмерджентность возникает, когда один IR кормит визуал, речь, вибрацию, партитуру и (позже) renderer изображений/аудио.

---

## 3. Эмерджентная архитектура (синтез)

```
ЧЕЛОВЕК / НАМЕРЕНИЕ
  спеть · передать очередь · изменить партию · сдвинуть объект · сохранить

        ▼
┌─────────────────────────────────────┐
│  COMPOSITION IR  (ladom.composition.v1) │
│  regions: visual | music | event        │
│  bbox · prompt · role · zIndex · lock   │
│  adapters preference · version history  │
└─────────────────────────────────────┘
        │
   ┌────┼────┬────────┬────────┐
   ▼    ▼    ▼        ▼        ▼
 Visual  Speech  Vibro   Score   Provider
 Adapter Adapter Adapter Adapter Adapter
 (UI)    (TTS)   (Vibrate)(JSON) (Reve / local)
```

**Эмерджентный эффект:**  
- новый способ ввода не требует переписывать режимы;  
- новый способ вывода не создаёт отдельную «версию мероприятия»;  
- участник с другими возможностями остаётся в том же произведении;  
- будущий Reve/local renderer подключается как ещё один адаптер, не ломая IR.

---

## 4. Прототип (что уже работает)

Файл: **`LADOM_SINGULAR_COMPOSITION_v1.html`**

| Возможность | Статус |
|---|---|
| Единый IR visual + music + event | да |
| Drag / resize / числовые поля / замок | да |
| Constraint solver (min size, out of frame) | да |
| Undo/Redo + снимки версий | да |
| Транзакционный импорт JSON | да |
| Партитура из music/event регионов | да |
| Независимые адаптеры (визуал, TTS, вибро, пульс) | да |
| Отключение адаптера не ломает остальные | да |
| Без сети, без токена | да |

Открыть файл в браузере. Сеть не нужна.

---

## 5. Техническое задание

### 5.1 Цель продукта
Среда совместного произведения, где структура (layout) — долгоживущая ценность, а способы восприятия и рендера — сменные.

### 5.2 Domain model (контракт)

```
Composition {
  schemaVersion: "ladom.composition.v1"
  title: string
  canvas: { width, height, aspectRatio }
  regions: Region[]
  adapters: { visual, speech, vibro, pulse }
}

Region {
  id: string
  type: "visual" | "music" | "event"
  label: string
  prompt: string
  role: string          // melody|bass|harmony|pass_turn|pause|…
  bbox: { x, y, width, height }  // normalized 0..1
  zIndex: number
  locked: boolean
  metadata?: object
}
```

Правила:
- bbox всегда нормализованы; адаптер провайдера делает маппинг в wire-format.
- Невалидный импорт **не** заменяет последнюю валидную версию.
- История append-only для снимков; undo — отдельный стек.

### 5.3 Интерфейсы (проектный контракт)

```
validateComposition(c) -> ValidationReport
diffComposition(a, b) -> Diff
buildScore(c) -> ScoreLines
dispatchEvent(region, adapters) -> void
exportJSON(c) -> Blob
importJSON(text) -> Composition | Error   // transactional
```

Позже (P1+):
```
toReveLayout(c) -> ReveLayoutDTO
fromReveLayout(dto) -> Composition
render(c, providerConfig) -> RenderResult
recordExperiment(...) -> LedgerEntry
```

### 5.4 Нефункциональные требования
- P0 работает offline.
- Секреты API только на сервере (P1).
- Нет `innerHTML` для пользовательских строк.
- Клавиатура и screen-reader: видимый фокус, подписи, альтернатива drag через числа.
- `prefers-reduced-motion` уважается (пульсы отключаемы).
- Лимит размера JSON-импорта, валидация схемы.

### 5.5 Безопасность
- Нет токена в HTML/JS.
- Публичное приложение → backend proxy, rate limit, budget gate.
- Content-violation и ошибки API различаются в UI.
- Retry платных вызовов — только с политикой дедупликации.

### 5.6 Definition of Done (P0)
- [x] Создать/править visual, music, event регионы
- [x] Видеть ошибки геометрии
- [x] Undo + снимки + экспорт/импорт без сети
- [x] Адаптеры включаются/выключаются независимо
- [x] Партитура собирается из IR
- [x] Автотесты валидатора — tests/test_validator.mjs исполняет ЖИВЫЕ блоки VALIDATOR-BEGIN/END обоих HTML в node:vm (80 проверок зелёные)
- [x] A11y-аудит клавиатуры/SR — фокус-стили, подписи, aria-live, Esc, reduced-motion; статический тест tests/test_a11y_static.mjs (живой прогон SR 👤)

---

## 6. Дорожная карта

| Этап | Содержание | Проверяемый результат | Оценка |
|---|---|---|---|
| **P0** (сейчас) | Composition IR · editor · validator · history · adapters stub · JSON | Offline-произведение, экспорт, без токена | прототип готов |
| **P0.1** | IndexedDB + автосохранение · unit-тесты валидатора · keyboard audit — **выполнено (такт v10.74)**: автосохранение в обоих HTML (debounce 800 мс, честный фолбэк), тесты валидатора/a11y/автосохранения зелёные; осталось 👤 живой прогон SR/клавиатуры на целевых браузерах | Перезагрузка не теряет проект; тесты зелёные | 1–2 итерации |
| **P1** | Reve adapter (pinned SDK) · server proxy · cost ledger · request states | create_layout / render_layout через proxy; токен не в клиенте | после тестового токена |
| **P1.1** | Intent → region seed (LLM optional, offline rules first) | Из текстового описания — черновик регионов | |
| **P2** | QA: OCR текста · object recall · spatial error · experiment ledger | Метрики из Experiment Plan на фиксированном корпусе | |
| **P2.1** | Web Audio / AudioWorklet: живой луп / партии | Music-регион = реальная дорожка, не только метка | |
| **P3** | Multi-device sync (очередь событий, CRDT или operational transform) | Два устройства согласуют IR после разрыва | |
| **P3.1** | «Круг своих» — локальные профили отношений и согласия | Повторный контакт без повторного QR | |
| **P4** | Masked repair · batch experiments · agentic repair planner | Адресный ремонт региона без полной перегенерации | |
| **P4.1** | Local open-model adapter (layout-conditioned baseline) | Fallback без Reve | |

### Критерий «эмерджентности»
Система считается состоявшейся не когда есть N кнопок, а когда:
1. один и тот же IR кормит ≥3 независимых канала восприятия;
2. изменение структуры согласованно отражается во всех включённых каналах;
3. отказ одного канала не останавливает совместное действие;
4. экспорт/импорт восстанавливает произведение без исходного устройства и без API.

---

## 7. Связь с документами комплекта

| Документ | Роль |
|---|---|
| `09_ARCHITECTURE_BLUEPRINT_RU.md` | Компоненты и приоритеты — соблюдены |
| `08_EXPERIMENT_PLAN_RU.md` | Метрики для P2 |
| `07_RESEARCH_MATRIX_RU.md` | Смежные области — учтены |
| `10_SOURCE_TRUST_AND_UNKNOWN_RU.md` | Границы доказанного — не нарушены |
| `reve_sdk_delivery/*` | Аудит SDK, TZ адаптера — база для P1 |

---

## 8. Честный статус

- **Сделано:** единый Composition IR, редактор, валидатор, история, адаптеры-заглушки, партитура, offline JSON.
- **Не сделано:** реальный Reve API, Web Audio синтез, multi-device, OCR QA.
- **Не утверждается:** совместимость локального IR с production-схемой Reve без pin SDK и contract-тестов.
- **Не утверждается:** «нигде в мире нет аналогов» — утверждается **собственная композиция** принципов (layout-first + multi-adapter accessibility + collaborative score в одном IR).

---

## 9. Главный выбор

Если оставить только одну идею:

> **Произведение = структура.  
> Восприятие и рендер = адаптеры.  
> Совместность возникает из общего IR, а не из одинакового интерфейса.**

Это и есть эмерджентный сингулярный ответ на Reve + ЛАДОМ + смежные области.
