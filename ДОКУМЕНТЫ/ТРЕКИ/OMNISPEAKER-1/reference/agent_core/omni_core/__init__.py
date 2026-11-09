"""omni_core — референс-ядро локального агента OMNISPEAKER-1.

Модули: models, policy, verifier, audit, planner, executor.
Принцип: LLM предлагает вызов, исполняет и разрешает — хост (этот код).
Зависимости: только стандартная библиотека Python 3.10+.
"""
from .models import *   # noqa
from .policy import PolicyEngine, Decision, Verdict   # noqa
from .verifier import Verifier, VerificationError   # noqa
from .audit import HashChainLog   # noqa
from .planner import Plan, Step, PlanError, LoopDetector   # noqa
from .executor import Executor, ToolResult, Outcome   # noqa
from .manifest import load_registry, ManifestError, hmac_signer, canonical   # noqa
