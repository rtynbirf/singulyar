"""Append-only журнал с hash-chain: любая правка/удаление записи ломает проверку."""
from __future__ import annotations
import hashlib, json, time
from typing import Any, Dict, List, Optional


class HashChainLog:
    GENESIS = "0" * 64

    def __init__(self, clock=time.time):
        self._clock = clock
        self._records: List[Dict[str, Any]] = []

    def append(self, kind: str, data: Dict[str, Any], rules_fingerprint: str = "") -> Dict[str, Any]:
        prev = self._records[-1]["hash"] if self._records else self.GENESIS
        rec = {"seq": len(self._records), "ts": self._clock(), "kind": kind, "data": data,
               "rules": rules_fingerprint, "prev": prev}
        rec["hash"] = self._h(rec)
        self._records.append(rec)
        return rec

    @staticmethod
    def _h(rec: Dict[str, Any]) -> str:
        body = {k: rec[k] for k in ("seq", "ts", "kind", "data", "rules", "prev")}
        return hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()

    def verify(self) -> Optional[int]:
        """None — цепочка цела; иначе seq первой испорченной записи."""
        prev = self.GENESIS
        for i, r in enumerate(self._records):
            if r["seq"] != i or r["prev"] != prev or r["hash"] != self._h(r):
                return i
            prev = r["hash"]
        return None

    def records(self) -> List[Dict[str, Any]]:
        return list(self._records)

    def head(self) -> str:
        return self._records[-1]["hash"] if self._records else self.GENESIS

    def export_jsonl(self) -> str:
        return "\n".join(json.dumps(r, ensure_ascii=False, sort_keys=True, default=str) for r in self._records)
