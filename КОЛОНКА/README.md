# УМНАЯ КОЛОНКА · OMNISPEAKER-1 — дистрибутив трека дома СИНГУЛЯР

> **Что это:** дистрибутив трека «УМНАЯ КОЛОНКА» (проектный комплекс OMNISPEAKER-1, v0.4.0),
> слитый с домом **СИНГУЛЯР** как дверь **·42 КОЛОНКА**.
> **Живая комната трека:** [`../СИНГУЛЯР_39_КОЛОНКА.html`](../СИНГУЛЯР_39_КОЛОНКА.html) — единый офлайн-файл-организм,
> где этот трек живёт среди остальных дверей дома.
> **Хаб дома:** <https://rtynbirf.github.io/singulyar/>

---

## 1. Формула OMNISPEAKER-1

Из `docs/00_AUDIT_AND_REVISION.md` (v0.4.0):

```
OMNISPEAKER-1 =
  [Акустика 360° + 8ch DSP AEC Beamforming]
+ [60GHz mmWave presence/fall radar]
+ [Matter 1.6 / Thread 1.4 Border Router]
+ [On-Device NPU SLM 1B-3B Router + LLM 7B-14B Planner]
+ [MCP Tool Engine + Hash-Chain Policy Gate]
+ [VLAN 10-50 OpenWrt/OPNsense Isolation]
+ [Terraform / Ansible Automated IaC]
+ [0.8L Sealed Acoustic Shell + OpenSCAD CAD]
```

**Сингулярное свойство:** система превращается из набора умных гаджетов в единый распределённый орган
восприятия и действия. Пользователь формулирует абстрактную **цель**, а оркестратор мультиагентов
самостоятельно строит DAG-план, проверяет ограничения по таблице рисков, запрашивает подтверждение
для критических операций и исполняет задачи локально.

---

## 2. ЗАКОН СИНГУЛЯРА и как трек ему соответствует

**Закон:** эргономика, приватность, конфиденциальность и юзабилити — во главе угла.
Ни одна функция не стоит выше здоровья, покоя и безопасности жильца.

| Принцип закона | Реализация в OMNISPEAKER-1 | Где в дистрибутиве |
|---|---|---|
| **Приватность / Absolute Offline-First** | Все действия в рамках безопасности, климата, освещения, локального RAG и голоса исполняются строго без интернета; сеть — только локальная (VLAN 10–50) | `docs/01_VISION.md`, `docs/05_NETWORK.md`, `config/net/` |
| **Конфиденциальность / Policy Gate** | Генерирующий ИИ — только предсказатель и планировщик: ни один вызов инструмента не исполняется без валидации детерминированным Policy Engine; опасные операции требуют явного подтверждения | `docs/06_PLANNING_TOOLS.md`, `config/policy_rules.json`, `docs/04_AGENT_ARCHITECTURE.md` |
| **Приватность / Hardware Privacy** | Физические микропереключатели (2-полюсный микрик) питания микрофонов и механическая шторка объектива камеры (PETG) — выключено значит физически отрезано | `docs/01_VISION.md`, `docs/03_FEATURE_MATRIX.md`, `docs/12_CAD_3D_ENCLOSURE.md`, `cad/omnispeaker_shell.scad` |
| **Юзабилити / Hash-Chain Audit** | Каждое действие агента пишется в неизменяемый цепочечно-хешированный лог аудита — состояние системы нельзя подменить незаметно; прозрачность вместо «чёрного ящика» | `docs/06_PLANNING_TOOLS.md`, `docs/09_RISKS_PRIVACY.md`, `docs/15_EMERGENT_INTEGRATION.md` |

Регуляторный контур (CRA 2026 / EU AI Act): Hardware Root of Trust, подписанные OTA-обновления,
отказ от эмоциональной диагностики без медицинских лицензий — см. `docs/09_RISKS_PRIVACY.md`.

---

## 3. Карта каталога

```
КОЛОНКА_distro/
├── README.md            — этот мост «трек → дом СИНГУЛЯР»
├── docs/                — полная проектная документация, 16 разделов (00..15)
│   ├── 00_AUDIT_AND_REVISION.md   — аудит, ревизия и эмерджентный синтез (формула трека)
│   ├── 01_VISION.md               — видение, границы, 4 ключевых принципа архитектуры
│   ├── 02_TZ.md                   — полное техническое задание
│   ├── 03_FEATURE_MATRIX.md       — матрица функциональности (M/S/C/X)
│   ├── 04_AGENT_ARCHITECTURE.md   — мультиагентный оркестратор
│   ├── 05_NETWORK.md              — сетевая архитектура и VLAN
│   ├── 06_PLANNING_TOOLS.md       — планирование, MCP и Policy Engine
│   ├── 07_DETAILED_ROADMAP.md     — дорожная карта (Фазы 0..5)
│   ├── 08_HARDWARE_BOM.md         — ведомость материалов (BOM)
│   ├── 09_RISKS_PRIVACY.md        — риски, приватность, CRA 2026 / EU AI Act
│   ├── 10_IMPLEMENTATION_GUIDE.md — руководство по развертыванию
│   ├── 11_OPERATIONAL_PLAYBOOK.md — эксплуатация и ПСИ
│   ├── 12_CAD_3D_ENCLOSURE.md     — CAD-спецификация корпуса и акустики
│   ├── 13_NETWORK_ROUTING_OPENWRT_OPNSENSE.md — маршрутизация и фаервол
│   ├── 14_AUTOMATION_ANSIBLE_TERRAFORM.md     — инфраструктура как код
│   └── 15_EMERGENT_INTEGRATION.md — итоговая системная интеграция
├── cad/                 — 3D-печать корпуса: omnispeaker_shell.scad (OpenSCAD, 0.8L
│                          герметичная акустическая камера) + assembly_guide.txt
├── automation/          — стек IaC: terraform/ (Proxmox/Docker/DNS) и ansible/
│                          (плейбуки OpenWrt, OPNsense, OMNISPEAKER Node)
├── config/              — готовые конфиги: docker-compose.yml (Whisper, Piper, Matter),
│                          policy_rules.json (правила Policy Engine), net/ (OpenWrt/OPNsense)
├── prototype/           — интерактивный веб-прототип v0.4.0 (index.html, 5 вкладок)
└── assets/              — дизайн-токены (tokens.css)
```

**Быстрый старт:** открыть `prototype/index.html` в браузере; для 3D-печати — `cad/omnispeaker_shell.scad`
в OpenSCAD; для развертывания — Terraform + Ansible из `automation/`.

---

## 4. Связь с домом СИНГУЛЯР

- **Живой организм:** [`../СИНГУЛЯР_39_КОЛОНКА.html`](../СИНГУЛЯР_39_КОЛОНКА.html) — комната-файл,
  где дверь **·42 КОЛОНКА** открывает этот трек внутри дома. Всё работает офлайн, одним файлом.
- **Хаб дома:** <https://rtynbirf.github.io/singulyar/> — витрина всех дверей и треков.
- Дом СИНГУЛЯР — живая комната-организм: как двери дома растут из треков, так и этот дистрибутив
  является проектным «скелетом» комнаты: спецификация → CAD → автоматизация → прототип → живая дверь.

*Трек скопирован без изменений (кроме этого README-моста). Источник: `omnispeaker-1-ultimate-master` v0.4.0, дата: 2026-10-11.*
