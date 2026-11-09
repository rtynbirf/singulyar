"""Evaluation metrics: Recall@k, nDCG@k."""
from __future__ import annotations
from typing import List, Set
import math


def recall_at_k(relevant_ids: Set[str], retrieved_ids: List[str], k: int) -> float:
    if not relevant_ids:
        return 0.0
    top = set(retrieved_ids[:k])
    return len(relevant_ids & top) / len(relevant_ids)


def ndcg_at_k(gains: List[float], k: int) -> float:
    gains = gains[:k]
    if not gains:
        return 0.0
    dcg = sum(g / math.log2(i + 2) for i, g in enumerate(gains))
    ideal = sorted(gains, reverse=True)
    idcg = sum(g / math.log2(i + 2) for i, g in enumerate(ideal))
    return dcg / idcg if idcg > 0 else 0.0
