"""Unit tests for Pipeline D (Localization Refresh).

Source of truth:
- docs/plan.md §3.4 (Pipeline D)
- Task 8 §8.4, §8.9
"""

from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from backend.app.db.base import Base
from backend.app.db.models.content import SkillNode, SkillNodeContent, Item
from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    LocalizationBrief,
    ItemLocalization,
    ContentLocalization,
)
from backend.app.ai.pipelines.localization_pipeline import (
    refresh_localization,
    LocalizationRefreshError,
)
from backend.app.services.content_resolver import resolve_item, resolve_content
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """In-memory SQLite session with framework, brief, and existing localization overrides."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    # Seed Country, Framework, Brief
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

    brief = LocalizationBrief(
        framework_id="gh_bece_math_2024",
        currency="GHS",
        common_names=["Kofi", "Ama"],
        cities=["Accra", "Kumasi"],
        foods=["kenkey", "plantain"],
        units_preferred={"length": "cm"},
        avoid=["snow"],
        scenario_bank=[],
    )
    session.add(brief)

    # Seed Node, Content, Item
    node = SkillNode(
        node_id="MATH.MONEY.1",
        subject="Mathematics",
        topic="Money",
        title="Money addition",
        learner_title="Money addition",
        description="Adding prices.",
        est_minutes=10,
    )
    session.add(node)

    item = Item(
        item_id="item-loc-001",
        node_id="MATH.MONEY.1",
        type="mcq_single",
        difficulty_tier=1,
        stem="Alice buys an apple for $2 and milk for $3. What is the total?",
        payload={"currency": "USD", "answer": 5},
        scoring={},
        hints=[],
        worked_solution="Total = $5",
        a11y={},
    )
    session.add(item)

    item_loc = ItemLocalization(
        item_id="item-loc-001",
        framework_id="gh_bece_math_2024",
        stem_override="Kofi buys an apple for ₵2 and milk for ₵3. What is the total?",
        payload_override={"currency": "GHS", "answer": 5},
        solution_override="Total = ₵5",
        rationale="Historical override",
        review_status="approved",
    )
    session.add(item_loc)

    content = SkillNodeContent(
        id="content-loc-001",
        node_id="MATH.MONEY.1",
        version=1,
        summary="Money math summary",
        sections=[{"title": "Intro", "body": "Spending $2 on fruit."}],
        worked_examples=[],
        estimated_minutes=10,
    )
    session.add(content)

    content_loc = ContentLocalization(
        content_id="content-loc-001",
        framework_id="gh_bece_math_2024",
        section_overrides={"0": {"title": "Intro", "body": "Spending ₵2 on plantain."}},
        rationale="Historical content override",
        review_status="approved",
    )
    session.add(content_loc)

    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_refresh_localization_regenerates_and_stages_pending(db_session: Session):
    """Pipeline D: Regenerates overrides against updated brief and stages as review_status='pending'."""
    # Mock refreshed overrides
    mock_refreshed_item = {
        "refreshed_override": {
            "stem_override": "Ama buys an apple for ₵2 and milk for ₵3 in Accra. What is the total?",
            "payload_override": {"currency": "GHS", "answer": 5},
            "solution_override": "Total = ₵5",
        },
        "rationale": "Updated with Ama and Accra per revised brief.",
    }

    mock_refreshed_content = {
        "refreshed_override": {
            "section_overrides": {"0": {"title": "Intro", "body": "Spending ₵2 on fresh kenkey in Accra."}},
        },
        "rationale": "Updated with kenkey per revised brief.",
    }

    def fake_responder(model, prompt_name, prompt_version, system_instruction, user_prompt, variables):
        target_type = variables.get("target_type")
        if target_type == "item":
            return mock_refreshed_item, 500, 300
        elif target_type == "content":
            return mock_refreshed_content, 500, 300
        return {}, 100, 100

    gemini.set_mock_responder(fake_responder)
    try:
        res = refresh_localization(
            framework_id="gh_bece_math_2024",
            actor_id="lead-001",
            db=db_session,
        )

        assert res["refreshed_items"] == 1
        assert res["refreshed_contents"] == 1
        assert res["review_status"] == "pending"

        # Overrides must now have review_status = 'pending' in the DB
        item_loc = db_session.query(ItemLocalization).filter(ItemLocalization.item_id == "item-loc-001").first()
        assert item_loc.review_status == "pending"
        assert "Ama" in str(item_loc.stem_override)

        content_loc = db_session.query(ContentLocalization).filter(ContentLocalization.content_id == "content-loc-001").first()
        assert content_loc.review_status == "pending"
        assert "kenkey in Accra" in str(content_loc.section_overrides)

        # Invariant check: ContentResolver MUST NOT serve pending refreshed overrides to learners!
        base_item = {
            "item_id": "item-loc-001",
            "stem": "Alice buys an apple for $2 and milk for $3.",
            "payload": {"currency": "USD"},
        }
        resolved = resolve_item(
            db=db_session,
            item_id="item-loc-001",
            framework_id="gh_bece_math_2024",
            learner_pin="gh_bece_math_2024",
            base_item=base_item,
        )
        assert resolved["is_localized"] is False  # Pending is invisible!
    finally:
        gemini.clear_mock_responder()


def test_refresh_localization_enforces_math_invariance(db_session: Session):
    """Pipeline D: Reject refreshed override that attempts to change mathematical values."""
    mock_bad_math = {
        "refreshed_override": {
            "stem_override": "Ama buys an apple for ₵10 and milk for ₵20.",  # Changed numbers!
            "payload_override": {"currency": "GHS"},
        },
        "rationale": "Changed prices.",
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_bad_math, 500, 300))
    try:
        with pytest.raises(LocalizationRefreshError) as exc:
            refresh_localization(
                framework_id="gh_bece_math_2024",
                actor_id="lead-001",
                db=db_session,
            )
        assert "failed math invariance" in str(exc.value)
    finally:
        gemini.clear_mock_responder()
