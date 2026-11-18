"""Unit tests for Pipeline B (Item Generation & Localization).

Source of truth:
- docs/plan.md §3.3
- docs/05-assessment-item-spec.md §1, §3, §5, §7, §8, §9
- Task 8 §8.9
"""

from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from backend.app.db.base import Base
from backend.app.db.models.content import SkillNode, SkillNodeContent, Item, Misconception, MisconceptionNode
from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    SyllabusObjective,
    ObjectiveNodeMap,
    LocalizationToken,
    ItemLocalization,
)
from backend.app.ai.pipelines.item_pipeline import generate_items
from backend.app.ai.tools.validator import validate_item
from backend.app.ai.tools.dedup import check_duplicate
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """In-memory SQLite session with full framework, node, and content fixtures."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    # Seed Country & Framework
    country = Country(country_code="GH", name="Ghana", default_locale="en-GH", default_currency="GHS")
    session.add(country)
    fw = CurriculumFramework(
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="Mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        status="active",
        grading_scale=[],
        exam_structure={},
    )
    session.add(fw)

    # Seed Objective and Map
    obj = SyllabusObjective(
        objective_id="gh_bece_math_2024:JSS2.NUM.1.1",
        framework_id="gh_bece_math_2024",
        code="JSS2.NUM.1.1",
        text="Add fractions with unlike denominators.",
        grade_band="JSS2",
        coverage_status="full",
    )
    session.add(obj)

    node = SkillNode(
        node_id="MATH.FRAC.ADD_UNLIKE",
        subject="Mathematics",
        topic="Fractions",
        title="Add Fractions with Unlike Denominators",
        learner_title="Adding Unlike Fractions",
        description="Find LCD then add.",
        grade_band_hint="JSS2",
        est_minutes=12,
        status="live",
    )
    session.add(node)

    mapping = ObjectiveNodeMap(objective_id="gh_bece_math_2024:JSS2.NUM.1.1", node_id="MATH.FRAC.ADD_UNLIKE")
    session.add(mapping)

    token = LocalizationToken(framework_id="gh_bece_math_2024", token_key="currency", token_value="₵")
    session.add(token)

    # Seed Misconceptions
    misc1 = Misconception(
        misconception_id="FRAC.ADD_NUM_DEN",
        domain="Fractions",
        description="Adds both numerators and denominators.",
        learner_facing_name="Adding top and bottom",
    )
    misc2 = Misconception(
        misconception_id="FRAC.LCD_MULTIPLY",
        domain="Fractions",
        description="Multiplies denominators.",
        learner_facing_name="Multiplying denominators",
    )
    session.add_all([misc1, misc2])
    session.add(MisconceptionNode(misconception_id="FRAC.ADD_NUM_DEN", node_id="MATH.FRAC.ADD_UNLIKE"))
    session.add(MisconceptionNode(misconception_id="FRAC.LCD_MULTIPLY", node_id="MATH.FRAC.ADD_UNLIKE"))

    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_validator_rejects_distractor_without_misconception_id():
    """Hard Gate A-2: Every distractor in an MCQ must carry a valid misconception_id."""
    invalid_item = {
        "type": "mcq_single",
        "difficulty_tier": 1,
        "stem": "What is 1/4 + 1/2?",
        "payload": {
            "options": [
                {"id": "A", "text": "3/4", "correct": True},
                {"id": "B", "text": "2/6", "correct": False, "misconception_id": "FRAC.ADD_NUM_DEN"},
                {"id": "C", "text": "2/4", "correct": False},  # MISSING misconception_id!
                {"id": "D", "text": "1/6", "correct": False, "misconception_id": "FRAC.LCD_MULTIPLY"},
            ]
        },
        "hints": [{"level": 1, "content": "H1"}, {"level": 2, "content": "H2"}, {"level": 3, "content": "H3"}],
        "media_bytes": 0,
    }
    result = validate_item(invalid_item)
    assert not result.is_valid
    assert any("Hard Gate A-2 failed" in err for err in result.errors)


def test_validator_rejects_fewer_or_more_than_three_hints():
    """Hint Gate (doc 05 §5): Exactly 3 hints are required (levels 1, 2, 3)."""
    item_two_hints = {
        "type": "mcq_single",
        "stem": "What is 1/2 + 1/4?",
        "payload": {"options": [{"id": "A", "correct": True}]},
        "hints": [{"level": 1, "content": "H1"}, {"level": 2, "content": "H2"}],  # Only 2!
    }
    result = validate_item(item_two_hints)
    assert not result.is_valid
    assert any("item must have exactly 3 hints" in err for err in result.errors)


def test_validator_verifies_numeric_item_sympy_agreement():
    """SymPy Gate: Numerical answer in payload must agree with worked solution."""
    # Disagreeing answer
    bad_numeric_item = {
        "type": "numeric",
        "stem": "Calculate 15 / 3 + 2.",
        "payload": {"answer": 7.0, "tolerance": {"value": 0.01}},
        "worked_solution": "15 / 3 = 5, 5 + 2 = 9.0",  # Error: 9 != 7!
        "hints": [{"level": 1, "content": "H1"}, {"level": 2, "content": "H2"}, {"level": 3, "content": "H3"}],
    }
    res = validate_item(bad_numeric_item)
    assert not res.is_valid
    assert any("SymPy validation failed" in err for err in res.errors)

    # Agreeing answer
    good_numeric_item = {
        "type": "numeric",
        "stem": "Calculate 15 / 3 + 2.",
        "payload": {"answer": 7.0, "tolerance": {"value": 0.01}},
        "worked_solution": "15 / 3 = 5, 5 + 2 = 7.0",
        "hints": [{"level": 1, "content": "H1"}, {"level": 2, "content": "H2"}, {"level": 3, "content": "H3"}],
    }
    res_good = validate_item(good_numeric_item)
    assert res_good.is_valid


def test_dedup_drops_item_with_cosine_distance_under_threshold():
    """Deduplication Gate: Rejects candidate item if cosine distance < 0.15."""
    existing_items = [
        "What is the sum of one half and one quarter when adding fractions with unlike denominators?",
    ]
    candidate_almost_identical = (
        "What is the sum of one quarter and one half when adding fractions with unlike denominators?"
    )
    is_dup, dist, _ = check_duplicate(candidate_almost_identical, existing_items, min_distance_threshold=0.15)
    assert is_dup is True
    assert dist < 0.15


def test_generate_items_pipeline_success(db_session: Session):
    """Pipeline B: Valid items pass validation, self-eval, dedup, and persist with status='tagged'."""
    mock_items_payload = {
        "items": [
            {
                "type": "mcq_single",
                "difficulty_tier": 1,
                "stem": "Find the sum of 1/4 and 1/2.",
                "payload": {
                    "options": [
                        {"id": "A", "content": "3/4", "correct": True},
                        {"id": "B", "content": "2/6", "correct": False, "misconception_id": "FRAC.ADD_NUM_DEN"},
                        {"id": "C", "content": "2/8", "correct": False, "misconception_id": "FRAC.LCD_MULTIPLY"},
                        {"id": "D", "content": "1/6", "correct": False, "misconception_id": "FRAC.LCD_MULTIPLY"},
                    ]
                },
                "scoring": {"mode": "exact", "max_marks": 1},
                "hints": [
                    {"level": 1, "content": "Look at the bottom numbers."},
                    {"level": 2, "content": "Find a common denominator."},
                    {"level": 3, "content": "Change 1/2 to 2/4. Now add."},
                ],
                "worked_solution": "1/4 + 2/4 = 3/4",
                "offline_capable": True,
                "media_bytes": 0,
                "a11y": {"alt_text": "Fractions problem"},
            }
        ]
    }

    mock_self_eval = {
        "overall_score": 0.92,
        "pedagogical_clarity": 0.95,
        "mathematical_correctness": 1.0,
        "diagnostic_depth": 0.90,
        "critique": "Exemplary diagnostic item.",
        "pass": True,
    }

    mock_loc_payload = {
        "stem_override": "Kofi has 1/4 of an orange and Ama has 1/2 of an orange. What fraction do they have together?",
        "payload_override": None,
        "solution_override": "Total fraction is 3/4 of an orange.",
        "rationale": "Ghanaian context names",
    }

    def fake_responder(model, prompt_name, prompt_version, system_instruction, user_prompt, variables):
        if prompt_name == "item_generation":
            return mock_items_payload, 600, 500
        elif prompt_name == "self_evaluation":
            return mock_self_eval, 400, 200
        elif prompt_name == "item_localization":
            return mock_loc_payload, 500, 300
        return {}, 100, 100

    gemini.set_mock_responder(fake_responder)
    try:
        items = generate_items(
            node_id="MATH.FRAC.ADD_UNLIKE",
            count=1,
            actor_id="lead-001",
            db=db_session,
        )

        assert len(items) == 1
        item = items[0]
        assert item.status == "tagged"  # Distractors carry verified misconception IDs
        assert item.difficulty_tier == 1

        # Check DB row
        db_item = db_session.query(Item).filter(Item.item_id == item.item_id).first()
        assert db_item is not None
        assert db_item.status == "tagged"

        # Check item_localizations staged row with review_status='pending'
        item_loc = db_session.query(ItemLocalization).filter(ItemLocalization.item_id == item.item_id).first()
        assert item_loc is not None
        assert item_loc.review_status == "pending"
        assert "Kofi" in str(item_loc.stem_override)
    finally:
        gemini.clear_mock_responder()
