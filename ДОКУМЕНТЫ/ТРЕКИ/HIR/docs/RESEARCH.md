# Исследовательская база · дата 2026-10-11

Это целевая выборка первичных технических источников, не исчерпывающий обзор всех мировых продуктов.

## Local-first
Ink & Switch, “Local-first software” — https://www.inkandswitch.com/essay/local-first/
Вывод: локальная копия может быть первичной; совместная работа не должна автоматически требовать облака; CRDT полезны для конкретных сценариев конфликтов, но не обязательны везде.

## IndexedDB и Service Worker
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
Вывод: IndexedDB подходит для структурированных локальных данных; service worker может обслуживать кэшированные ресурсы; это не гарантия фоновой доставки сообщений.

## WebRTC
- https://developer.mozilla.org/ru/docs/Web/API/WebRTC_API/Protocols
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity
- https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Signaling_and_video_calling
Вывод: нужны signaling и ICE; STUN/TURN помогают обходить сетевые ограничения; прямой P2P не гарантирован.

## Доступность
W3C WCAG 2.2 — https://www.w3.org/WAI/news/2023-10-05/wcag22rec/
Вывод: WCAG — база проверяемых критериев, но автоматический сканер не заменяет ручную проверку и тестирование с пользователями.

## Безопасность
OWASP ASVS 5.0.0 — https://owasp.org/www-project-application-security-verification-standard/
Вывод: ASVS — набор проверяемых требований, а не сертификат безопасности.

## Сингулярный синтез — гипотеза
HIR предлагает соединить: смысловой конверт события, выбранное человеком представление, сменные транспортные адаптеры с честными capabilities, local-first состояние и реестр доказательств. Уникальность не заявляется без сравнительного исследования реализованных продуктов.
