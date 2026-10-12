# 06 · СЕТЕВАЯ АРХИТЕКТУРА И ПРОТОКОЛЫ (ревизия)

Принцип: не один «большой канал», а **изолированные плоскости** — управление, данные, медиа, агент, управление устройством (management). Исправлена ошибка исходника: жёсткая VLAN-сегментация без учёта мультикаста Matter.

## 1. Топология

```text
                  INTERNET (облачная LLM · OTA · стриминг)   — только по политике, через egress-proxy
                                │ TLS 1.3 / mTLS
┌───────────────────────────────▼──────────────────────────────────────────┐
│ РОУТЕР/ФАЕРВОЛ: VLAN · DNS-фильтр · нет входящих из WAN                  │
└──┬───────────────┬───────────────────┬───────────────────┬───────────────┘
 VLAN10 TRUSTED   VLAN20 IOT-MATTER    VLAN30 CAMERAS      VLAN40 GUEST
 агент · NAS ·    Matter/Thread-узлы,  IP-камеры, NVR,     гости, изоляция
 телефоны         OTBR, MQTT-брокер    дверной звонок      от 10 и 20
```

## 2. Плоскости

| Плоскость | Назначение | Протоколы | Интернет |
|---|---|---|---|
| Control | команды и состояния устройств | Matter, MQTT 5, CoAP, REST, WebSocket | нет |
| Data | телеметрия, журналы | MQTT, CoAP, syslog-TLS | нет |
| Media | аудио/видео, камеры | RTP/RTSP(S)/SRTP, WebRTC, AirPlay, Cast | только авторизованные сервисы |
| Agent | LLM, RAG, MCP | MCP stdio / Streamable HTTP, gRPC | по политике |
| Management | OTA, диагностика, бэкап | HTTPS, mTLS, SSH (выключен) | только подписанные источники |

## 3. Стек

```text
APPLICATION: Intent Router · Planner · Memory · RAG · Policy · Audit
AGENT SERVICE: MCP (JSON-RPC 2.0, ревизия 2026-07-28) · gRPC · WebSocket · REST (OpenAPI 3.1)
HOME ABSTRACTION: Matter Data Model / Interaction Model
DEVICE PROTOCOLS: Matter · Zigbee (мост) · Z-Wave (модуль) · MQTT · CoAP · ONVIF · RTSP
TRANSPORT: TCP · UDP · QUIC · WebSocket · DTLS · TLS 1.3
NETWORK: IPv4 · IPv6 · ICMPv6/NDP · DNS · mDNS · DHCP
LINK/RADIO: Ethernet · Wi-Fi 6/6E (7 опц.) · Bluetooth LE 5.4+/6.x · Thread 1.4 · Zigbee · UWB(C)
```

## 4. Matter и сегментация — критическая оговорка

Matter использует IPv6, обнаружение по **mDNS (UDP 5353)**, операционные сообщения по **UDP 5540** по умолчанию, коммишининг по BLE/NFC/QR. Thread-сеть связывается с IP через Border Router (OTBR на колонке).

Следствия для VLAN:
1. Контроллер Matter, Thread BR и Matter-over-Wi-Fi-устройства должны находиться в **одном L2/широковещательном домене** (VLAN IOT-MATTER) либо через mDNS-репликатор/Avahi-reflector с разрешёнными ICMPv6 (NDP/RA).
2. Блокировать нужно **выход в интернет** этой VLAN, а не мультикаст внутри неё.
3. Камеры Matter 1.5 используют WebRTC (поиск пути/STUN) — предусмотреть медиа-шлюз/TURN в локальной сети.
4. Matter 1.6: NFC-коммишининг на колонке/телефоне; Joint Fabric — общий fabric между экосистемами.

## 5. MCP-каналы (ревизия 2026-07-28)

| Канал | Транспорт | Безопасность |
|---|---|---|
| Агент ↔ локальные MCP | stdio, дочерний процесс | подписанный бинарник из манифеста; без произвольных команд; песочница; креденшалы из окружения |
| Агент ↔ удалённые MCP | Streamable HTTP | TLS 1.3; OAuth 2.1: Client ID Metadata Documents, RFC 8707 (resource indicators), RFC 9207 (`iss` проверять); allowlist доменов |
| Долгие операции | расширение Tasks | `tasks/get`, `tasks/update`, `tasks/cancel`; `tasks/list` удалён |

Изменения относительно исходника: версия и возможности клиента в каждом запросе (протокол без состояния); результаты с `resultType`; **HTTP+SSE — deprecated**; Dynamic Client Registration сохраняется для совместимости и будет удалён.

## 6. Каналы к устройствам

| Канал | Что | Заметки |
|---|---|---|
| Matter over Thread | датчики, лампы, замки | OTBR на колонке; Thread 1.4 |
| Matter over Wi-Fi/Ethernet | камеры, бытовая техника, ТВ | один L2 |
| Zigbee | через внешний координатор/мост | Zigbee2MQTT/ZHA-класс |
| MQTT 5 | сторонние сенсоры | TLS 1.3 mTLS, ACL по CN, порт 8883; 1883 запрещён |
| Камеры | ONVIF (обнаружение/управление), RTSP(S) (видео), WebRTC (просмотр) | отдельная VLAN, локальное хранение |
| Телефон/часы | HTTPS/WSS; BLE; (UWB/BT Channel Sounding) | токены, биометрия для critical |

## 7. Локальный API

`GET /api/v1/devices` · `POST /api/v1/commands` · `WS /api/v1/events` · `POST /api/v1/agent/task` · `GET /api/v1/audit` · `POST /api/v1/consents` · `DELETE /api/v1/data` (требует подтверждения). OpenAPI 3.1; аутентификация: WebAuthn/токены с scope; rate-limit; никаких параметров, меняющих политику.

## 8. Порты и сервисы (исправлено)

| Сервис | Протокол | Порт | Доступ |
|---|---|---:|---|
| Agent API/WSS | HTTPS | 443 | VLAN10 |
| MCP remote | HTTPS (Streamable) | 443 | только allowlist |
| MQTT | MQTT/TLS | 8883 | VLAN20 |
| MQTT (без TLS) | — | 1883 | **закрыт** |
| CoAP | CoAP/DTLS | 5684 | VLAN20 |
| Matter operational | UDP/IPv6 | 5540 (по умолч.) | IOT-MATTER |
| mDNS | UDP | 5353 | локальный сегмент |
| DNS | UDP/TCP | 53 | локальный резолвер |
| NTP | UDP | 123 | локальный/доверенный |
| RTSP | TCP | 554 | VLAN30 |
| RTSPS | TCP | 322 | VLAN30 |
| ONVIF | HTTP | 80 | VLAN30 |
| ONVIF | HTTPS | 443 | VLAN30 |
| WebRTC media | UDP | динамические (ICE) | локально/TURN |
| OTA | HTTPS | 443 | только подписанный сервер |
| UPnP/SSDP | UDP | 1900 | **выключен по умолчанию** |

## 9. VLAN и правила (исправлено)

| VLAN | Кто | Правила |
|---|---|---|
| 10 TRUSTED | агент, NAS, телефоны | доступ к 20/30 — только нужные порты |
| 20 IOT-MATTER | Matter/Thread-узлы, OTBR, MQTT | внутри — мультикаст/mDNS/ICMPv6 разрешены; **в WAN — запрещено** (кроме allowlist OTA производителя через proxy) |
| 30 CAMERAS | IP-камеры, NVR, звонок | только к медиа-шлюзу; в 10 — нет |
| 40 GUEST | гости | полностью изолированы от 10 и 20 |
| (egress) | прокси | allowlist доменов; DNS-фильтр; без прямых соединений |

Правила: нет входящих из интернета; все исходящие через egress-proxy; агент имеет явные правила к каждой VLAN. Пример хостового файервола — `reference/deploy/nftables.example.conf`.

## 10. Безопасность каналов

| Канал | Защита |
|---|---|
| Agent ↔ MCP local | подпись, песочница, capability-токены |
| Agent ↔ MCP remote | TLS 1.3, OAuth 2.1, allowlist, проверка `iss` |
| Agent ↔ Matter | CASE/PASE, ACL, сертификаты устройств, CRL (чанки, 1.6) |
| Agent ↔ Zigbee | network key, install code, изоляция моста |
| Agent ↔ MQTT | mTLS, topic ACL |
| Agent ↔ Camera | RTSPS/SRTP, VLAN, локальное хранилище |
| Agent ↔ Phone | WSS, токен, биометрия для critical |
| Agent ↔ Cloud | egress-proxy, редактирование PII, `raw audio: never` |

## 11. Политика облака

См. `reference/policy/cloud_policy.yaml`. Результаты облачных вызовов помечаются `provenance: web` (недоверенный источник).

## 12. Маршрут тревоги (офлайн)

```text
mmWave/кнопка SOS → событие → SAFETY MCU → локальная сирена + Thread/BLE/Wi-Fi уведомление
        └→ (SoC жив) «Всё в порядке?» (20 с) → ответ «да» → отмена и пометка ложной тревоги
                                              → нет ответа → контакты (по standing grant), без облака
```

## 13. Сингулярная формула сети

```text
One agent. Many protocols. One event bus. One policy gate. One audit chain. Zero implicit cloud access.
```
