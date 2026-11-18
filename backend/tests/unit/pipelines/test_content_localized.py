"""Unit tests for Pipeline A2 Mode 2 (Localized Content Overrides).

Source of truth:
- docs/plan.md §3.2 (Mode 2)
- Task 8 §8.4, §8.9
"""

from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from backend.app.db.base import Base
from backend.app.db.models.content import SkillNode, SkillNodeContent
from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    LocalizationBrief,
    LocalizationToken,
    ContentLocalization,
)
from backend.app.ai.pipelines.content_pipeline import (
    generate_content_localized,
    ContentValidationError,
)
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """In-memory SQLite session with framework and content fixtures."""
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

    # Seed Localization Brief & Tokens
    brief = LocalizationBrief(
        framework_id="gh_bece_math_2024",
        currency="GHS",
        common_names=["Kofi", "Ama", "Kwame"],
        cities=["Accra", "Kumasi", "Tamale"],
        foods=["kenkey", "jollof", "plantain"],
        units_preferred={"length": "cm", "mass": "kg"},
        avoid=["snow", "subway", "Thanksgiving"],
        scenario_bank=[{"title": "Makola Market", "context": "Buying tomatoes and fish"}],
    )
    session.add(brief)

    token = LocalizationToken(framework_id="gh_bece_math_2024", token_key="currency", token_value="₵")
    session.add(token)

    # Seed SkillNode & Content
    node = SkillNode(
        node_id="MATH.MONEY.PROFIT_LOSS",
        subject="Mathematics",
        topic="Financial Math",
        title="Calculate Profit and Loss",
        learner_title="Profit and Loss",
        description="Calculate percentage profit or loss from cost price and selling price.",
        grade_band_hint="JSS2",
        est_minutes=12,
        status="live",
    )
    session.add(node)

    content = SkillNodeContent(
        id="content-money-001",
        node_id="MATH.MONEY.PROFIT_LOSS",
        version=1,
        summary="Profit is selling price minus cost price.",
        sections=[
            {
                "section_index": 0,
                "title": "Abstract Formula",
                "blocks": [{"type": "text", "text": "Profit = Selling Price - Cost Price. Formula: $P = SP - CP$."}],
            },
            {
                "section_index": 1,
                "title": "Market Example",
                "blocks": [{"type": "text", "text": "A merchant in Chicago buys goods for $50 and sells for $75. The profit is $25."}],
            },
        ],
        worked_examples=[],
        estimated_minutes=12,
        status="published",
    )
    session.add(content)
    session.commit()

    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_section_without_context_is_not_overridden_and_local_context_is_sparse(db_session: Session):
    """Pipeline A2 Mode 2: Only section 1 (context) is overridden; section 0 (abstract formula) is untouched."""
    mock_payload = {
        "section_overrides": {
            "1": {
                "section_index": 1,
                "title": "Market Example",
                "blocks": [{"type": "text", "text": "A trader in Makola Market in Accra buys goods for ₵50 and sells for ₵75. The profit is ₵25."}],
            }
        },
        "rationale": "Localized currency to GHS and venue to Makola Market, Accra per brief.",
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 500, 300))
    try:
        loc = generate_content_localized(
            content_id="content-money-001",
            framework_id="gh_bece_math_2024",
            actor_id="lead-001",
            db=db_session,
        )

        assert loc.content_id == "content-money-001"
        assert loc.framework_id == "gh_bece_math_2024"
        assert loc.review_status == "pending"  # Staged for human review
        assert "0" not in loc.section_overrides  # Abstract section NOT overridden!
        assert "1" in loc.section_overrides
        assert "Makola Market in Accra" in str(loc.section_overrides["1"])

        # Check DB row
        db_loc = (
            db_session.query(ContentLocalization)
            .filter(ContentLocalization.content_id == "content-money-001")
            .first()
        )
        assert db_loc is not None
        assert db_loc.review_status == "pending"
    finally:
        gemini.clear_mock_responder()


def test_localization_altering_math_is_rejected(db_session: Session):
    """Pipeline A2 Mode 2: Reject localization that changes numerical values or math."""
    # Attempting to change $50 / $75 to ₵60 / ₵90 (violates math invariance!)
    mock_payload = {
        "section_overrides": {
            "1": {
                "section_index": 1,
                "title": "Market Example",
                "blocks": [{"type": "text", "text": "A trader buys goods for ₵60 and sells for ₵90."}],
            }
        },
        "rationale": "Altered numbers.",
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 500, 300))
    try:
        with pytest.raises(ContentValidationError) as exc:
            generate_content_localized(
                content_id="content-money-001",
                framework_id="gh_bece_math_2024",
                actor_id="lead-001",
                db=db_session,
            )
        assert "Math invariance gate failed" in str(exc.value)
    finally:
        gemini.clear_mock_responder()
