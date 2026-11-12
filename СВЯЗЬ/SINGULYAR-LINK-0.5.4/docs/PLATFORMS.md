# Реестр платформ СИНГУЛЯР

Не «100 мостов». Честная матрица: что можно соединить как мост, что только как дверь (invite), что закрыто.

## Уровни (tiers)

| Tier | Смысл |
|------|--------|
| **A** | Рабочий или почти рабочий серверный мост (официальный API / Calling) |
| **B** | Текст / события через Bot или Business API |
| **C** | Только deep-link / share / SMS / mailto в общий хаб |
| **D** | Локальный агент (ПК, desktop capture, виртуальный кабель) |
| **E** | Закрыто или бессмысленно без сотрудничества платформы |
| **F** | Открытый / децентрализованный протокол — мост через federation предпочтителен |

## Уже в коде (bridges/)

| id | Мост | Tier |
|----|------|------|
| whatsapp | `whatsapp-call` | A (голос, нужен UDP + живой Meta) |
| telegram | `telegram` | A (текст) |
| teams | `teams` | B (скелет Graph Calling) |
| viber | `viber-audio` | D (точка расширения под ПК-агент) |
| * | `webhook` | B/F (Matrix, Rocket.Chat, Mattermost, n8n…) |
| browser | native hub | A (полный хаб) |

## Каталог

Полный машиночитаемый список: `server/catalog/platforms.json`  
API загрузки: `server/catalog/index.mjs` → `listPlatforms()`, `buildInvitesFromCatalog()`.

Покрыты (фрагмент списка пользователя + инженерно важные):

WhatsApp, Telegram, Viber, Teams, Signal, WeChat, Facebook Messenger, Snapchat, QQ, imo, Discord, LINE, KakaoTalk, Zalo, iMessage, Instagram DM, Google Messages, Slack, Skype→Teams, Google Chat, Element/Matrix, Session, SimpleX, Wire, Threema, Briar, Jami, Tox, Revolt, Rocket.Chat, Mattermost, Zulip, SMS/RCS, Email, Browser.

Остальные из расширенного списка (игровые чаты, региональные OA, соцсети DM) по умолчанию **tier C** — invite-only, пока не появится документированный API.

## Политика расширения

1. Сначала **A/B** с официальным API (Discord bot, Slack, LINE Messaging API, Google Chat).
2. Потом **F** — Matrix как хребет + существующие mautrix-мосты.
3. **D** — локальные агенты (Viber, iMessage) только когда без них нельзя.
4. **E** не обещать. WeChat/QQ и закрытые DM — только ссылка, без имитации «подключено».

## Почему не «100 мостов сразу»

Мост ≠ кнопка «поделиться ссылкой».  
Мост = двусторонний обмен сообщениями и/или медиа с чужой сетью при соблюдении ToS и наличии API.

У большинства из списка 4–100 **нет** такого API для личных аккаунтов. Делать фейковые «мосты» — обман. Делать реестр + invite + реальные мосты там, где API есть — инженерия.
