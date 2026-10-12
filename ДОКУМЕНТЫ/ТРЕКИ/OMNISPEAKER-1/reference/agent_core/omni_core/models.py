from __future__ import annotations
import enum
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


class Risk(enum.IntEnum):
    SAFE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    FORBIDDEN = 5


class Provenance(enum.Enum):
    """Откуда пришла инструкция. Определяет, может ли она вызывать побочные эффекты."""
    OWNER_DIRECT = "owner_direct"      # владелец: голос с подтверждённым профилем / приложение
    USER_DIRECT = "user_direct"        # другой авторизованный член семьи
    GUEST = "guest"
    SENSOR_EVENT = "sensor_event"      # событие датчика (падение, протечка)
    AUTOMATION = "automation"          # утверждённое пользователем правило
    UNTRUSTED_AUDIO = "untrusted_audio"  # ТВ, радио, чужой голос, записанный звук
    WEB = "web"                        # результаты поиска
    DOCUMENT = "document"              # RAG, файлы, письма, календарные приглашения
    MEMORY_INFERRED = "memory_inferred"
    MODEL = "model"                    # собственный вывод модели без внешнего подтверждения


TRUSTED_FOR_ACTIONS = {
    Provenance.OWNER_DIRECT, Provenance.USER_DIRECT, Provenance.AUTOMATION, Provenance.SENSOR_EVENT,
}
UNTRUSTED = {
    Provenance.UNTRUSTED_AUDIO, Provenance.WEB, Provenance.DOCUMENT, Provenance.MEMORY_INFERRED,
}


@dataclass(frozen=True)
class ToolSpec:
    """Запись реестра инструментов. Принадлежит ХОСТУ, а не MCP-серверу и не модели.

    risk/reversible/side_effects, заявленные удалённым сервером, считаются недоверенными
    (в MCP annotations — подсказки). Реальные значения задаёт подписанный манифест хоста.
    """
    name: str
    risk: Risk
    side_effects: bool
    reversible: bool
    idempotent: bool
    input_schema: Dict[str, Any]
    cloud: bool = False
    data_class: str = "none"        # none | personal | health | biometric | financial
    compensation: Optional[str] = None  # имя инструмента-компенсатора
    scopes: tuple = ()               # требуемые права: "home.lights", "home.locks", ...
    needs_hw: tuple = ()             # аппаратные линии, без которых инструмент невозможен: "mic", "cam"


@dataclass
class ToolCall:
    tool: str
    arguments: Dict[str, Any]
    provenance: Provenance = Provenance.MODEL
    idempotency_key: Optional[str] = None
    rationale: str = ""              # краткое объяснение для журнала; НЕ используется для решений policy


@dataclass
class Principal:
    id: str
    role: str                         # owner | member | child | guest | system
    scopes: frozenset = frozenset()
    voice_verified: bool = False      # голосовое ID — удобство, не аутентификация
    second_factor: bool = False       # подтверждение на телефоне / физическая кнопка


@dataclass
class WorldState:
    offline: bool = True
    cloud_consent: bool = False
    health_consent: bool = False
    privacy_mode: str = "normal"      # normal | guest | paranoia
    quiet_hours: bool = False
    someone_sleeping: bool = False
    present_users: tuple = ()
    devices: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    hw_off: frozenset = frozenset()   # аппаратно отключённые линии (кнопки mic/cam)
    standing_grants: frozenset = frozenset()  # инструменты, заранее разрешённые владельцем для sensor/automation (не critical)


Confirm = Callable[[ToolCall, ToolSpec, List[str]], bool]
