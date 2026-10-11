# 05 · СЕТЕВАЯ АРХИТЕКТУРА И VLAN ИЗОЛЯЦИЯ

## 1. Топология сегментации

Для обеспечения абсолютной безопасности система OMNISPEAKER-1 требует разделения сети на изолированные VLAN:

```
[ INTERNET ]
     │
     ▼
[ OpenWrt / OPNsense Firewall ]
     ├── VLAN 10 (TRUSTED): 192.168.10.0/24 — Смартфоны, ПК, Панели управления
     ├── VLAN 20 (IOT OMNISPEAKER): 192.168.20.0/24 — OMNISPEAKER Node, Matter/Thread
     ├── VLAN 30 (CAMERAS/SENSORS): 192.168.30.0/24 — IP-камеры, изолированные датчики
     └── VLAN 50 (CLOUD PROXY): 192.168.50.0/24 — Точка выхода только для одобренных OTA/APIs
```

## 2. Матрица доступа (Firewall Matrix)

| Исходный VLAN | Назначение VLAN | Порты / Протоколы | Действие | Описание |
|---|---|---|---|---|
| VLAN 10 | VLAN 20 | TCP 80, 443, 8123, UDP 5353 | **ALLOW** | Полный доступ управления |
| VLAN 20 | VLAN 10 | Established / Related | **ALLOW** | Ответы на запросы |
| VLAN 20 | INTERNET | Any | **DROP** | Полный запрет выхода в облако |
| VLAN 20 | VLAN 50 | TCP 443 (Gated Domains) | **ALLOW (Strict)** | Только для OTA / Explicit Proxy |
| VLAN 30 | ANY | Any | **DROP** | Полная изоляция камер |
