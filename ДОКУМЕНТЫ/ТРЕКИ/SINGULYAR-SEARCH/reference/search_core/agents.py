"""Multi-agent roles for ESE simulator."""
from __future__ import annotations
from typing import List
from models import Evidence, Claim, EvidenceState
from utility import calculate_utility


class SearchAgent:
    def __init__(self, corpus: List[Evidence]):
        self.corpus = corpus

    def run(self, query: str, top_k: int = 5) -> List[Evidence]:
        q_words = set(query.lower().split())
        scored = []
        for ev in self.corpus:
            text_words = set(ev.content.lower().split())
            overlap = len(q_words & text_words)
            if overlap > 0:
                score = overlap * ev.confidence
                scored.append((score, ev))
        scored.sort(key=lambda x: -x[0])
        return [ev for _, ev in scored[:top_k]]


class VerificationAgent:
    def __init__(self, min_unique_sources: int = 2):
        self.min_unique_sources = min_unique_sources

    def run(self, claim: Claim) -> Claim:
        if not claim.supporting_evidence and not claim.conflicting_evidence:
            claim.status = "UNVERIFIED"
            return claim
        if claim.conflicting_evidence:
            claim.status = "CONTRADICTORY"
            return claim
        sources = {e.source for e in claim.supporting_evidence}
        if len(sources) >= self.min_unique_sources:
            claim.status = "VERIFIED"
        else:
            claim.status = "UNVERIFIED"
        return claim


class CoordinatorAgent:
    def __init__(self, searcher: SearchAgent, verifier: VerificationAgent):
        self.searcher = searcher
        self.verifier = verifier

    def research(self, user_query: str, max_steps: int = 3) -> tuple[Claim, EvidenceState]:
        claim = Claim(text=user_query)
        state = EvidenceState()
        for step in range(max_steps):
            results = self.searcher.run(user_query)
            for ev in results:
                lower = ev.content.lower()
                is_conflict = any(
                    w in lower
                    for w in ("not ", "no ", "incompatible", "fails", "error", "опроверг", "несовмест")
                ) or getattr(ev, "kind", "support") == "oppose"
                if is_conflict:
                    if ev not in claim.conflicting_evidence:
                        claim.conflicting_evidence.append(ev)
                else:
                    if ev not in claim.supporting_evidence:
                        claim.supporting_evidence.append(ev)
            claim = self.verifier.run(claim)
            state.update_from_claim(claim)
            state.cost_spent += 1.0
            u = calculate_utility(claim, state)
            if claim.status in ("VERIFIED", "CONTRADICTORY") or u < 0.3:
                break
        if claim.status == "UNVERIFIED" and (
            not claim.supporting_evidence or state.unique_sources < self.verifier.min_unique_sources
        ):
            claim.status = "UNKNOWN"
        return claim, state

    def synthesize(self, claim: Claim, state: EvidenceState) -> str:
        lines = [
            f"CLAIM: {claim.text}",
            f"STATUS: {claim.status}",
            f"EVIDENCE_STATE: sufficiency={state.sufficiency:.2f} conflict={state.conflict:.2f} "
            f"uncertainty={state.uncertainty:.2f} unique_sources={state.unique_sources}",
            f"SUPPORTING ({len(claim.supporting_evidence)}):",
        ]
        for e in claim.supporting_evidence:
            lines.append(f"  - [{e.source}] {e.content[:80]}… (conf={e.confidence})")
        lines.append(f"CONFLICTING ({len(claim.conflicting_evidence)}):")
        for e in claim.conflicting_evidence:
            lines.append(f"  - [{e.source}] {e.content[:80]}… (conf={e.confidence})")
        if state.gaps:
            lines.append("GAPS: " + "; ".join(state.gaps))
        if claim.status == "CONTRADICTORY":
            lines.append("ALERT: contradicting evidence present.")
        if claim.status in ("UNVERIFIED", "UNKNOWN"):
            lines.append("VERDICT: UNKNOWN — insufficient independent evidence.")
        else:
            lines.append(f"VERDICT: {claim.status}")
        lines.append("LIMITATIONS: local corpus · programmatic roles · no web crawl · keyword conflict heuristic")
        return "\n".join(lines)
