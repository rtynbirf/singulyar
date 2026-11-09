# CHANGELOG · СИНГУЛЯР

## [v1.2-production] - 2026-10-14
### Исправленные баги и трансформация в фичи (Bug Patches & Feature Pivots)
- **BUG-01 Patch (Tamper-Evident Payload Guard)**:
  - Исправлен рассинхрон при непосредственном изменении полезной нагрузки.
  - Внедрен автоматический контроль `verify_integrity()` с валидацией `manifest.sha256` на каждой смене состояния. При попытке перехода с измененной нагрузкой выбрасывается `PAYLOAD_TAMPERED`.
- **BUG-02 Patch (Strict Idempotency Vault Engine)**:
  - Добавлен классовый реестр `IdempotencyVault` во всех адаптерах.
  - При попытке отправить дублирующий `idempotency_key` с отличным хешем нагрузки генерируется `IDEMPOTENCY_CONFLICT`. Для идентичных повторов возвращается кэшированный результат.
- **BUG-03 Patch (Deserialization Factory & Integrity Check)**:
  - Реализован `SingulyarObject.from_dict()` с валидацией схемы, согласий и манифеста.
- **BUG-04 Patch (Hash-Chained Audit Trail)**:
  - Каждая запись в `delivery.history` содержит `prev_hash` и `entry_hash` (криптографическая цепочка переходов). Добавлен метод `verify_history_chain()`.
- **BUG-05 Patch (Automated Intent Retry Spawner)**:
  - Добавлен метод `obj.spawn_retry_intent()`, создающий свежий объект в состоянии `draft` с новым UUID и `idempotency_key` для восстановления из терминальных состояний (`CANCELLED`, `FAILED`, `EXPIRED`).

## [v1.1-final] - 2026-10-14
### Добавлено
- CI/CD воркфлоу для автоматического тестирования Pull Request (`.github/workflows/pr_check.yml`) и автоматического деплоя на GitHub Pages (`.github/workflows/deploy.yml`).
- Шаблоны задач GitHub (`.github/ISSUE_TEMPLATE/bug_report.md`, `feature_request.md`, `config.yml`).

## [v1.0-final] - 2026-10-14
### Добавлено
- Полнофункциональный WebRTC DataChannel P2P Адаптер с ручным и QR/URI сигналингом и поддержкой ACK.
- Web Crypto API E2EE Engine (ECDH P-256, AES-256-GCM, отпечатки SHA-256).
- IndexedDB Persistent Storage с Web Locks API и StorageManager persistence.
