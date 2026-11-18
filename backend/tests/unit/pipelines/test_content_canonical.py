"""Unit tests for Pipeline A2 Mode 1 (Canonical Lesson Content).

Source of truth:
- docs/plan.md §3.2
- docs/05-assessment-item-spec.md §1
- Task 8 §8.9
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from backend.app.db.base import Base
from backend.app.db.models.content import SkillNode, SkillNodeContent
from backend.app.ai.pipelines.content_pipeline import (
    generate_content_canonical,
    ContentValidationError,
)
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """In-memory SQLite session with full schema."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    # Seed skill node
    node = SkillNode(
        node_id="MATH.FRAC.ADD_UNLIKE",
        subject="Mathematics",
        topic="Fractions",
        title="Add Fractions with Unlike Denominators",
        learner_title="Adding Unlike Fractions",
        description="Find LCD then add numerators.",
        grade_band_hint="JSS2",
        est_minutes=12,
        status="live",
    )
    session.add(node)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_worked_examples_under_3_rejected(db_session: Session):
    """Reject canonical content with fewer than 3 worked examples."""
    mock_payload = {
        "summary": "Simple short summary.",
        "learning_objectives": ["Add unlike fractions."],
        "sections": [
            {"section_index": 0, "title": "Concept", "blocks": [{"type": "text", "text": "Find common denominator."}]}
        ],
        "worked_examples": [
            {"title": "Example 1", "problem": "1/2 + 1/4", "steps": ["Convert 1/2 to 2/4", "Add 2/4 + 1/4 = 3/4"], "solution": "3/4"},
            {"title": "Example 2", "problem": "1/3 + 1/6", "steps": ["Convert 1/3 to 2/6", "Add 2/6 + 1/6 = 3/6 = 1/2"], "solution": "1/2"},
        ],  # Only 2!
        "key_formulas": [],
        "analogies": [],
        "common_mistakes": [],
        "estimated_minutes": 12,
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 500, 300))
    try:
        with pytest.raises(ContentValidationError) as exc:
            generate_content_canonical(node_id="MATH.FRAC.ADD_UNLIKE", actor_id="lead-001", db=db_session)
        assert "at least 3 worked examples" in str(exc.value)
    finally:
        gemini.clear_mock_responder()


def test_high_reading_level_rejected(db_session: Session):
    """Reject canonical content whose reading level exceeds grade band - 2."""
    complex_academic_summary = (
        "The epistemological pedagogical paradigm necessitated an intricate phenomenological comprehension "
        "of the heterogeneous denominators characterized by their idiosyncratic irreducible prime factorizations, "
        "thereby necessitating sophisticated algebraic recalibrations."
    )
    mock_payload = {
        "summary": complex_academic_summary,
        "learning_objectives": ["Add unlike fractions."],
        "sections": [],
        "worked_examples": [
            {"title": "E1", "problem": "P1", "steps": [], "solution": "S1"},
            {"title": "E2", "problem": "P2", "steps": [], "solution": "S2"},
            {"title": "E3", "problem": "P3", "steps": [], "solution": "S3"},
        ],
        "key_formulas": [],
        "analogies": [],
        "common_mistakes": [],
        "estimated_minutes": 12,
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 500, 300))
    try:
        with pytest.raises(ContentValidationError) as exc:
            generate_content_canonical(node_id="MATH.FRAC.ADD_UNLIKE", actor_id="lead-001", db=db_session)
        assert "Reading level gate failed" in str(exc.value)
    finally:
        gemini.clear_mock_responder()


def test_valid_canonical_content_persists_as_draft(db_session: Session):
    """Valid canonical content passes validation and persists with status='draft', version=1."""
    mock_payload = {
        "summary": "Find a common bottom number. Add the top numbers. Keep the bottom number.",
        "learning_objectives": ["Find common denominator", "Add unlike fractions"],
        "sections": [
            {
                "section_index": 0,
                "title": "Finding a Common Denominator",
                "blocks": [{"type": "text", "text": "Fractions must share a common bottom number before adding."}],
            },
            {
                "section_index": 1,
                "title": "Adding Numerators",
                "blocks": [{"type": "text", "text": "Keep the common denominator and add the numerators."}],
            },
        ],
        "worked_examples": [
            {"title": "Example 1", "problem": "1/4 + 1/2", "steps": ["1/2 = 2/4", "1/4 + 2/4 = 3/4"], "solution": "3/4"},
            {"title": "Example 2", "problem": "1/3 + 1/6", "steps": ["1/3 = 2/6", "2/6 + 1/6 = 3/6"], "solution": "1/2"},
            {"title": "Example 3", "problem": "2/5 + 3/10", "steps": ["2/5 = 4/10", "4/10 + 3/10 = 7/10"], "solution": "7/10"},
        ],
        "key_formulas": [{"name": "Addition", "latex": "\\frac{a}{b} + \\frac{c}{d} = \\frac{ad + bc}{bd}", "explanation": "Cross multiplication formula"}],
        "analogies": [{"concept": "Denominator", "analogy": "Slice sizes"}],
        "common_mistakes": [{"misconception_id": "FRAC.ADD_NUM_AND_DENOM", "mistake": "Adding bottom numbers", "correction": "Only add tops"}],
        "estimated_minutes": 12,
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 600, 450))
    try:
        content = generate_content_canonical(
            node_id="MATH.FRAC.ADD_UNLIKE",
            actor_id="lead-001",
            db=db_session,
        )

        assert content.node_id == "MATH.FRAC.ADD_UNLIKE"
        assert content.version == 1
        assert content.status == "draft"
        assert len(content.worked_examples) == 3
        assert content.generated_by == "gemini-2.5-pro"

        # Check DB row
        db_content = db_session.query(SkillNodeContent).filter(SkillNodeContent.id == content.id).first()
        assert db_content is not None
        assert db_content.status == "draft"
    finally:
        gemini.clear_mock_responder()
