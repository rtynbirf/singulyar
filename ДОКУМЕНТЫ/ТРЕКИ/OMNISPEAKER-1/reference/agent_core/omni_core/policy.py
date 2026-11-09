"""Детерминированный policy engine. Не использует ML. Не изменяется агентом.

Порядок правил — от более строгих к менее строгим; побеждает самое строгое.
"""
from __future__ import annotations
import enum, hashlib, json
from dataclasses import dataclass, field
from typing import List
from .models import (Risk, ToolSpec, ToolCall, Principal, WorldState, Provenance,
                     TRUSTED_FOR_ACTIONS, UNTRUSTED)


class Verdict(enum.Enum):
    ALLOW = "allow"
    CONFIRM = "confirm"      # нужен ответ пользователя (канал — по риску)
    CONFIRM_2F = "confirm_2f"  # два фактора (телефон + голос/кнопка)
    DENY = "deny"


@dataclass
class Decision:
    verdict: Verdict
    reasons: List[str] = field(default_factory=list)
    rule_ids: List[str] = field(default_factory=list)

    def stricter(self, other: "Decision") -> "Decision":
        order = [Verdict.ALLOW, Verdict.CONFIRM, Verdict.CONFIRM_2F, Verdict.DENY]
        return other if order.index(other.verdict) > order.index(self.verdict) else self


class PolicyEngine:
    """Правила P-001…: см. reference/policy/risk_matrix.yaml."""

    def __init__(self, rules_version: str = "1.0"):
        self.rules_version = rules_version
        self._fingerprint = hashlib.sha256(
            json.dumps({"v": rules_version, "rules": self._rule_ids()}, sort_keys=True).encode()
        ).hexdigest()

    @staticmethod
    def _rule_ids():
        return ["P-001", "P-002", "P-003", "P-004", "P-005", "P-006", "P-007", "P-008", "P-009", "P-011", "P-012"]

    @property
    def fingerprint(self) -> str:
        """Хэш набора правил — пишется в каждую запись аудита; смена правил видна в журнале."""
        return self._fingerprint

    def decide(self, call: ToolCall, spec: ToolSpec, who: Principal, world: WorldState) -> Decision:
        findings = []   # (Verdict, rule_id, причина)

        def add(v: Verdict, rid: str, why: str):
            findings.append((v, rid, why))

        # P-001: запрещённое
        if spec.risk == Risk.FORBIDDEN:
            add(Verdict.DENY, "P-001", "инструмент помечен forbidden")

        # P-002: недоверенный источник не может вызывать побочные эффекты (indirect prompt injection)
        if call.provenance in UNTRUSTED and spec.side_effects:
            add(Verdict.DENY, "P-002", "инструкция из недоверенного источника (%s) не может вызывать действия"
                % call.provenance.value)
        if call.provenance == Provenance.MODEL and spec.side_effects and spec.risk >= Risk.MEDIUM:
            add(Verdict.DENY, "P-002", "вывод модели без внешнего подтверждения не может запускать medium+ действия")
        if call.provenance == Provenance.GUEST and spec.risk >= Risk.MEDIUM:
            add(Verdict.DENY, "P-002", "гость не может запускать medium+ действия")

        # P-003/P-004: облако, офлайн, паранойя, данные здоровья/биометрия
        if spec.cloud:
            if world.offline:
                add(Verdict.DENY, "P-003", "офлайн: облачные инструменты недоступны")
            if world.privacy_mode == "paranoia":
                add(Verdict.DENY, "P-003", "режим «паранойя»: облако отключено")
            if not world.cloud_consent:
                add(Verdict.DENY, "P-003", "нет согласия на облако (deny-by-default)")
            if spec.data_class in ("health", "biometric"):
                add(Verdict.DENY, "P-004", "health/biometric данные не покидают устройство")

        # P-005: данные здоровья требуют согласия
        if spec.data_class == "health" and not world.health_consent:
            add(Verdict.DENY, "P-005", "нет согласия на обработку данных здоровья")

        # P-006: права (RBAC); владелец имеет все scopes, кроме явно запрещённых правилами выше
        for sc in spec.scopes:
            if sc not in who.scopes and who.role != "owner":
                add(Verdict.DENY, "P-006", "нет права %s" % sc)

        # P-007: уровни риска
        if spec.risk == Risk.HIGH:
            add(Verdict.CONFIRM, "P-007", "high-risk требует подтверждения")
        if spec.risk == Risk.CRITICAL:
            add(Verdict.CONFIRM_2F, "P-007", "critical требует двух факторов")
            if who.role == "guest":
                add(Verdict.DENY, "P-007", "гость не может подтверждать critical")

        # P-008: голосовой ID — не фактор для high/critical
        if (spec.risk >= Risk.HIGH and who.voice_verified and not who.second_factor
                and call.provenance in (Provenance.OWNER_DIRECT, Provenance.USER_DIRECT)):
            add(Verdict.CONFIRM_2F, "P-008", "голосовой ID не заменяет второй фактор")

        # P-009: тихие часы и сон. Safety-события датчиков НЕ подавляются.
        if call.provenance != Provenance.SENSOR_EVENT:
            if world.quiet_hours and spec.name.startswith("media.") and call.provenance != Provenance.OWNER_DIRECT:
                add(Verdict.DENY, "P-009", "тихие часы")
            if world.someone_sleeping and spec.name == "media.play":
                add(Verdict.DENY, "P-009", "кто-то спит — музыка не запускается")

        # P-012: аппаратные выключатели (mic/cam) — безусловный запрет, прошивка их не отменяет
        for line in spec.needs_hw:
            if line in world.hw_off:
                add(Verdict.DENY, "P-012", "аппаратно отключено: %s" % line)

        order = [Verdict.ALLOW, Verdict.CONFIRM, Verdict.CONFIRM_2F, Verdict.DENY]
        verdict = Verdict.ALLOW
        for v, _, _ in findings:
            if order.index(v) > order.index(verdict):
                verdict = v
        reasons = [w for v, _, w in findings if v == verdict] or []
        rules = sorted({r for v, r, _ in findings if v == verdict})
        # P-011: заранее выданное владельцем разрешение (standing grant) снимает ТОЛЬКО обычное подтверждение
        # для событий датчиков/утверждённых автоматизаций; critical и 2FA не снимаются никогда.
        if (verdict == Verdict.CONFIRM and call.tool in world.standing_grants
                and call.provenance in (Provenance.SENSOR_EVENT, Provenance.AUTOMATION)):
            return Decision(Verdict.ALLOW, ["standing grant владельца: %s" % call.tool], ["P-011"])
        return Decision(verdict, reasons, rules)
