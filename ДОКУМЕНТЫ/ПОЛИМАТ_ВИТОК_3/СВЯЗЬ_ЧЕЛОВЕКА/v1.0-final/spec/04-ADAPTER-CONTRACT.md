# 04-ADAPTER-CONTRACT.md · Контракт Адаптеров v1.0

## Обязательный интерфейс
* `probe()` — Проверка доступности канала без передачи данных.
* `prepare(intent, recipient)` — Оценка возможностей, маршрута и стоимости.
* `send(object, route, consent)` — Выполнение передачи только при `consent.granted == true`.
* `getStatus(objectId)` — Запрос наблюдаемого состояния машины состояний.
* `cancel(objectId)` — Попытка отмены.

## Список Исключений
* `UNAVAILABLE` — Канал недоступен.
* `CONSENT_REQUIRED` — Отсутствует согласие пользователя.
* `INVALID_RECIPIENT` — Неверный адрес/отпечаток.
* `RATE_LIMITED` — Превышен лимит запросов.
* `SECURITY_ERROR` — Ошибка проверки E2EE или хеша.
