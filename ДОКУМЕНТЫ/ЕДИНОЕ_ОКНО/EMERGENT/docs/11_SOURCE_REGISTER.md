# 11 — Реестр официальных источников

Дата проверки веб-источников: 2026-10-14. Ссылки предназначены для исполнителя; сверить актуальные версии и errata непосредственно перед реализацией.

| Область | Официальный источник | Использование |
|---|---|---|
| PWA capabilities | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Reference | Манифест, service worker, IndexedDB, share/notifications; учитывать поддержку браузера |
| Offline-first | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation | Offline fallback, фоновые ограничения |
| Service Worker | https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers | Cache/update lifecycle и тестирование обновлений |
| WAI-ARIA APG | https://www.w3.org/WAI/ARIA/apg/ | Поведение интерактивных controls и клавиатура |
| ARIA overview | https://www.w3.org/WAI/standards-guidelines/aria/ | Семантика динамического UI |
| Matrix stable spec | https://spec.matrix.org/latest/ | Федерация/клиент-сервер/события; проверять текущую stable версию |
| ActivityPub | https://www.w3.org/TR/activitypub/ | Социальные публикации и федерация |
| JSON Schema | https://json-schema.org/draft/2020-12 | Контракт и валидация события |

## Ограничение обзора

Официальные документы подтверждают существование интерфейсов/стандартов, но не доказывают наличие поддержки в конкретном браузере, провайдере или текущем репозитории Singulyar. Каждая интеграция требует capability detection, документации провайдера, тестового окружения и реального результата.

## Project-specific source review added 2026-10-14
- GitHub repository README: https://github.com/rtynbirf/singulyar — current module map and positioning of ·21 / ·22.
- ·21 source: https://github.com/rtynbirf/singulyar/blob/main/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_21_%D0%9E%D0%91%D0%A9%D0%95%D0%9D%D0%98%D0%95.html — adapter OS bridge and representation adapters.
- ·22 source: https://github.com/rtynbirf/singulyar/blob/main/%D0%A1%D0%98%D0%9D%D0%93%D0%A3%D0%9B%D0%AF%D0%A0_22_%D0%A1%D0%92%D0%AF%D0%97%D0%AC.html — S22 channel registry and fallback graph.
- Review method: rendered source inspection through GitHub on 2026-10-14. Commit SHA was not retrievable in this environment; see `docs/15_LIVE_SOURCE_REVIEW.md`. These are project sources, not claims of an executable live regression.
