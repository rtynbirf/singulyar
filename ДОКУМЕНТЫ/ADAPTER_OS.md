# SINGULYAR ADAPTER OS v0.1 — интеграция в платформу

## Что это

Инженерный слой поверх ·19 ЧЕЛОВЕК → ·21 ОБЩЕНИЕ → ·22 СВЯЗЬ, собранный из
присланного пакета `singulyar-adapter-os-v0.1.zip` (SHA-256
`6ab03a4f…74af`, проверен байт-в-байт). Ядра страниц **не тронуты** — мост
только регистрирует их проверенные механизмы как адаптеры, ведёт шину
смыслов и даёт честные статусы.

```text
ЧЕЛОВЕК → ПРЕДПОЧТЕНИЯ → ВОЗМОЖНОСТИ → СМЫСЛ → АДАПТЕР → ПРЕДСТАВЛЕНИЕ
```

## Состав в репо

`БИБЛИОТЕКИ/adapter-os/` — пакет из архива байт-в-байт + один новый файл:

| Файл | Статус | Что это |
|---|---|---|
| `src/core.mjs` | из архива | CapabilityModel · AdapterRegistry · MeaningRouter |
| `src/store.mjs` | из архива | IndexedDB + явный JSON-экспорт |
| `adapters/basic.mjs` | из архива | Text/TTS/Vibration/Speech/Camera/Mic (READY-датчики) |
| `adapters/contracts.mjs` | из архива | OCR/Whisper/Gaze/Braille/Demucs — **EXPERIMENTAL, моделей нет** |
| `prototype/`, `tests/`, `docs/` | из архива | рабочий прототип, их тесты 4/4, ledger |
| `bridge.mjs` | **новый** | мост: загрузка OS, шина смыслов, окно `window.SingulyarOS` |

## Как подключён (v0.1, срез №1)

Каждая страница получает маленький `<script type="module">` перед
UX-движком. На file:// module-import браузер блокирует → блок ловит ошибку
и честно пишет `window.SingulyarOS = {state:'unavailable'}`; страница
работает как раньше.

| Страница | Что регистрируется мостом | Источник правды |
|---|---|---|
| ·19 ЧЕЛОВЕК | предпочтения человека (`singulyar.adaptation.v1`) → capability-модель + адаптер-источник `source.19-адаптация` | localStorage ·19 |
| ·21 ОБЩЕНИЕ | `output.21-брайль` (реальная функция S21.braille), `tool.21-маршрутизация` (S21.route) | ядро S21 |
| ·22 СВЯЗЬ | `channel.22-зал` — транспорт зала как адаптер-канал (проверка BroadcastChannel) | ядро ·22 |

Шина смыслов (`singular-meaning-bus-v1`, конверты
`{id,type,payload,createdAt,author}`) — отдельный транспорт моста; живой
мост ·21⇄·22 (`singular-most-21-22-v1`) работает как работал.

## Доступ из консоли/тестов

```js
SingulyarOS.version            // '0.1'
SingulyarOS.statuses()         // реестр с честными состояниями
SingulyarOS.routeOut({text:'привет'}, ['output.text'])
SingulyarOS.bus.publish('note', {text:'…'}); SingulyarOS.bus.log()
await SingulyarOS.store.save('k', v)   // IndexedDB + exportJson
```

## Запуск прототипа — ВАЖНОЕ ИСПРАВЛЕНИЕ

В README архива команда указана неверно: `python -m http.server 8080 -d
prototype` обрезает импорты `../src/*.mjs` (404, прототип мёртв при живом
HTTP 200). Правильно — из корня пакета:

```bash
cd БИБЛИОТЕКИ/adapter-os
python -m http.server 8080
# открыть http://localhost:8080/prototype/
```

## Честные границы (UNKNOWN / EXPERIMENTAL)

- OCR, локальный Whisper, gaze-трекинг, Брайль-дисплей, Demucs — контракты
  без реализаций: нужны pinned-модели и бенчмарки (ledger архива).
- Production-проводка ·21/·22 на реестр — следующий срез (правило №10 их
  плана: сначала тесты против живых файлов).
- Дефект README архива исправлен документом выше; сам архив не менялся.
