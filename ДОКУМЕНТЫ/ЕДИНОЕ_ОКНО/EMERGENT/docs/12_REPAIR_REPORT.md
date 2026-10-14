# Исправление разрыва UI → намерение → схема → реестр возможностей → адаптер → результат

Дата: 2026-10-14. Объект: локальный пакет `singulyar-emergent`, извлечённый из исходного ZIP, а не опубликованный сайт.

## Что было исправлено

1. **Единый контракт события.** `src/core.js:createIntent()` создаёт одно каноническое событие с `eventId`, `createdAt`, локальным актором, намерением, адресатом, срочностью, содержимым, выбранным вариантом, capability ID/status, приватностью, явным `consentToSend=false` и статусом `draft`. Корневые/вложенные поля согласованы с JSON Schema.
2. **Runtime validation.** Перед локальным сохранением и экспортом событие проходит `validateIntent()`. Некорректный объект не экспортируется молча.
3. **Связь интерфейса с моделью.** Поля ввода имеют машинные значения модальностей. Карточки ранжируются `Core.rankChoices()` с учётом модальностей и срочности. Выбранный вариант сохраняет класс канала и привязку к capability registry.
4. **Capability registry виден в UI.** Карточка показывает связанный адаптер, его статус и объяснение. `matrix`, `activitypub`, `payment-link` остаются `not-connected`/disabled; UI не представляет их подключёнными.
5. **Устранён stale snapshot.** Сохранение и экспорт каждый раз формируют событие из актуальной формы. Изменение адресата/текста после выбора не экспортирует прежний снимок.
6. **Восстановление и очистка.** Найденный черновик можно явно восстановить в форму; контракт проверяется. Очистка удаляет локальную запись, сбрасывает поля и убирает действие восстановления.
7. **Доставка закрыта по умолчанию.** `canDeliver()` требует согласия, enabled, status `connected` и реальную функцию `send`. В пакете сетевого `send` нет. «Сохранено»/«экспортировано» не приравнивается к «доставлено».

## Проверяемая цепочка

`UI fields → readForm() → Core.createIntent() → Core.validateIntent() → Adapters.get()/registry → proposal.capabilityId + proposal.capabilityStatus → локальное сохранение/экспорт → видимый статус not-sent`.

Сохранение и экспорт являются локальными операциями. Для Matrix/ActivityPub/платежей подтверждённый результат доставки отсутствует, и интерфейс это явно отражает.

## Результаты проверок

- Node syntax checks: пройдены для `src/core.js`, `src/adapters.js`, `prototype/app.js`.
- Unit/contract tests: **14/14 passed** (`node tests/core.test.js`).
- JSON Schema: схема прошла `Draft202012Validator.check_schema`; сгенерированное событие прошло валидацию Draft 2020-12 с проверкой `date-time`.
- Chromium browser-flow: **7/7 passed**. Проверены запуск UI, рекомендации, актуальный снимок при экспорте, сохранение/восстановление/очистка и отсутствие ошибок выполнения. Подробности и ограничения — `docs/14_BROWSER_E2E_RESULTS.md`. Из-за политики браузера `URLBlocklist: ["*"]` тест встраивает локальные HTML/CSS/JS в `about:blank` и подменяет localStorage in-memory shim; реальная персистентность origin storage не подтверждена.
- Live-source review: публичные страницы ·21 и ·22 просмотрены через GitHub. Подтверждены существующие S21/adapter-OS и S22 registry/fallback contracts, которые новая интеграция обязана сохранить. Исполняемый regression на закреплённом commit не проведён: локальный `git ls-remote` не смог разрешить github.com, а веб-представление не отдало SHA. Не подменять это утверждением о полноценном live regression.

## Остаточные ограничения

- Ранжирование — прозрачная эвристика, не обученная модель и не доказательство доступности конкретному человеку.
- Устройства/браузерные возможности не проверяются автоматически, кроме отображения статуса `capability-check-required`; TTS не представлен как отправка адресату.
- Нет внешней сетевой доставки, подтверждений получения, retry, синхронизации между устройствами или end-to-end encryption транспорта.
- Изменения находятся только в этом ZIP. GitHub Pages/repository не изменены.

## Как повторить

Из корня `singulyar-emergent`:

```sh
node --check src/core.js
node --check src/adapters.js
node --check prototype/app.js
node tests/core.test.js
node tests/e2e.chromium.cjs
```

Проверка схемы, если установлен Python `jsonschema`:

```sh
python3 - <<'PY'
import json, jsonschema
schema=json.load(open('schemas/communication-intent.schema.json'))
event=json.load(open('/tmp/intent.json'))  # создать event через src/core.js, как в README
jsonschema.Draft202012Validator.check_schema(schema)
jsonschema.validate(event, schema, format_checker=jsonschema.FormatChecker())
print('PASS')
PY
```
- HTML smoke: проверены существование всех трёх подключаемых скриптов, ключевых DOM ID и явных значений модальностей в селекторах.
- Chromium browser-flow: 7/7 проверок пройдены; см. `docs/14_BROWSER_E2E_RESULTS.md` и `tests/e2e.chromium.cjs`.
