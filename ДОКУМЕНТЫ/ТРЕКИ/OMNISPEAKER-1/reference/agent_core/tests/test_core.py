import pytest
from helpers import *
from omni_core import *


def call(tool, args=None, prov=Provenance.OWNER_DIRECT, key=None):
    return ToolCall(tool, args or {}, prov, key)


# ---------- verifier
def test_unknown_tool_rejected():
    ex, log, _ = make_exec()
    r = ex.run_call(call("lights.invent", {}), OWNER, WORLD())
    assert r.outcome == Outcome.VALIDATION


def test_schema_violation_rejected():
    ex, _, _ = make_exec()
    r = ex.run_call(call("lights.set_state", {"device_id": "kitchen_light", "state": "maybe"}), OWNER, WORLD())
    assert r.outcome == Outcome.VALIDATION


def test_hallucinated_device_rejected():
    ex, _, _ = make_exec()
    r = ex.run_call(call("lights.set_state", {"device_id": "ghost_lamp", "state": "on"}), OWNER, WORLD())
    assert r.outcome == Outcome.VALIDATION


def test_unexpected_field_rejected():
    ex, _, _ = make_exec()
    r = ex.run_call(call("lights.set_state", {"device_id": "kitchen_light", "state": "on", "evil": 1}), OWNER, WORLD())
    assert r.outcome == Outcome.VALIDATION


def test_non_idempotent_needs_key():
    ex, _, _ = make_exec()
    r = ex.run_call(call("security.unlock_door", {"lock_id": "front_door"}), OWNER, WORLD())
    assert r.outcome == Outcome.VALIDATION


# ---------- policy
def test_low_risk_allowed_without_confirm():
    asked = []
    ex, _, _ = make_exec(confirm=lambda c, s, r: asked.append(1) or True)
    r = ex.run_call(call("lights.set_state", {"device_id": "kitchen_light", "state": "on"}), OWNER, WORLD())
    assert r.outcome == Outcome.SUCCESS and not asked


def test_critical_requires_confirmation_even_for_owner():
    asked = []
    ex, _, _ = make_exec(confirm=lambda c, s, r: asked.append(1) or True)
    r = ex.run_call(call("security.unlock_door", {"lock_id": "front_door"}, key="k1"), OWNER, WORLD())
    assert r.outcome == Outcome.SUCCESS and asked == [1]


def test_critical_denied_when_user_declines():
    ex, _, _ = make_exec(confirm=lambda c, s, r: False)
    r = ex.run_call(call("security.unlock_door", {"lock_id": "front_door"}, key="k1"), OWNER, WORLD())
    assert r.outcome == Outcome.DENIED


def test_voice_only_is_not_second_factor():
    voice_only = Principal("u1", "owner", frozenset({"home.locks"}), voice_verified=True, second_factor=False)
    reg = registry()
    d = PolicyEngine().decide(call("security.unlock_door", {"lock_id": "front_door"}, key="k"),
                              reg["security.unlock_door"], voice_only, WORLD())
    assert d.verdict == Verdict.CONFIRM_2F and "P-008" in d.rule_ids


def test_guest_cannot_unlock():
    ex, _, _ = make_exec()
    r = ex.run_call(call("security.unlock_door", {"lock_id": "front_door"}, Provenance.GUEST, "k"), GUEST, WORLD())
    assert r.outcome == Outcome.DENIED


def test_member_without_scope_denied():
    ex, _, _ = make_exec()
    r = ex.run_call(call("security.unlock_door", {"lock_id": "front_door"}, Provenance.USER_DIRECT, "k"), MEMBER, WORLD())
    assert r.outcome == Outcome.DENIED


# ---------- indirect prompt injection
@pytest.mark.parametrize("prov", [Provenance.UNTRUSTED_AUDIO, Provenance.WEB, Provenance.DOCUMENT,
                                  Provenance.MEMORY_INFERRED])
def test_untrusted_sources_cannot_trigger_side_effects(prov):
    ex, log, _ = make_exec()
    for tool, args in [("lights.set_state", {"device_id": "kitchen_light", "state": "off"}),
                       ("security.unlock_door", {"lock_id": "front_door"})]:
        r = ex.run_call(call(tool, args, prov, "k-" + tool), OWNER, WORLD())
        assert r.outcome == Outcome.DENIED
    assert any(x["kind"] == "policy" and "P-002" in x["data"]["rules"] for x in log.records())


def test_model_alone_cannot_start_medium_plus():
    ex, _, _ = make_exec()
    r = ex.run_call(call("security.lock_door", {"lock_id": "front_door"}, Provenance.MODEL), OWNER, WORLD())
    assert r.outcome == Outcome.DENIED


def test_read_only_tool_allowed_from_untrusted_context():
    ex, _, _ = make_exec()
    r = ex.run_call(call("home_core.list_devices", {}, Provenance.DOCUMENT), OWNER, WORLD())
    assert r.outcome == Outcome.SUCCESS


# ---------- cloud / health
def test_cloud_denied_offline_and_without_consent():
    ex, _, _ = make_exec()
    assert ex.run_call(call("cloud.web_search", {"q": "x"}), OWNER, WORLD(offline=True)).outcome == Outcome.DENIED
    assert ex.run_call(call("cloud.web_search", {"q": "x"}), OWNER,
                       WORLD(offline=False, cloud_consent=False)).outcome == Outcome.DENIED
    assert ex.run_call(call("cloud.web_search", {"q": "x"}), OWNER,
                       WORLD(offline=False, cloud_consent=True)).outcome == Outcome.SUCCESS


def test_paranoia_blocks_cloud_even_with_consent():
    ex, _, _ = make_exec()
    r = ex.run_call(call("cloud.web_search", {"q": "x"}), OWNER,
                    WORLD(offline=False, cloud_consent=True, privacy_mode="paranoia"))
    assert r.outcome == Outcome.DENIED


def test_health_never_to_cloud_even_with_all_consents():
    ex, _, _ = make_exec()
    r = ex.run_call(call("health.export_cloud", {}, key="k"), OWNER,
                    WORLD(offline=False, cloud_consent=True, health_consent=True))
    assert r.outcome == Outcome.DENIED


def test_health_read_requires_consent():
    ex, _, _ = make_exec()
    assert ex.run_call(call("health.read_metrics"), OWNER, WORLD()).outcome == Outcome.DENIED
    assert ex.run_call(call("health.read_metrics"), OWNER, WORLD(health_consent=True)).outcome == Outcome.SUCCESS


def test_sleep_blocks_music_but_not_safety_events():
    ex, _, _ = make_exec()
    assert ex.run_call(call("media.play", {}), OWNER, WORLD(someone_sleeping=True)).outcome == Outcome.DENIED
    r = ex.run_call(call("lights.set_state", {"device_id": "kitchen_light", "state": "on"}, Provenance.SENSOR_EVENT),
                    OWNER, WORLD(quiet_hours=True, someone_sleeping=True))
    assert r.outcome == Outcome.SUCCESS


# ---------- audit
def test_audit_chain_detects_tampering():
    ex, log, _ = make_exec()
    ex.run_call(call("lights.set_state", {"device_id": "kitchen_light", "state": "on"}), OWNER, WORLD())
    assert log.verify() is None
    log._records[0]["data"]["tool"] = "forged"
    assert log.verify() == 0


def test_audit_chain_detects_deletion():
    ex, log, _ = make_exec()
    for _ in range(3):
        ex.run_call(call("home_core.list_devices"), OWNER, WORLD())
    del log._records[1]
    assert log.verify() is not None


# ---------- planner
def test_plan_toposort_and_waves():
    mk = lambda i, d=(): Step(i, call("home_core.list_devices"), list(d))
    p = Plan("g", [mk("a"), mk("b", "a"), mk("c", "a"), mk("d", "bc")])
    assert p.waves() == [["a"], ["b", "c"], ["d"]]


def test_plan_cycle_rejected():
    mk = lambda i, d: Step(i, call("home_core.list_devices"), list(d))
    with pytest.raises(PlanError):
        Plan("g", [mk("a", "b"), mk("b", "a")])


def test_plan_over_budget_rejected():
    steps = [Step("s%d" % i, call("home_core.list_devices")) for i in range(30)]
    with pytest.raises(PlanError):
        Plan("g", steps, max_steps=25)


def test_loop_detector():
    ld = LoopDetector(identical_call_limit=2, state_unchanged_limit=3)
    c = call("lights.set_state", {"device_id": "kitchen_light", "state": "on"})
    assert ld.observe(c, True) is None
    assert ld.observe(c, True) is None
    assert ld.observe(c, True) == "identical_call_limit"


# ---------- executor: saga, retry, cancel
def test_saga_compensates_on_critical_failure():
    calls = []

    def ok(c):
        calls.append(c.tool)
        return ToolResult(Outcome.SUCCESS)

    def boom(c):
        return ToolResult(Outcome.CRITICAL_FAILURE, state_changed=False)

    ex, log, _ = make_exec({"lights.set_state": ok, "security.lock_door": ok, "flaky.write": boom})
    plan = Plan("g", [
        Step("s1", call("lights.set_state", {"device_id": "kitchen_light", "state": "on"})),
        Step("s2", call("flaky.write", {}, key="w"), ["s1"]),
    ])
    res = ex.run_plan(plan, OWNER, WORLD())
    assert res["s2"].outcome == Outcome.CRITICAL_FAILURE
    assert calls.count("lights.set_state") == 2           # действие + компенсация
    assert any(r["kind"] == "compensation" for r in log.records())


def test_retry_only_for_idempotent():
    attempts = {"read": 0, "write": 0}

    def flaky_read(c):
        attempts["read"] += 1
        return ToolResult(Outcome.TIMEOUT if attempts["read"] < 3 else Outcome.SUCCESS)

    def flaky_write(c):
        attempts["write"] += 1
        return ToolResult(Outcome.TIMEOUT)

    ex, _, _ = make_exec({"flaky.read": flaky_read, "flaky.write": flaky_write})
    assert ex.run_call(call("flaky.read"), OWNER, WORLD()).outcome == Outcome.SUCCESS
    assert attempts["read"] == 3
    assert ex.run_call(call("flaky.write", {}, key="w1"), OWNER, WORLD()).outcome == Outcome.TIMEOUT
    assert attempts["write"] == 1                          # не повторяем неидемпотентное


def test_idempotency_key_prevents_double_unlock():
    n = []
    ex, _, _ = make_exec({"security.unlock_door": lambda c: n.append(1) or ToolResult(Outcome.SUCCESS)})
    c = call("security.unlock_door", {"lock_id": "front_door"}, key="same")
    ex.run_call(c, OWNER, WORLD())
    ex.run_call(c, OWNER, WORLD())
    assert len(n) == 1


def test_cancel_stops_plan_and_compensates():
    ex, log, _ = make_exec()
    plan = Plan("g", [
        Step("s1", call("lights.set_state", {"device_id": "kitchen_light", "state": "on"})),
        Step("s2", call("home_core.list_devices"), ["s1"]),
    ])
    orig = ex.run_call

    def run_and_cancel(*a, **k):
        r = orig(*a, **k)
        ex.cancel()
        return r
    ex.run_call = run_and_cancel
    ex.run_plan(plan, OWNER, WORLD())
    kinds = [r["kind"] for r in log.records()]
    assert "plan_cancelled" in kinds and "compensation" in kinds


def test_conditional_step_skipped():
    ex, log, _ = make_exec()
    plan = Plan("g", [Step("m", call("media.play", {}), condition="nobody_sleeping")])
    ex.run_plan(plan, OWNER, WORLD(), predicates={"nobody_sleeping": lambda: False})
    assert any(r["kind"] == "step_skipped" for r in log.records())


def test_dependent_step_blocked_when_dependency_denied():
    ex, log, _ = make_exec()
    plan = Plan("g", [
        Step("a", call("security.unlock_door", {"lock_id": "front_door"}, Provenance.GUEST, "k"), []),
        Step("b", call("home_core.list_devices"), ["a"]),
    ])
    ex.run_plan(plan, GUEST, WORLD())
    assert any(r["kind"] == "step_blocked" for r in log.records())


# ---------- P-011 / P-012
def test_standing_grant_downgrades_high_for_sensor_not_for_critical():
    reg = registry()
    reg["health.emergency_contact"] = ToolSpec("health.emergency_contact", Risk.HIGH, True, False, False,
                                               {"type": "object"})
    pe = PolicyEngine()
    w = WORLD(standing_grants=frozenset({"health.emergency_contact", "security.unlock_door"}))
    c = ToolCall("health.emergency_contact", {}, Provenance.SENSOR_EVENT, "k")
    assert pe.decide(c, reg["health.emergency_contact"], OWNER, w).verdict == Verdict.ALLOW
    c2 = ToolCall("security.unlock_door", {"lock_id": "front_door"}, Provenance.AUTOMATION, "k2")
    assert pe.decide(c2, reg["security.unlock_door"], OWNER, w).verdict == Verdict.CONFIRM_2F
    c3 = ToolCall("health.emergency_contact", {}, Provenance.MODEL, "k3")      # модель grant не использует
    assert pe.decide(c3, reg["health.emergency_contact"], OWNER, w).verdict == Verdict.DENY   # P-002 строже


def test_hardware_kill_switch_is_absolute():
    reg = registry()
    reg["vision.describe"] = ToolSpec("vision.describe", Risk.LOW, False, True, True, {"type": "object"}, needs_hw=("cam",))
    pe = PolicyEngine()
    d = pe.decide(ToolCall("vision.describe", {}, Provenance.OWNER_DIRECT), reg["vision.describe"], OWNER,
                  WORLD(hw_off=frozenset({"cam"})))
    assert d.verdict == Verdict.DENY and "P-012" in d.rule_ids
    assert pe.decide(ToolCall("vision.describe", {}, Provenance.OWNER_DIRECT), reg["vision.describe"], OWNER,
                     WORLD()).verdict == Verdict.ALLOW


# ---------- манифест хоста
def _manifest(sign):
    d = {"manifest_version": "1.0", "tools": [
        {"name": "security.unlock_door", "risk": "critical", "side_effects": True, "reversible": True,
         "idempotent": False, "input_schema": {"type": "object"},
         "annotations": {"readOnlyHint": True, "risk": "safe"}}]}   # «заявление сервера» — должно игнорироваться
    d["signature"] = sign(canonical(d))
    return d


def test_manifest_overrides_server_claims():
    sign, verify = hmac_signer(b"k")
    reg = load_registry(_manifest(sign), verify)
    assert reg["security.unlock_door"].risk == Risk.CRITICAL and reg["security.unlock_door"].side_effects


def test_manifest_rejects_bad_signature_and_missing_verifier():
    sign, verify = hmac_signer(b"k")
    d = _manifest(sign)
    d["tools"][0]["risk"] = "safe"                      # правка после подписи
    with pytest.raises(ManifestError):
        load_registry(d, verify)
    with pytest.raises(ManifestError):
        load_registry(_manifest(sign), None)
