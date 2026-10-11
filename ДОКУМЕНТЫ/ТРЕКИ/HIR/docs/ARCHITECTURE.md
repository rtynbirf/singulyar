# Архитектура HIR

## Слои
1. Experience Shell — навигация, фокус, доступные действия, состояние сети.
2. Intent Resolver — сохраняет исходное намерение, предлагает действия, не запускает внешние/необратимые операции без подтверждения.
3. Domain Core — человек, отношение, пространство, событие, разрешение, предпочтение.
4. Representation Router — текст, TTS, крупный текст и будущие адаптеры.
5. Transport Registry — local-only, file exchange, LAN, WebRTC, relay/server.
6. Persistence — IndexedDB для структурированных данных; service worker/Cache API для ресурсов PWA.
7. Evidence & Diagnostics — версии, контрактные тесты, локальные ошибки без сбора содержимого сообщений.

## Контракты
- `PersonRef`: стабильный локальный id, displayName, createdAt, status; без автоматической категории инвалидности.
- `Relationship`: id, стороны, label, createdAt, revokedAt; удаление должно прекращать доступ.
- `Intent`: id, authorId, rawText, createdAt, status, candidateActions. Исходный текст не затирается выводом модели.
- `MeaningEnvelope`: eventId, schemaVersion, spaceId, authorId, createdAt, kind, payload, provenance, integrity.
- `RepresentationPreference`: text, speech, largeText, highContrast, reducedMotion, keyboardFirst, haptics — только если поддерживается и выбрано человеком.
- `TransportCapability`: kind, requiresNetwork, supportsOfflineQueue, supportsE2EE, limitations, status. Возможность заявляется только при наличии теста.

## Инварианты
- Представление не меняет смысл и идентификатор события.
- Local save не означает sent/delivered.
- Отсутствующий адаптер не блокирует доступный fallback.
- Нет внешней телеметрии по умолчанию.
- Пользовательские строки вставляются через безопасные DOM API, не как доверенный HTML.
- Необратимые действия требуют явного согласия.

## Технологические решения
IndexedDB для данных, service worker для офлайн-ресурсов, WebRTC как отдельный транспортный адаптер. CRDT использовать только при доказанной необходимости конкурентных изменений. E2EE требует отдельного threat model, протокола и управления ключами; нельзя заявлять его по факту использования WebRTC.
