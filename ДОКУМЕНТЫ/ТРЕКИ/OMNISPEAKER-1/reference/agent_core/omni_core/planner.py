"""DAG плана, топологическая сортировка, детектор циклов и повторов."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from .models import ToolCall


class PlanError(Exception):
    pass


@dataclass
class Step:
    id: str
    call: ToolCall
    depends_on: List[str] = field(default_factory=list)
    condition: Optional[str] = None   # имя предиката из контекста; шаг пропускается, если False


class Plan:
    def __init__(self, goal: str, steps: List[Step], max_steps: int = 25):
        if len(steps) > max_steps:
            raise PlanError("план длиннее бюджета шагов (%d > %d)" % (len(steps), max_steps))
        self.goal = goal
        self.steps: Dict[str, Step] = {}
        for s in steps:
            if s.id in self.steps:
                raise PlanError("дубликат id шага: %s" % s.id)
            self.steps[s.id] = s
        for s in steps:
            for d in s.depends_on:
                if d not in self.steps:
                    raise PlanError("шаг %s зависит от неизвестного %s" % (s.id, d))
        self.order = self._toposort()

    def _toposort(self) -> List[str]:
        indeg = {k: 0 for k in self.steps}
        for s in self.steps.values():
            for _ in s.depends_on:
                indeg[s.id] += 1
        ready = sorted(k for k, v in indeg.items() if v == 0)
        out = []
        while ready:
            k = ready.pop(0)
            out.append(k)
            for s in self.steps.values():
                if k in s.depends_on:
                    indeg[s.id] -= 1
                    if indeg[s.id] == 0:
                        ready.append(s.id)
            ready.sort()
        if len(out) != len(self.steps):
            raise PlanError("в плане есть цикл")
        return out

    def waves(self) -> List[List[str]]:
        """Группы шагов, которые можно выполнять параллельно."""
        done, waves = set(), []
        remaining = list(self.order)
        while remaining:
            wave = [k for k in remaining if all(d in done for d in self.steps[k].depends_on)]
            if not wave:
                raise PlanError("недостижимые шаги")
            waves.append(wave)
            done.update(wave)
            remaining = [k for k in remaining if k not in wave]
        return waves


class LoopDetector:
    """identical_call_limit: одинаковый вызов подряд; state_unchanged_limit: вызовы без изменения состояния."""

    def __init__(self, identical_call_limit: int = 2, state_unchanged_limit: int = 3):
        self.ic = identical_call_limit
        self.su = state_unchanged_limit
        self._last = None
        self._same = 0
        self._unchanged = 0

    def observe(self, call: ToolCall, state_changed: bool) -> Optional[str]:
        sig = (call.tool, repr(sorted(call.arguments.items())))
        self._same = self._same + 1 if sig == self._last else 1
        self._last = sig
        self._unchanged = 0 if state_changed else self._unchanged + 1
        if self._same > self.ic:
            return "identical_call_limit"
        if self._unchanged >= self.su:
            return "state_unchanged_limit"
        return None
