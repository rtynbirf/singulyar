# SINGULYAR Adapter OS — prototype v0.1

Прототип следующего архитектурного слоя Singulyar: **смысл один → представления/каналы разные**.

Он не заменяет текущие ·18/·19/·21/·22. Он показывает, как подключать новые возможности без превращения платформы в набор несвязанных библиотек.

## Принцип

`Человек выбирает → система подстраивается → адаптер сообщает реальную способность → маршрутизатор выбирает только разрешённый человеком путь.`

## Что реально работает в этом архиве

- Capability Registry: возможности, предпочтения, контекст.
- Adapter Registry: единый контракт адаптеров.
- Meaning Router: смысл не зависит от представления.
- Local Store: IndexedDB для структурированных данных.
- Export/Import: JSON-файл как независимая копия.
- TTS adapter: Web Speech Synthesis, только реально доступные голоса устройства.
- Vibration adapter: Navigator.vibrate, если доступен.
- Text adapter: базовый канал без зависимостей.
- Camera/Microphone permission probe: только проверка возможностей, без скрытого запуска.
- Browser speech adapter: только если браузер предоставляет SpeechRecognition; статус явно помечается `browser-dependent`.
- Adapter ledger: LOCAL / BROWSER / NETWORK / EXPERIMENTAL / UNAVAILABLE.

## Что намеренно НЕ заявлено как готовое

- OCR без заранее загруженной модели.
- Whisper без встроенной WASM-сборки и модели.
- настоящий eye tracking: Face Landmarker/iris landmarks не являются готовым calibrated gaze-to-screen решением.
- настоящий Braille display: Unicode Braille здесь только представление текста.
- настоящий DOCX: HTML с расширением `.docx` не используется.
- Demucs WASM: только контракт optional adapter.
- произвольный shell в браузере: xterm.js сам по себе shell не создаёт.

## Запуск

Прототип использует только статические файлы.

Для localhost:

```bash
python -m http.server 8080 -d prototype
```

Открой `http://localhost:8080/`.

Для тестов:

```bash
node tests/run-tests.mjs
```

## Архитектура

```text
                    ┌─────────────────────┐
                    │       PERSON        │
                    │ preferences > auto  │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  CAPABILITY MODEL   │
                    └──────────┬──────────┘
                               │
INPUT ADAPTERS ───────► MEANING CORE ◄─────── OUTPUT ADAPTERS
 OCR / voice / text          │             text / TTS / haptic
 gaze / switch               │             braille / captions
 camera / file               │
                             ▼
                       CHANNEL ROUTER
                             │
                             ▼
                       ·18 / ·21 / ·22
```

## Integration rule

Новый адаптер не имеет права говорить `working`, пока его capability probe и smoke-test не прошли. Неизвестное состояние хранится как `UNKNOWN`, а не превращается в `FALSE` или `TRUE`.
