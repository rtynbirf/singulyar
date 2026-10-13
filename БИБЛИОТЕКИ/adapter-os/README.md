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
- Speech (Whisper) adapter: контракт `input.whisper-local` с реализацией-дверью (v10.94 «ГОЛОС»): ledger `adapter-os.speech.v1`, пин весов (SHA-256 склейки частей, расхождение — данные не выдаются), строгий разбор сегментов, честный мок; без пина — EXPERIMENTAL, честно.
- OCR adapter: контракт `input.ocr` с реализацией-дверью (v10.95 «ЧТЕНИЕ»): ledger `adapter-os.ocr.v1`, подпись картинки по магическим байтам (6 форматов — не по ярлыку), пустой текст — честная пустота чистого листа, пин модели, честный мок; без пина — EXPERIMENTAL, честно.
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
node tests/run-tests.mjs        # их база — 4/4 (не тронута)
node tests/test-speech.mjs      # v10.94 «ГОЛОС» — 16/16 (контракт Whisper)
node tests/test-ocr.mjs         # v10.95 «ЧТЕНИЕ» — 14/14 (контракт OCR)
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
