"""Исполнитель: verifier → policy → подтверждение → вызов → наблюдение → saga-компенсация."""
from __future__ import annotations
import enum, time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional
from .models import ToolCall, ToolSpec, Principal, WorldState, Confirm, Provenance
from .policy import PolicyEngine, Verdict
from .verifier import Verifier, VerificationError
from .audit import HashChainLog
from .planner import Plan, LoopDetector


class Outcome(enum.Enum):
    SUCCESS = "success"
    PARTIAL = "partial_success"
    TIMEOUT = "timeout"
    OFFLINE_DEVICE = "device_offline"
    VALIDATION = "validation_error"
    DENIED = "permission_denied"
    CRITICAL_FAILURE = "critical_failure"


@dataclass
class ToolResult:
    outcome: Outcome
    data: Dict[str, Any] = field(default_factory=dict)
    state_changed: bool = True


Handler = Callable[[ToolCall], ToolResult]

RETRY_ON = {Outcome.TIMEOUT}
NO_RETRY = {Outcome.DENIED, Outcome.VALIDATION}


class Executor:
    def __init__(self, registry: Dict[str, ToolSpec], handlers: Dict[str, Handler], policy: PolicyEngine,
                 audit: HashChainLog, confirm: Confirm, sleep: Callable[[float], None] = time.sleep,
                 max_retries: int = 3, base_delay: float = 0.25):
        self.registry, self.handlers, self.policy, self.audit = registry, handlers, policy, audit
        self.confirm, self.sleep = confirm, sleep
        self.verifier = Verifier(registry)
        self.max_retries, self.base_delay = max_retries, base_delay
        self.cancelled = False
        self._seen_keys: Dict[str, ToolResult] = {}

    def cancel(self):
        """«Стоп»: высший приоритет, прерывает план между шагами."""
        self.cancelled = True
        self.audit.append("cancel", {}, self.policy.fingerprint)

    def run_call(self, call: ToolCall, who: Principal, world: WorldState, calls_so_far: int = 0) -> ToolResult:
        try:
            spec = self.verifier.verify(call, world, calls_so_far)
        except VerificationError as e:
            self.audit.append("verify_fail", {"tool": call.tool, "code": e.code, "msg": str(e)}, self.policy.fingerprint)
            return ToolResult(Outcome.VALIDATION, {"error": str(e)}, False)

        if call.idempotency_key and call.idempotency_key in self._seen_keys:
            self.audit.append("idempotent_replay", {"tool": call.tool, "key": call.idempotency_key}, self.policy.fingerprint)
            return self._seen_keys[call.idempotency_key]

        dec = self.policy.decide(call, spec, who, world)
        self.audit.append("policy", {"tool": call.tool, "verdict": dec.verdict.value, "rules": dec.rule_ids,
                                     "reasons": dec.reasons, "prov": call.provenance.value, "who": who.id},
                          self.policy.fingerprint)
        if dec.verdict == Verdict.DENY:
            return ToolResult(Outcome.DENIED, {"reasons": dec.reasons}, False)
        if dec.verdict in (Verdict.CONFIRM, Verdict.CONFIRM_2F):
            ok = self.confirm(call, spec, dec.reasons)
            self.audit.append("confirmation", {"tool": call.tool, "granted": bool(ok), "level": dec.verdict.value},
                              self.policy.fingerprint)
            if not ok:
                return ToolResult(Outcome.DENIED, {"reasons": ["пользователь отклонил или не ответил"]}, False)

        handler = self.handlers.get(call.tool)
        if handler is None:
            return ToolResult(Outcome.CRITICAL_FAILURE, {"error": "нет обработчика"}, False)

        attempts = 0
        while True:
            attempts += 1
            res = handler(call)
            self.audit.append("tool_result", {"tool": call.tool, "outcome": res.outcome.value, "attempt": attempts},
                              self.policy.fingerprint)
            retryable = res.outcome in RETRY_ON and spec.idempotent   # повтор ТОЛЬКО идемпотентных
            if retryable and attempts < self.max_retries and not self.cancelled:
                self.sleep(self.base_delay * (2 ** (attempts - 1)))
                continue
            break
        if call.idempotency_key and res.outcome == Outcome.SUCCESS:
            self._seen_keys[call.idempotency_key] = res
        return res

    def run_plan(self, plan: Plan, who: Principal, world: WorldState,
                 predicates: Optional[Dict[str, Callable[[], bool]]] = None) -> Dict[str, ToolResult]:
        predicates = predicates or {}
        results: Dict[str, ToolResult] = {}
        done_with_effects: List[str] = []
        loop = LoopDetector()
        calls = 0
        self.audit.append("plan_start", {"goal": plan.goal, "steps": plan.order}, self.policy.fingerprint)
        for wave in plan.waves():
            for sid in wave:
                if self.cancelled:
                    self.audit.append("plan_cancelled", {"at": sid}, self.policy.fingerprint)
                    self._compensate(plan, done_with_effects, who, world)
                    return results
                step = plan.steps[sid]
                if step.condition and not predicates.get(step.condition, lambda: False)():
                    self.audit.append("step_skipped", {"step": sid, "cond": step.condition}, self.policy.fingerprint)
                    continue
                if any(results.get(d) is None or results[d].outcome != Outcome.SUCCESS for d in step.depends_on):
                    self.audit.append("step_blocked", {"step": sid}, self.policy.fingerprint)
                    continue
                res = self.run_call(step.call, who, world, calls)
                calls += 1
                results[sid] = res
                reason = loop.observe(step.call, res.state_changed)
                if reason:
                    self.audit.append("loop_stop", {"reason": reason, "step": sid}, self.policy.fingerprint)
                    self._compensate(plan, done_with_effects, who, world)
                    return results
                spec = self.registry.get(step.call.tool)
                if res.outcome == Outcome.SUCCESS and spec and spec.side_effects:
                    done_with_effects.append(sid)
                if res.outcome == Outcome.CRITICAL_FAILURE:
                    self.audit.append("critical_failure", {"step": sid}, self.policy.fingerprint)
                    self._compensate(plan, done_with_effects, who, world)
                    return results
        self.audit.append("plan_done", {"ok": all(r.outcome == Outcome.SUCCESS for r in results.values())},
                          self.policy.fingerprint)
        return results

    def _compensate(self, plan: Plan, done: List[str], who: Principal, world: WorldState):
        """Saga: компенсации в обратном порядке; невозможные — явно фиксируются."""
        for sid in reversed(done):
            call = plan.steps[sid].call
            spec = self.registry[call.tool]
            if not spec.compensation:
                self.audit.append("compensation_impossible", {"step": sid, "tool": call.tool}, self.policy.fingerprint)
                continue
            comp = ToolCall(spec.compensation, dict(call.arguments), Provenance.AUTOMATION,
                            idempotency_key="comp-%s" % sid)
            comp_spec = self.registry.get(spec.compensation)
            if comp_spec is None:
                self.audit.append("compensation_impossible", {"step": sid, "tool": call.tool}, self.policy.fingerprint)
                continue
            r = self.run_call(comp, who, world)
            self.audit.append("compensation", {"step": sid, "tool": spec.compensation, "outcome": r.outcome.value},
                              self.policy.fingerprint)
