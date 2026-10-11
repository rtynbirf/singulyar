# 06 · ПЛАНИРОВАНИЕ, MCP И POLICY ENGINE

## 1. Протокол Model Context Protocol (MCP 2026)

Все инструменты OMNISPEAKER-1 обёрнуты в MCP-серверы, взаимодействующие через `stdio` или `Streamable HTTP / SSE`.

Пример схемы инструмента `lights.set_state`:

```json
{
  "name": "lights.set_state",
  "description": "Изменяет состояние освещения в указанной зоне",
  "parameters": {
    "type": "object",
    "properties": {
      "room": { "type": "string", "enum": ["kitchen", "bedroom", "living_room", "all"] },
      "state": { "type": "string", "enum": ["on", "off"] },
      "brightness": { "type": "integer", "minimum": 0, "maximum": 100 }
    },
    "required": ["room", "state"]
  },
  "risk_level": "low"
}
```

## 2. Алгоритм проверки в Policy Engine

Когда Планировщик генерирует шаг, Engine выполняет проверки:
1. **Schema Validation:** Соответствие аргументов JSON Schema инструмента.
2. **Device Registry Check:** Существует ли устройство в локальной базе Matter/Zigbee.
3. **Risk Level Matrix:**
   - `safe` / `low`: Выполняется мгновенно с записью в хэш-цепочку лога.
   - `medium`: Выполняется при отсутствии конфликтующих автоматизаций.
   - `high` / `critical`: Блокируется до получения голоса/PWA подтверждения от пользователя.
