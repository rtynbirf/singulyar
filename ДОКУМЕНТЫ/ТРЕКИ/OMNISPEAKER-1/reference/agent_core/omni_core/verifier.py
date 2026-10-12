"""Верификатор: схема, существование инструмента/устройства, бюджет шагов — ДО policy и исполнения."""
from __future__ import annotations
from typing import Any, Dict
from .models import ToolSpec, ToolCall, WorldState


class VerificationError(Exception):
    def __init__(self, code: str, msg: str):
        super().__init__("%s: %s" % (code, msg))
        self.code = code


_TYPES = {"string": str, "integer": int, "number": (int, float), "boolean": bool, "object": dict, "array": list}


def _check(schema: Dict[str, Any], value: Any, path: str = "$"):
    t = schema.get("type")
    if t:
        py = _TYPES[t]
        if t in ("integer", "number") and isinstance(value, bool):
            raise VerificationError("schema", "%s: ожидался %s" % (path, t))
        if not isinstance(value, py):
            raise VerificationError("schema", "%s: ожидался %s" % (path, t))
    if "enum" in schema and value not in schema["enum"]:
        raise VerificationError("schema", "%s: значение вне enum" % path)
    if "minimum" in schema and value < schema["minimum"]:
        raise VerificationError("schema", "%s: меньше минимума" % path)
    if "maximum" in schema and value > schema["maximum"]:
        raise VerificationError("schema", "%s: больше максимума" % path)
    if t == "object":
        props = schema.get("properties", {})
        for r in schema.get("required", []):
            if r not in value:
                raise VerificationError("schema", "%s.%s: обязательное поле" % (path, r))
        if schema.get("additionalProperties") is False:
            for k in value:
                if k not in props:
                    raise VerificationError("schema", "%s.%s: неизвестное поле" % (path, k))
        for k, v in value.items():
            if k in props:
                _check(props[k], v, "%s.%s" % (path, k))


class Verifier:
    def __init__(self, registry: Dict[str, ToolSpec], max_steps: int = 25, max_tool_calls: int = 40):
        self.registry = registry
        self.max_steps = max_steps
        self.max_tool_calls = max_tool_calls

    def verify(self, call: ToolCall, world: WorldState, calls_so_far: int = 0) -> ToolSpec:
        if calls_so_far >= self.max_tool_calls:
            raise VerificationError("budget", "исчерпан лимит вызовов инструментов")
        spec = self.registry.get(call.tool)
        if spec is None:
            raise VerificationError("unknown_tool", "инструмент %r не в реестре" % call.tool)
        _check(spec.input_schema, call.arguments)
        dev = call.arguments.get("device_id") or call.arguments.get("lock_id")
        if dev is not None and world.devices and dev not in world.devices:
            raise VerificationError("unknown_device", "устройство %r не найдено (модели запрещено выдумывать id)" % dev)
        if spec.side_effects and not spec.idempotent and not call.idempotency_key:
            raise VerificationError("idempotency", "для неидемпотентного действия нужен idempotency_key")
        return spec
