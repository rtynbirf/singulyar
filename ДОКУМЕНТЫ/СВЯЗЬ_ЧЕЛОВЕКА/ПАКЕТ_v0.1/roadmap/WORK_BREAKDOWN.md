# Рабочие пакеты для исполнителя

| ID | Работа | Артефакт | Зависимости | Критерий готовности |
|---|---|---|---|---|
| WP-00 | Зафиксировать репозиторий | commit SHA, дерево, лицензия | нет | точные исходники доступны локально |
| WP-01 | Аудит дверей | `baseline-audit.md` | WP-00 | все утверждения с путями/строками/тестами |
| WP-02 | Интеграционная дверь | HTML link patch | WP-01 | существующие ссылки и service worker не сломаны |
| WP-03 | Доменная модель | types + schema | WP-01 | schema validation tests проходят |
| WP-04 | Локальный store | IndexedDB repository | WP-03 | перезагрузка/миграция/экспорт тестируются |
| WP-05 | Accessibility UI | UI + audit results | WP-02 | keyboard + screen reader manual checks |
| WP-06 | Relationship state | invite/accept/revoke | WP-03, WP-04 | replay/expiry/race tests проходят |
| WP-07 | Transport interface | adapter contract | WP-03 | fake adapter contract suite проходит |
| WP-08 | WebRTC | signaling + data channel | WP-06, WP-07 | two-browser test + NAT/TURN test |
| WP-09 | E2EE | reviewed protocol integration | WP-08 | independent review; no custom crypto |
| WP-10 | Email/telephony | server-side adapters | WP-07 | provider limits/pricing/regions documented |
| WP-11 | Value adapter | transaction state machine | WP-07 | legal + security approval, idempotency tests |
| WP-12 | Release hardening | SBOM, CSP, tests, runbook | all | independent sign-off |

Каждый WP сдаётся как: diff → воспроизводимая команда теста → сырые результаты → известные ограничения → blind review. Нельзя сдавать только скриншот.
