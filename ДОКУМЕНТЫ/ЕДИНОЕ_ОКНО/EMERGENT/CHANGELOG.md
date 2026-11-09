# Changelog

## 2026-10-14 — Emergent prototype package 0.1.0
- Добавлен локальный интерактивный intent composer.
- Добавлен каталог 13 классов коммуникации.
- Добавлены core intent model, adapter registry placeholders, JSON Schema, unit tests.
- Добавлены ТЗ, целевая архитектура, исследование официальных источников, security/privacy, accessibility, roadmap, integration map, ADR и test plan.
- Сохранены предшествующие HTML-артефакты как reference inputs.
- Не подключены реальные внешние транспорты и не внесены изменения в опубликованный сайт.

## 2026-10-14 — repair pass 1
- Unified the browser UI and canonical communication-intent event contract.
- Added capability ID/status to selected proposal and aligned JSON Schema.
- Added runtime contract validation before local save/export.
- Fixed stale event snapshots; save/export now read current form state.
- Added explicit draft restoration and complete form reset.
- Made capability availability visible; disconnected adapters remain non-delivering.
- Expanded core tests to 14 assertions; recorded live/browser regression limits honestly.
