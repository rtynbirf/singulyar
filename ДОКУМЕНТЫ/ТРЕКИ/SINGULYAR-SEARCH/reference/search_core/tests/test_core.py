import sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from models import Evidence, Claim, EvidenceState
from agents import SearchAgent, VerificationAgent, CoordinatorAgent
from metrics import recall_at_k, ndcg_at_k
from utility import calculate_utility
from corpus import DEMO_CORPUS


def test_search_agent_returns_relevant():
    agent = SearchAgent(DEMO_CORPUS)
    results = agent.run("Tech A Tech B compatible")
    assert len(results) >= 1


def test_verification_contradictory():
    claim = Claim(text="compatible?")
    claim.supporting_evidence = [DEMO_CORPUS[0]]
    claim.conflicting_evidence = [DEMO_CORPUS[2]]
    claim = VerificationAgent().run(claim)
    assert claim.status == "CONTRADICTORY"


def test_verification_verified():
    claim = Claim(text="compatible?")
    claim.supporting_evidence = [DEMO_CORPUS[0], DEMO_CORPUS[1]]
    claim = VerificationAgent().run(claim)
    assert claim.status == "VERIFIED"


def test_unknown_when_no_evidence():
    claim = Claim(text="something unknown")
    claim = VerificationAgent().run(claim)
    assert claim.status == "UNVERIFIED"


def test_coordinator_research():
    coord = CoordinatorAgent(SearchAgent(DEMO_CORPUS), VerificationAgent())
    claim, state = coord.research("Are Tech A and Tech B compatible?")
    assert claim.status in ("VERIFIED", "CONTRADICTORY", "UNVERIFIED", "UNKNOWN")
    text = coord.synthesize(claim, state)
    assert "CLAIM:" in text and "VERDICT:" in text
    assert "EVIDENCE_STATE:" in text


def test_utility_higher_for_uncertain():
    empty = Claim(text="x")
    verified = Claim(text="y", status="VERIFIED")
    assert calculate_utility(empty) > calculate_utility(verified)


def test_recall_at_k():
    assert recall_at_k({"a", "b"}, ["a", "c", "b"], 3) == 1.0
    assert recall_at_k({"a", "b"}, ["a", "c", "b"], 1) == 0.5


def test_ndcg_at_k():
    assert 0.0 < ndcg_at_k([3.0, 2.0, 0.0], 3) <= 1.0


def test_evidence_state_echo_chamber():
    claim = Claim(text="x")
    claim.supporting_evidence = [DEMO_CORPUS[0]]  # one source
    state = EvidenceState()
    state.update_from_claim(claim)
    assert state.unique_sources == 1
    assert any("echo-chamber" in g for g in state.gaps)
