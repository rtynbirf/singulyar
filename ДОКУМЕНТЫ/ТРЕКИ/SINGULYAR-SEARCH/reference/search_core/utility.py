"""Utility of next search action: U(a) = E[ΔQ|a] / Cost(a)."""
from __future__ import annotations
from models import Claim, EvidenceState


def calculate_utility(claim: Claim, state: EvidenceState | None = None, cost: float = 1.0) -> float:
    if state is not None:
        uncertainty = state.uncertainty
    elif claim.status == "VERIFIED":
        uncertainty = 0.1
    elif claim.status == "CONTRADICTORY":
        uncertainty = 0.9
    elif claim.status == "UNKNOWN":
        uncertainty = 1.0
    else:
        n_sup = len(claim.supporting_evidence)
        n_conf = len(claim.conflicting_evidence)
        if n_sup + n_conf == 0:
            uncertainty = 1.0
        else:
            uncertainty = 1.0 - (n_sup / (n_sup + n_conf + 1e-6))
    return uncertainty / max(cost, 1e-6)
