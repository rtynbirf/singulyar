# 09 — План тестирования и регрессионные ворота

## Unit/contract

- Валидность схемы, версии, обязательные поля, неизвестные enum.
- Intent создаётся без аккаунта/адресата; consent default false.
- Disabled/disconnected adapter никогда не считается отправляющим.
- Повтор одного event ID не создаёт повторную операцию.
- Неизвестный результат провайдера — `unknown`, а не `delivered`.
- Платёжные намерения не содержат платёжных реквизитов и не проходят через обычный message adapter.

## Интеграционные

- Открытие из текущей навигации и возврат в существующие модули.
- Старые ссылки/страницы/функции работают после включения флага.
- Offline, восстановление сети, таймаут, отказ авторизации, отмена пользователем.
- Export/import, удаление локальной памяти, миграция схемы.
- Adapter contract tests с mock server, затем sandbox реального провайдера.

## Доступность

- Keyboard-only, видимый focus, screen-reader names, announcements, zoom/reflow.
- Тесты NVDA/Firefox, NVDA/Chrome, VoiceOver/Safari, TalkBack/Chrome.
- Проверка субтитров/транскриптов, reduced motion, contrast, focus order.
- Внешнее пользовательское тестирование с людьми с разными способами восприятия и выражения.

## Security

- XSS и HTML injection в тексте/имени контакта/ошибках адаптера.
- CSRF/CORS/auth boundary на backend; secret leakage; permissions minimization.
- Replay, duplicate submit, race condition, forged delivery receipt.
- Threat model review для синхронизации, E2EE, платежей и внешних мостов.

## Release gate

Каждый результат фиксируется с commit, окружением, командой, exit code, количеством passed/failed/skipped. Скриншот интерфейса не доказывает работоспособность сетевого протокола. Ручной тест не заменяет unit/contract test, а автоматический accessibility scan не заменяет пользователя.
