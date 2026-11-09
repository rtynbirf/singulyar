# Архитектурная модель · Пульт «·31 РУМА ЛАДОМ»

## 1. Слои архитектуры

```
+-------------------------------------------------------------------+
|                     HUMAN INTENT & ACCESS (UI)                   |
|  [ Mobile Thumb Drawer ] [ Bento Board ] [ TV Central Focal Cone ] |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
|               ADAPTIVE VIEWPORT & FOCUS ENGINE                    |
|  - Container Queries & Fluid Clamping (clamp(1rem, 2vw, 2.5rem))  |
|  - Spatial D-Pad Navigation Snapping                              |
|  - Semantic Zoom Level Switcher (Micro / Detail / Focal)          |
+-------------------------------------------------------------------+
                                  |
+-------------------------------------------------------------------+
|                 SINGULYAR ROOM 31 DOMAIN CORE                      |
|  - Room State Machine (·31 РУМА: Климат, Двери, Связь, Режимы)   |
|  - Local Intent Dispatcher & Audit Surface                        |
+-------------------------------------------------------------------+
```

## 2. Модульная структура
- `index.html` — Единое адаптивное приложение.
- `css/console_styles.css` — CSS Container Queries, CSS Grid Layout, Fluid Typography, Focal Cone constraints.
- `js/console_engine.js` — Движок D-Pad навигации, переключения режимов (Mobile/Desktop/TV), семантического зума и симулятора пульта ДУ.
