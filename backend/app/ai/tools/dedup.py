"""Semantic deduplication tool checking candidate items and content chunks against existing items.

Source of truth:
- docs/plan.md §3.3
- Task 8 §8.3
"""

import math
import re
from typing import List, Tuple, Optional


def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text for cosine similarity comparison."""
    cleaned = re.sub(r"[^a-zA-Z0-9\s]", " ", text.lower())
    return [w for w in cleaned.split() if len(w) > 1]


def compute_vector(tokens: List[str]) -> dict:
    """Compute term frequency vector."""
    vec = {}
    for t in tokens:
        vec[t] = vec.get(t, 0) + 1
    return vec


def cosine_distance(vec1: dict, vec2: dict) -> float:
    """Compute cosine distance between two frequency vectors: 1.0 - cosine_similarity."""
    intersection = set(vec1.keys()) & set(vec2.keys())
    dot_product = sum(vec1[k] * vec2[k] for k in intersection)

    norm1 = math.sqrt(sum(val ** 2 for val in vec1.values()))
    norm2 = math.sqrt(sum(val ** 2 for val in vec2.values()))

    if norm1 == 0.0 or norm2 == 0.0:
        return 1.0

    similarity = dot_product / (norm1 * norm2)
    similarity = max(0.0, min(1.0, similarity))
    return round(1.0 - similarity, 4)


def check_duplicate(
    candidate_text: str,
    existing_texts: List[str],
    min_distance_threshold: float = 0.15,
) -> Tuple[bool, float, Optional[str]]:
    """Check if candidate text is a duplicate of any existing text.
    
    Rule:
    Reject if any cosine distance < 0.15 (meaning cosine similarity > 0.85).
    Returns (is_duplicate, min_distance, most_similar_text).
    """
    if not existing_texts:
        return False, 1.0, None

    cand_tokens = tokenize(candidate_text)
    if not cand_tokens:
        return False, 1.0, None

    cand_vec = compute_vector(cand_tokens)
    min_dist = 1.0
    closest_text = None

    for existing in existing_texts:
        ex_tokens = tokenize(existing)
        if not ex_tokens:
            continue
        ex_vec = compute_vector(ex_tokens)
        dist = cosine_distance(cand_vec, ex_vec)
        if dist < min_dist:
            min_dist = dist
            closest_text = existing

    is_dup = min_dist < min_distance_threshold
    return is_dup, min_dist, closest_text
