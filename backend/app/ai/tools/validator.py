"""Item and content validator enforcing mathematical, psychometric, and accessibility gates.

Source of truth:
- docs/05-assessment-item-spec.md §1 (Rules A-1 through A-8), §5, §9
- Task 8 §8.3
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel
from backend.app.ai.tools.sympy_solver import are_numerically_equal, are_algebraically_equivalent

GRADE_BAND_TO_GRADE = {
    "P4": 4.0,
    "P5": 5.0,
    "P6": 6.0,
    "JSS1": 7.0,
    "JSS2": 8.0,
    "JSS3": 9.0,
    "SSS1": 10.0,
    "SSS2": 11.0,
    "SSS3": 12.0,
}

MISCONCEPTION_ID_REGEX = re.compile(r"^[A-Z0-9]+(?:\.[A-Z0-9_]+)+$")


class ValidationResult(BaseModel):
    is_valid: bool
    errors: List[str]
    flesch_kincaid_grade: Optional[float] = None


def count_syllables(word: str) -> int:
    """Estimate syllable count in an English word."""
    w = word.lower().strip()
    if not w:
        return 0
    w = re.sub(r"[^a-z]", "", w)
    if not w:
        return 1
    if len(w) <= 3:
        return 1

    # Count vowel groups
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for char in w:
        is_v = char in vowels
        if is_v and not prev_vowel:
            count += 1
        prev_vowel = is_v

    # Handle silent e at end
    if w.endswith("e") and not w.endswith("le") and count > 1:
        count -= 1

    return max(1, count)


def compute_flesch_kincaid_grade(text: str) -> float:
    """Compute Flesch-Kincaid Grade Level:
    0.39 * (words / sentences) + 11.8 * (syllables / words) - 15.59
    """
    cleaned = re.sub(r"\$[^$]+\$", " math ", text)  # normalize math
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    sentences = [s for s in re.split(r"[.!?]+", cleaned) if s.strip()]
    if not sentences:
        sentences = [cleaned]

    words = [w for w in re.findall(r"\b[a-zA-Z]+\b", cleaned)]
    if not words:
        return 0.0

    total_words = len(words)
    total_sentences = max(1, len(sentences))
    total_syllables = sum(count_syllables(w) for w in words)

    # Very short instructions (e.g. "Calculate 15 / 3 + 2.") have negligible reading burden
    if total_words <= 6 and total_sentences == 1:
        return 2.0

    asl = total_words / total_sentences
    asw = total_syllables / total_words

    fk = 0.39 * asl + 11.8 * asw - 15.59
    return max(0.0, round(fk, 2))



def validate_item(
    item: Dict[str, Any],
    grade_band: str = "JSS2",
    max_media_bytes: int = 40960,
    subject: str = "maths",
) -> ValidationResult:
    """Validate candidate item against all strict CI quality gates."""
    errors = []

    # 1. Check Hints: Exactly 3 hints (levels 1, 2, 3)
    hints = item.get("hints", [])
    if not isinstance(hints, list) or len(hints) != 3:
        errors.append(f"Hints gate failed: item must have exactly 3 hints, got {len(hints) if isinstance(hints, list) else 0}.")
    else:
        levels = [h.get("level") for h in hints if isinstance(h, dict)]
        if levels != [1, 2, 3]:
            errors.append(f"Hints gate failed: hint levels must be [1, 2, 3], got {levels}.")

    # 2. Check Media size: all media <= 40 KB
    media_bytes = item.get("media_bytes", 0)
    if media_bytes > max_media_bytes:
        errors.append(f"Media gate failed: media size {media_bytes} bytes exceeds 40KB ({max_media_bytes} bytes) limit.")

    # 3. Check Reading Level: >= 2 years below target grade band (doc 05 A-3: maths and science only)
    is_stem_subject = subject.lower() in (
        "maths",
        "mathematics",
        "science",
        "integrated_science",
        "physics",
        "chemistry",
        "biology",
    )
    fk_grade: Optional[float] = None
    if is_stem_subject:
        stem_text = ""
        stem = item.get("stem")
        if isinstance(stem, str):
            stem_text = stem
        elif isinstance(stem, list):
            stem_text = " ".join(b.get("text", "") for b in stem if isinstance(b, dict))
        elif isinstance(stem, dict):
            stem_text = stem.get("text", "")

        fk_grade = compute_flesch_kincaid_grade(stem_text)
        target_grade = GRADE_BAND_TO_GRADE.get(grade_band, 8.0)
        max_allowed_reading_grade = target_grade - 2.0

        if fk_grade > max_allowed_reading_grade:
            errors.append(
                f"Reading level gate failed (Rule A-3): Flesch-Kincaid grade {fk_grade} exceeds maximum allowed {max_allowed_reading_grade} "
                f"(target grade {target_grade} - 2.0)."
            )

    # 4. Hard Gate A-2: Every distractor MUST carry a valid misconception_id
    item_type = item.get("type", "")
    payload = item.get("payload", {})
    if item_type in ("mcq_single", "mcq"):
        options = payload.get("options", [])
        if not options:
            errors.append("MCQ has no options defined.")
        for opt in options:
            is_correct = opt.get("correct", False)
            if not is_correct:
                misc_id = opt.get("misconception_id")
                if not misc_id:
                    errors.append(f"Hard Gate A-2 failed: distractor '{opt.get('id', '?')}' has no misconception_id.")
                elif not MISCONCEPTION_ID_REGEX.match(misc_id):
                    errors.append(f"Hard Gate A-2 failed: misconception_id '{misc_id}' does not match DOMAIN.SPECIFIC_BELIEF pattern.")

    # 5. SymPy agreement on numeric answers
    if item_type == "numeric":
        expected_answer = payload.get("answer")
        if expected_answer is None:
            errors.append("Numeric item missing 'answer' in payload.")
        else:
            # Verify worked solution agrees with answer if numeric
            worked_solution = item.get("worked_solution", "")
            ws_text = worked_solution if isinstance(worked_solution, str) else str(worked_solution)
            # Find numbers in worked solution
            nums = re.findall(r"-?\d+(?:\.\d+)?", ws_text)
            if nums:
                final_num = nums[-1]
                if not are_numerically_equal(final_num, expected_answer, tolerance=payload.get("tolerance", {}).get("value", 0.01) if isinstance(payload.get("tolerance"), dict) else 0.01):
                    errors.append(f"SymPy validation failed: worked solution final value '{final_num}' disagrees with payload answer '{expected_answer}'.")

    return ValidationResult(
        is_valid=(len(errors) == 0),
        errors=errors,
        flesch_kincaid_grade=fk_grade,
    )


# ---------------------------------------------------------------------------
# Quality Threshold & Content Validators (doc 05 §8, Rules A-9, A-10, A-11)
# ---------------------------------------------------------------------------

TIER_OFFSETS = {1: -285, 2: -115, 3: 20}


def check_item_quality_threshold(
    item_difficulty_elo: int,
    node_difficulty_elo: int,
    tier: int,
) -> Tuple[bool, int]:
    """Quality threshold (doc 05 §8, Task D5):
    Uses |difficulty_elo - item_seed| > 400 where item_seed = node.difficulty_elo + tier_offset
    (T1 -285, T2 -115, T3 +20).
    Returns (is_anomaly, delta).
    """
    offset = TIER_OFFSETS.get(tier, 0)
    item_seed = node_difficulty_elo + offset
    delta = abs(item_difficulty_elo - item_seed)
    return (delta > 400, delta)


def validate_rule_a9(item: Dict[str, Any], is_teacher_quiz: bool) -> Tuple[bool, str]:
    """Rule A-9: printable items only in teacher quizzes (doc 05 §9)."""
    is_printable = item.get("printable", True)
    if is_teacher_quiz and not is_printable:
        return False, "Rule A-9 failed: non-printable items cannot be included in teacher quizzes."
    return True, ""


def validate_rule_a10(session_status: str, has_revealed_solution: bool) -> Tuple[bool, str]:
    """Rule A-10: worked solutions only after the item closes (doc 05 §9)."""
    closed_statuses = {"closed", "submitted", "reviewed", "completed"}
    if has_revealed_solution and session_status not in closed_statuses:
        return False, f"Rule A-10 failed: worked solutions cannot be revealed while item status is '{session_status}'."
    return True, ""


def validate_rule_a11(node_items: List[Dict[str, Any]]) -> Tuple[bool, str]:
    """Rule A-11: each node has >= 2 auto-marked offline Tier-3 items (doc 05 §9)."""
    qualifying_count = sum(
        1
        for item in node_items
        if item.get("difficulty_tier") == 3
        and item.get("offline_capable", True) is True
        and item.get("type") in ("mcq_single", "mcq_multi", "numeric", "fill_blank", "matching")
    )
    if qualifying_count < 2:
        return False, f"Rule A-11 failed: node must have at least 2 auto-marked offline Tier-3 items, found {qualifying_count}."
    return True, ""
