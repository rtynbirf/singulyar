from omni_core import *
from omni_core.models import *


def registry():
    light = {"type": "object", "required": ["device_id", "state"], "additionalProperties": False,
             "properties": {"device_id": {"type": "string"}, "state": {"type": "string", "enum": ["on", "off"]},
                            "brightness": {"type": "integer", "minimum": 0, "maximum": 100}}}
    lock = {"type": "object", "required": ["lock_id"], "properties": {"lock_id": {"type": "string"}}}
    return {
        "home_core.list_devices": ToolSpec("home_core.list_devices", Risk.SAFE, False, True, True, {"type": "object"}),
        "lights.set_state": ToolSpec("lights.set_state", Risk.LOW, True, True, True, light,
                                     compensation="lights.set_state", scopes=("home.lights",)),
        "security.unlock_door": ToolSpec("security.unlock_door", Risk.CRITICAL, True, True, False, lock,
                                         compensation="security.lock_door", scopes=("home.locks",)),
        "security.lock_door": ToolSpec("security.lock_door", Risk.MEDIUM, True, True, True, lock),
        "media.play": ToolSpec("media.play", Risk.LOW, True, True, True, {"type": "object"}),
        "cloud.web_search": ToolSpec("cloud.web_search", Risk.MEDIUM, False, True, True,
                                     {"type": "object", "required": ["q"], "properties": {"q": {"type": "string"}}},
                                     cloud=True),
        "health.read_metrics": ToolSpec("health.read_metrics", Risk.LOW, False, True, True, {"type": "object"},
                                        data_class="health"),
        "health.export_cloud": ToolSpec("health.export_cloud", Risk.MEDIUM, True, False, False, {"type": "object"},
                                        cloud=True, data_class="health"),
        "flaky.read": ToolSpec("flaky.read", Risk.SAFE, False, True, True, {"type": "object"}),
        "flaky.write": ToolSpec("flaky.write", Risk.LOW, True, True, False, {"type": "object"}),
    }


OWNER = Principal("u1", "owner", frozenset({"home.lights", "home.locks"}), voice_verified=True, second_factor=True)
MEMBER = Principal("u2", "member", frozenset({"home.lights"}))
GUEST = Principal("g", "guest", frozenset())
WORLD = lambda **kw: WorldState(devices={"kitchen_light": {}, "front_door": {}}, **kw)


def make_exec(handlers=None, confirm=lambda c, s, r: True, **kw):
    reg = registry()
    h = {name: (lambda call: ToolResult(Outcome.SUCCESS)) for name in reg}
    if handlers:
        h.update(handlers)
    log = HashChainLog(clock=lambda: 0.0)
    ex = Executor(reg, h, PolicyEngine(), log, confirm, sleep=lambda s: None, **kw)
    return ex, log, reg
