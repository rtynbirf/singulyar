# omni_core — референс-ядро локального агента

Стандартная библиотека Python ≥ 3.10, без внешних зависимостей. 38 тестов.

```bash
cd reference/agent_core
python3 -m pip install pytest
python3 -m pytest -q
```

Что реализовано (и что проверяют тесты):

| Модуль | Назначение | Тесты |
|---|---|---|
| `models.py` | Risk, Provenance, ToolSpec (манифест принадлежит хосту), ToolCall, Principal, WorldState | — |
| `verifier.py` | Схема аргументов, неизвестный инструмент/устройство, additionalProperties, idempotency_key | unknown_tool, schema, hallucinated_device |
| `policy.py` | Правила P-001…P-009: provenance, облако, здоровье, RBAC, risk, 2FA, тихие часы | injection ×4, cloud, health, voice-ID ≠ 2FA |
| `manifest.py` | Загрузка подписанного манифеста хоста; заявления сервера игнорируются | manifest_overrides, bad_signature |
| `audit.py` | Append-only hash-chain, обнаружение правки/удаления | tampering, deletion |
| `planner.py` | DAG, топосортировка, волны параллельности, бюджет шагов, детектор циклов | toposort, cycle, budget, loop |
| `executor.py` | verify → policy → confirm → handler → retry (только идемпотентные) → saga | saga, retry, idempotency, cancel |

Это ядро решений. Его нужно оборачивать: ASR/TTS/wake word, MCP-хост, Matter-драйвер, хранилища — см. docs/10_IMPLEMENTATION_GUIDE.md.
