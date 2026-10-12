"""Data models for ESE simulator and EvidenceState."""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Evidence:
    id: str
    content: str
    source: str
    timestamp: str = ""
    version: str = ""
    confidence: float = 0.5
    kind: str = "support"  # support | oppose


@dataclass
class Claim:
    text: str
    status: str = "UNVERIFIED"  # UNVERIFIED | VERIFIED | CONTRADICTORY | UNKNOWN
    supporting_evidence: List[Evidence] = field(default_factory=list)
    conflicting_evidence: List[Evidence] = field(default_factory=list)


@dataclass
class EvidenceState:
    """Explicit state machine over evidence quality (emergent layer)."""
    sufficiency: float = 0.0
    reliability: float = 0.0
    conflict: float = 0.0
    uncertainty: float = 1.0
    gaps: List[str] = field(default_factory=list)
    cost_spent: float = 0.0
    unique_sources: int = 0

    def update_from_claim(self, claim: Claim) -> None:
        sources = {e.source for e in claim.supporting_evidence + claim.conflicting_evidence}
        self.unique_sources = len(sources)
        n_sup = len(claim.supporting_evidence)
        n_conf = len(claim.conflicting_evidence)
        total = n_sup + n_conf
        if total == 0:
            self.sufficiency = 0.0
            self.conflict = 0.0
            self.uncertainty = 1.0
            self.gaps = ["no evidence retrieved"]
        else:
            self.sufficiency = min(1.0, n_sup / max(2, self.unique_sources))
            self.conflict = n_conf / total
            self.uncertainty = 1.0 - self.sufficiency * (1.0 - self.conflict)
            self.gaps = []
            if self.unique_sources < 2 and n_sup > 0:
                self.gaps.append("echo-chamber risk: fewer than 2 independent sources")
            if n_conf > 0:
                self.gaps.append("conflicting evidence present")
        # crude reliability from confidence averages
        all_ev = claim.supporting_evidence + claim.conflicting_evidence
        if all_ev:
            self.reliability = sum(e.confidence for e in all_ev) / len(all_ev)
