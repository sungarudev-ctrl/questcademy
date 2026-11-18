"""Unit tests for framework-aware Content Resolver.

Source of truth:
- docs/plan.md §2.10
- docs/02-curriculum-framework-spec.md §1, §5
"""

import copy
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.base import Base
from backend.app.db.models.framework import ContentLocalization, ItemLocalization
from backend.app.services.content_resolver import (
    FrameworkPinMismatchError,
    resolve_content,
    resolve_item,
)


@pytest.fixture
def db_session():
    """In-memory SQLite session with localization tables."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_resolve_item_with_no_localization_returns_base_item_unchanged(db_session: Session):
    base_item = {
        "item_id": "item-math-001",
        "node_id": "MATH.FRAC.ADD_UNLIKE",
        "type": "mcq_single",
        "difficulty_tier": 2,
        "difficulty_elo": 1200,
        "stem": [{"type": "paragraph", "text": "What is 1/4 + 1/3?"}],
        "payload": {
            "options": [
                {"id": "A", "text": "2/7"},
                {"id": "B", "text": "7/12"},
            ]
        },
        "scoring": {"correct_option": "B"},
        "hints": ["Find the LCD", "LCD is 12", "3/12 + 4/12 = 7/12"],
        "worked_solution": [{"type": "paragraph", "text": "Step 1: LCD is 12"}],
    }

    base_copy = copy.deepcopy(base_item)

    resolved = resolve_item(
        db=db_session,
        item_id="item-math-001",
        framework_id="gh_bece_math_2024",
        learner_pin="gh_bece_math_2024",
        base_item=base_item,
    )

    # Base item returned with localized=False
    assert resolved["is_localized"] is False
    assert resolved["stem"] == base_item["stem"]
    assert resolved["payload"] == base_item["payload"]

    # Base item object was NOT mutated
    assert base_item == base_copy


def test_resolve_item_with_localization_applies_overrides_and_preserves_base(db_session: Session):
    base_item = {
        "item_id": "item-word-001",
        "node_id": "MATH.MONEY.ADD",
        "type": "mcq_single",
        "difficulty_tier": 1,
        "difficulty_elo": 1100,
        "stem": [{"type": "paragraph", "text": "John bought bread for $5 and milk for $3."}],
        "payload": {
            "currency": "USD",
            "options": [{"id": "A", "text": "$8"}, {"id": "B", "text": "$7"}],
        },
        "worked_solution": [{"type": "paragraph", "text": "Total is $8"}],
    }

    base_copy = copy.deepcopy(base_item)

    # Add localized override for Ghana (GHS / Kofi) with review_status='approved'
    loc = ItemLocalization(
        item_id="item-word-001",
        framework_id="gh_bece_math_2024",
        stem_override=[{"type": "paragraph", "text": "Kofi bought bread for ₵5 and milk for ₵3."}],
        payload_override={
            "currency": "GHS",
            "options": [{"id": "A", "text": "₵8"}, {"id": "B", "text": "₵7"}],
        },
        solution_override=[{"type": "paragraph", "text": "Total is ₵8"}],
        rationale="Ghanaian currency and names per localization brief",
        review_status="approved",
    )
    db_session.add(loc)
    db_session.commit()

    resolved = resolve_item(
        db=db_session,
        item_id="item-word-001",
        framework_id="gh_bece_math_2024",
        learner_pin="gh_bece_math_2024",
        base_item=base_item,
    )

    # Overrides are applied in the view
    assert resolved["is_localized"] is True
    assert "Kofi" in resolved["stem"][0]["text"]
    assert resolved["payload"]["currency"] == "GHS"
    assert "₵8" in resolved["worked_solution"][0]["text"]

    # Base item object is untouched
    assert base_item == base_copy
    assert "John" in base_item["stem"][0]["text"]
    assert base_item["payload"]["currency"] == "USD"


def test_resolve_item_ignores_pending_and_rejected_overrides(db_session: Session):
    base_item = {
        "item_id": "item-word-002",
        "node_id": "MATH.MONEY.ADD",
        "type": "mcq_single",
        "stem": [{"type": "paragraph", "text": "Base stem text"}],
        "payload": {"currency": "USD"},
    }

    # 1. Pending override
    loc_pending = ItemLocalization(
        item_id="item-word-002",
        framework_id="gh_bece_math_2024",
        stem_override=[{"type": "paragraph", "text": "Pending stem override"}],
        review_status="pending",
    )
    db_session.add(loc_pending)
    db_session.commit()

    res_pending = resolve_item(
        db=db_session,
        item_id="item-word-002",
        framework_id="gh_bece_math_2024",
        learner_pin="gh_bece_math_2024",
        base_item=base_item,
    )
    # Pending is invisible: base stem is served
    assert res_pending["is_localized"] is False
    assert res_pending["stem"][0]["text"] == "Base stem text"

    # 2. Rejected override
    loc_pending.review_status = "rejected"
    db_session.commit()

    res_rejected = resolve_item(
        db=db_session,
        item_id="item-word-002",
        framework_id="gh_bece_math_2024",
        learner_pin="gh_bece_math_2024",
        base_item=base_item,
    )
    assert res_rejected["is_localized"] is False
    assert res_rejected["stem"][0]["text"] == "Base stem text"


def test_resolve_item_raises_on_mismatched_pin(db_session: Session):
    base_item = {"item_id": "item-001", "stem": []}

    with pytest.raises(FrameworkPinMismatchError) as excinfo:
        resolve_item(
            db=db_session,
            item_id="item-001",
            framework_id="gh_bece_math_2024",
            learner_pin="ng_bece_math_2024",  # mismatch!
            base_item=base_item,
        )

    assert "Learner pin mismatch" in str(excinfo.value)


def test_resolve_content_with_and_without_overrides(db_session: Session):
    base_content = {
        "id": "content-frac-001",
        "node_id": "MATH.FRAC.ADD_UNLIKE",
        "sections": [
            {"title": "Concept", "body": "Fractions need common denominators."},
            {"title": "Example", "body": "Imagine sharing a pizza in New York."},
        ],
    }

    base_copy = copy.deepcopy(base_content)

    # 1. No localization
    res1 = resolve_content(
        db=db_session,
        content_id="content-frac-001",
        framework_id="gh_bece_math_2024",
        learner_pin="gh_bece_math_2024",
        base_content=base_content,
    )
    assert res1["is_localized"] is False
    assert res1["sections"][1]["body"] == "Imagine sharing a pizza in New York."
    assert base_content == base_copy

    # 2. Add localized section override with review_status='approved'
    loc = ContentLocalization(
        content_id="content-frac-001",
        framework_id="gh_bece_math_2024",
        section_overrides={"1": {"title": "Example", "body": "Imagine sharing a watermelon in Accra."}},
        rationale="Local context replacement",
        review_status="approved",
    )
    db_session.add(loc)
    db_session.commit()

    res2 = resolve_content(
        db=db_session,
        content_id="content-frac-001",
        framework_id="gh_bece_math_2024",
        learner_pin="gh_bece_math_2024",
        base_content=base_content,
    )
    assert res2["is_localized"] is True
    assert "watermelon in Accra" in res2["sections"][1]["body"]
    # Base content remains unmutated
    assert "pizza in New York" in base_content["sections"][1]["body"]


    # 3. Pin mismatch raises
    with pytest.raises(FrameworkPinMismatchError):
        resolve_content(
            db=db_session,
            content_id="content-frac-001",
            framework_id="gh_bece_math_2024",
            learner_pin="sl_bece_math_2024",
            base_content=base_content,
        )
