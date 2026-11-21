# STORE-0.1 · Как переносить пакет в репо rtynbirf (СВЯЗЬ)

Собрано 2026-11-21 волной 3-b. Пакет готовит LINK к сторам и каталогам PWA. ПУШИТЬ ИЗ ПЕСКОВОДЫ НЕЛЬЗЯ: владелец переносит файлы руками и пушит сам. Целевой репо-путь: `singulyar → СВЯЗЬ/SINGULYAR-LINK-0.7.0/public/`.

## Какие файлы куда

```
STORE-0.1/
├── public/
│   ├── manifest.webmanifest  →  СВЯЗЬ/SINGULYAR-LINK-0.7.0/public/manifest.webmanifest  (ЗАМЕНА поверх 0.2.1)
│   ├── sw.js                 →  СВЯЗЬ/SINGULYAR-LINK-0.7.0/public/sw.js                 (ЗАМЕНА)
│   └── screenshots/          →  СВЯЗЬ/SINGULYAR-LINK-0.7.0/public/screenshots/          (НОВАЯ папка, 3 PNG)
└── store/
    ├── STORE-LISTING.md      →  СВЯЗЬ/SINGULYAR-LINK-0.7.0/store/STORE-LISTING.md      (НОВЫЙ файл)
    └── README-STORE-0.1.md   →  СВЯЗЬ/SINGULYAR-LINK-0.7.0/store/README-STORE-0.1.md   (НОВЫЙ файл, этот файл)
```

Пошагово:

1. **manifest.webmanifest — замена целиком.** Стор-версия поверх 0.2.1: имя/short_name, `display: standalone`, `start_url "./index.html"`, `scope "./"`, цвета #0e1116 и все 5 иконок — как были, ничего не переименовано. Добавлены: `description` (уточнён), `categories`, `screenshots` (3 шт., пути `screenshots/*.png`), `shortcuts` (2 шт.: «Открыть СВЯЗЬ» → `./index.html`, «Как установить» → `./install.html`, иконки из существующих `icons/`).
2. **screenshots/ — новая папка**, положить рядом с `public/`: `link-narrow-414x896.png` (414×896), `link-wide-1280x800.png` (1280×800), `link-install-narrow-414x896.png` (414×896). Сняты с живой оболочки LINK (волна ×20 + INSTALL-0.2.1), проверены кодом (размер, не-белые >5%, вес >20 КБ).
3. **sw.js — замена целиком.** Отличия от 0.2.1 ровно два: `V = "svyaz-x20-0.3"` (состав коробки изменился — правило имени в самом файле) и три строки скриншотов в `SHELL`. Сеть-первая, `allSettled`, navigate-фолбэк, bypass `/ws /config /health /bridge*` — не тронуты. Новые поля манифеста отдельно не кэшируются: `manifest.webmanifest` уже в списке.
4. **store/ — новая папка в СВЯЗЬ/SINGULYAR-LINK-0.7.0/store/**: `STORE-LISTING.md` (готовые тексты листинга) и этот файл. Манифест и sw.js в `store/` не дублируются — живёт только `public/`.

## Правило «только добавлять»

- Существующие файлы и ключи не удалять: старые иконки (`icons/icon-192.png`, `icon-512.png`, `maskable-*`, `apple-touch-icon-180.png`, `favicon-64.png`, `icon.svg`) остаются на месте — shortcuts и старые установленные копии на них ссылаются.
- `index.html` вообще не трогать: волна ×20 уже несёт манифест-линк, theme-color, шторку установки и SW-регистрацию; STORE-0.1 не добавляет туда ни строки.
- Новое — только `screenshots/` и `store/`; замены — только `manifest.webmanifest` и `sw.js` (разрешённый паттерн коробки).

## Что проверять после переноса

1. **200 на все пути манифеста.** Открыть домен и проверить кодом (`curl -s -o /dev/null -w "%{http_code}"`):
   - `screenshots/link-narrow-414x896.png`, `screenshots/link-wide-1280x800.png`, `screenshots/link-install-narrow-414x896.png`
   - `icons/icon-192.png`, `icons/maskable-192.png` (цели shortcuts), `icons/icon.svg`, `icons/icon-512.png`, `icons/maskable-512.png`
   - `index.html` (start_url), `install.html` (цель shortcut «Как установить»)
   Все должны вернуть 200. Битый путь манифеста = провал палаты (404 скриншотов тонит консоль).
2. **Палата зелёная.** На пуше СВЯЗЬ/** консоль Actions чистая — без 404 и без новых ошибок.
3. **JSON манифеста валиден:** `python3 -c "import json;json.load(open('public/manifest.webmanifest'))"`.
4. **sw.js синтаксис:** `node --check public/sw.js`; кэш в файле — `svyaz-x20-0.3` (старые кэши сотрутся сами при активации).
5. **Смоук в браузере:** открыть `/` и `/install.html` — заголовок «СИНГУЛЯР · Единое окно», консоль без новых ошибок; шторка установки и shortcuts видны (в Chrome: меню → «Установить приложение»).

## Что остаётся руками владельца

- Пуш в репо (из песковода пушить нельзя).
- Аккаунты разработчика и подписи каталогов; сборка пакетов (PWABuilder — нейтральная опция, не обязательная) — по `store/STORE-LISTING.md`, раздел «Требования к владельцу».
- Страница политики конфиденциальности, если выбранный каталог её требует.
