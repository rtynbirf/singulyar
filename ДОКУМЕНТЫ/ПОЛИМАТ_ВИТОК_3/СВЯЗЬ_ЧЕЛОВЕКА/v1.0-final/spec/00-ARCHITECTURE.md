# 00-ARCHITECTURE.md · Архитектура СИНГУЛЯР v1.0

## 1. Слои системы
1. **Intent Layer:** Фиксация цели человека без привязки к транспортному каналу.
2. **Representation Selector:** Форматирование представления (текст, крупный шрифт, TTS, высококонтрастный режим) согласно локальному профилю доступности WCAG 2.2 AA.
3. **Relationship Store:** Граф локальных контактов, уровней доверия (`unknown`, `invited`, `added`, `trusted`) и одноразовых токенов приглашений.
4. **Object Manifest:** Расчет SHA-256 хеша полезной нагрузки, MIME-типа и политики хранения.
5. **Transport Selector:** Выбор оптимального адаптера (Local, FileExport, WebRTC P2P, Email Relay, Telephony, Value).
6. **Policy & Consent:** Проверка явного разрешения пользователя (`ConsentRecord`) перед передачей.
7. **Storage Surface:** Хранилище IndexedDB с изолированными объектами и Web Locks API.
8. **Audit Surface:** Логирование всех переходов машины состояний.
