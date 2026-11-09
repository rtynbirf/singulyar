"""Загрузка манифеста инструментов ХОСТА. Всё, что заявляет MCP-сервер (annotations и т.п.), игнорируется."""
from __future__ import annotations
import hashlib, hmac, json
from typing import Any, Callable, Dict, Optional
from .models import ToolSpec, Risk


class ManifestError(Exception):
    pass


def canonical(data: Dict[str, Any]) -> bytes:
    body = {k: v for k, v in data.items() if k != "signature"}
    return json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()


def load_registry(data: Dict[str, Any], verify: Optional[Callable[[bytes, str], bool]] = None) -> Dict[str, ToolSpec]:
    """verify(canonical_bytes, signature) -> bool. В продукте — ed25519; в тестах — HMAC-заглушка.
    Без verify загрузка запрещена: неподписанный манифест не принимается."""
    if verify is None:
        raise ManifestError("проверка подписи обязательна")
    if not verify(canonical(data), data.get("signature", "")):
        raise ManifestError("подпись манифеста недействительна")
    reg: Dict[str, ToolSpec] = {}
    for t in data["tools"]:
        reg[t["name"]] = ToolSpec(
            name=t["name"], risk=Risk[t["risk"].upper()], side_effects=t["side_effects"],
            reversible=t["reversible"], idempotent=t["idempotent"], input_schema=t["input_schema"],
            cloud=t.get("cloud", False), data_class=t.get("data_class", "none"),
            compensation=t.get("compensation"), scopes=tuple(t.get("scopes", [])),
            needs_hw=tuple(t.get("needs_hw", [])))
    return reg


def hmac_signer(key: bytes):
    sign = lambda b: hmac.new(key, b, hashlib.sha256).hexdigest()
    verify = lambda b, sig: hmac.compare_digest(sign(b), sig)
    return sign, verify
