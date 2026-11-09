# 13 · РУКОВОДСТВО ПО НАСТРОЙКЕ МАРШРУТИЗАЦИИ (OPENWRT / OPNSENSE)

## 1. Сетевая изоляция IoT-сегмента

Для гарантированной работы системы без зависимости от внешних облаков роутер (OpenWrt / OPNsense) изолирует OMNISPEAKER в VLAN 20.

### Основные правила:
- **VLAN 10 (Trusted):** 192.168.10.0/24 — Смартфоны и ПК пользователей.
- **VLAN 20 (IoT OMNISPEAKER):** 192.168.20.0/24 — OMNISPEAKER Node, Matter, Thread.

### Трафик mDNS / Matter:
Для прохождения пакетов управления Matter и поиска устройств между VLAN 10 и VLAN 20 используется Avahi Daemon с включенным рефлектором (`enable-reflector=yes`).
