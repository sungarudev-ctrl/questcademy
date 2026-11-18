"""Integration tests for Content Studio Admin API.

Source of truth:
- docs/tasks.md §9.15, §9.16
- docs/02-curriculum-framework-spec.md §9
- docs/05-assessment-item-spec.md §7
"""

from datetime import date, datetime, timezone
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import backend.app.db.models  # Ensure all models are registered
from backend.app.db.base import Base
from backend.app.db.models.content import (
    Item,
    ItemLifecycleEvent,
    SkillNode,
    SkillNodeContent,
)
from backend.app.db.models.framework import (
    ContentLocalization,
    Country,
    CurriculumFramework,
    FrameworkCohortStats,
    FrameworkRollout,
    GenerationJob,
    ItemLocalization,
    ObjectiveNodeMap,
    ObjectiveNodeMapProposal,
    SyllabusObjective,
)
from backend.app.api.admin import router as admin_router, get_db


@pytest.fixture
def admin_client():
    """Create in-memory SQLite DB and TestClient with overridden get_db."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )
    Base.metadata.create_all(engine)
    TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


    app = FastAPI()
    app.include_router(admin_router)

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed minimal framework and rollout fixture
    db = TestingSessionLocal()
    c = Country(country_code="GH", name="Ghana", default_locale="en-GH", default_currency="GHS")
    fw = CurriculumFramework(
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="Mathematics",
        version="2024.1",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[{"grade": "1", "min_score": 80}],
        exam_structure={"paper1": 40},
    )
    rollout = FrameworkRollout(
        country_code="GH",
        framework_id="gh_bece_math_2024",
        phase="authoring",
        coverage_pct=75.0,
        blockers=["Coverage 75% < 80%"],
    )
    node = SkillNode(
        node_id="MATH.FRAC.ADD_UNLIKE",
        subject="mathematics",
        topic="fractions",
        title="Add Unlike Fractions",
        learner_title="Adding Different Fractions",
        description="Add fractions with different denominators",
        est_minutes=12,
        status="live",
    )

    obj = SyllabusObjective(
        objective_id="GH.MAT.JSS2.1",
        framework_id="gh_bece_math_2024",
        code="JSS2.NUM.3.2",
        text="Add two fractions with different denominators",
        grade_band="JSS2",
    )
    db.add_all([c, fw, rollout, node, obj])
    db.commit()
    db.close()

    with TestClient(app) as client:
        yield client, TestingSessionLocal


def test_admin_rbac_enforcement(admin_client):
    """Admin endpoints reject requests missing valid admin roles with HTTP 403."""
    client, _ = admin_client

    # No role header
    res = client.get("/api/admin/frameworks/gh_bece_math_2024/rollout")
    assert res.status_code == 403

    # Invalid student or teacher role
    res = client.get(
        "/api/admin/frameworks/gh_bece_math_2024/rollout",
        headers={"X-User-Role": "student"},
    )
    assert res.status_code == 403

    # Valid curriculum_lead role succeeds
    res = client.get(
        "/api/admin/frameworks/gh_bece_math_2024/rollout",
        headers={"X-User-Role": "curriculum_lead"},
    )
    assert res.status_code == 200
    assert res.json()["framework_id"] == "gh_bece_math_2024"


def test_bulk_operations_return_405(admin_client):
    """Bulk endpoints return HTTP 405 Method Not Allowed per §9.15."""
    client, _ = admin_client
    headers = {"X-User-Role": "curriculum_lead"}

    res = client.post("/api/admin/bulk", headers=headers)
    assert res.status_code == 405
    assert "Bulk operations are prohibited" in res.json()["detail"]

    res = client.post("/api/admin/items/bulk", headers=headers)
    assert res.status_code == 405
    assert "Bulk operations are prohibited" in res.json()["detail"]

    res = client.post("/api/admin/mappings/bulk", headers=headers)
    assert res.status_code == 405


def test_mapping_proposal_confirm_and_reject(admin_client):
    """Confirming a proposal writes to objective_node_map; rejecting updates rationale."""
    client, SessionLocal = admin_client
    headers = {"X-User-Role": "curriculum_lead", "X-User-Id": "lead-user-123"}

    db = SessionLocal()
    p1 = ObjectiveNodeMapProposal(
        framework_id="gh_bece_math_2024",
        objective_id="GH.MAT.JSS2.1",
        proposed_node="MATH.FRAC.ADD_UNLIKE",
        confidence=0.92,
        rationale="Clear fraction addition match",
    )
    p2 = ObjectiveNodeMapProposal(
        framework_id="gh_bece_math_2024",
        objective_id="GH.MAT.JSS2.1",
        proposed_node="MATH.NUM.DECIMALS",
        confidence=0.30,
        rationale="Weak match",
    )
    db.add_all([p1, p2])
    db.commit()
    p1_id, p2_id = p1.id, p2.id
    db.close()

    # Confirm p1
    res = client.post(f"/api/admin/mappings/{p1_id}/confirm", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "confirmed"
    assert res.json()["reviewed_by"] == "lead-user-123"

    # Verify written to objective_node_map
    db = SessionLocal()
    mapping = db.query(ObjectiveNodeMap).filter(
        ObjectiveNodeMap.objective_id == "GH.MAT.JSS2.1",
        ObjectiveNodeMap.node_id == "MATH.FRAC.ADD_UNLIKE",
    ).first()
    assert mapping is not None

    # Reject p2
    res = client.post(
        f"/api/admin/mappings/{p2_id}/reject",
        json={"reason": "Irrelevant decimal node for fraction objective"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"

    prop2 = db.query(ObjectiveNodeMapProposal).filter(ObjectiveNodeMapProposal.id == p2_id).first()
    assert prop2.review_status == "rejected"
    assert prop2.rationale == "Irrelevant decimal node for fraction objective"
    assert prop2.reviewed_by == "lead-user-123"
    db.close()


def test_content_approve_and_reject_with_requeue(admin_client):
    """Content approval updates status and published_at; reject re-queues generation with reason."""
    client, SessionLocal = admin_client
    headers = {"X-User-Role": "reviewer", "X-User-Id": "reviewer-alice"}

    db = SessionLocal()
    content = SkillNodeContent(
        id="content-c1",
        node_id="MATH.FRAC.ADD_UNLIKE",
        version=1,
        sections=[{"block_id": "b1", "type": "text", "payload": {"text": "Simple explanation of fractions."}}],
        worked_examples=[{"problem": "1/2 + 1/4", "steps": ["Find LCD"], "final_answer": "3/4"}] * 3,
        estimated_minutes=10,
        status="draft",
    )
    db.add(content)
    db.commit()
    db.close()

    # Quality check
    res = client.get("/api/admin/content/content-c1/quality", headers=headers)
    assert res.status_code == 200
    assert res.json()["worked_examples_count"] == 3
    assert res.json()["worked_examples_pass"] is True

    # Reject content
    res = client.post(
        "/api/admin/content/content-c1/reject",
        json={"reason": "Need more relatable cultural examples in worked solutions"},
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "rejected"
    job_id = res.json()["new_job_id"]

    # Verify job created with rejected_reason in metadata
    db = SessionLocal()
    job = db.query(GenerationJob).filter(GenerationJob.job_id == job_id).first()
    assert job is not None
    assert job.job_metadata["rejected_reason"] == "Need more relatable cultural examples in worked solutions"

    # Now approve content
    res = client.post("/api/admin/content/content-c1/approve", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "approved"
    assert res.json()["reviewed_by"] == "reviewer-alice"

    c_row = db.query(SkillNodeContent).filter(SkillNodeContent.id == "content-c1").first()
    assert c_row.status == "published"
    assert c_row.published_at is not None
    db.close()



def test_item_approval_rejects_untagged_distractor(admin_client):
    """Approving an item with an untagged distractor raises HTTP 400."""
    client, SessionLocal = admin_client
    headers = {"X-User-Role": "curriculum_lead", "X-User-Id": "lead-bob"}

    db = SessionLocal()
    item_bad = Item(
        item_id="item-bad",
        node_id="MATH.FRAC.ADD_UNLIKE",
        type="mcq_single",
        difficulty_tier=2,
        stem={"type": "text", "content": "What is 1/2 + 1/4?"},
        payload={
            "options": [
                {"id": "A", "content": "3/4", "correct": True},
                {"id": "B", "content": "2/6", "correct": False},  # Missing misconception_id!
            ]
        },
        scoring={"type": "exact"},
        hints=[{"level": 1, "text": "h1"}, {"level": 2, "text": "h2"}, {"level": 3, "text": "h3"}],
        worked_solution={"text": "Step 1..."},
        status="tagged",
        a11y={},
    )
    item_good = Item(
        item_id="item-good",
        node_id="MATH.FRAC.ADD_UNLIKE",
        type="mcq_single",
        difficulty_tier=2,
        stem={"type": "text", "content": "What is 1/2 + 1/4?"},
        payload={
            "options": [
                {"id": "A", "content": "3/4", "correct": True},
                {"id": "B", "content": "2/6", "correct": False, "misconception_id": "FRAC.ADD_DENOM"},
            ]
        },
        scoring={"type": "exact"},
        hints=[{"level": 1, "text": "h1"}, {"level": 2, "text": "h2"}, {"level": 3, "text": "h3"}],
        worked_solution={"text": "Step 1..."},
        status="tagged",
        a11y={},
    )
    db.add_all([item_bad, item_good])
    db.commit()
    db.close()

    # Attempt approve item_bad -> fails 400
    res = client.post("/api/admin/items/item-bad/approve", headers=headers)
    assert res.status_code == 400
    assert "missing a required misconception_id" in res.json()["detail"]

    # Approve item_good -> succeeds
    res = client.post("/api/admin/items/item-good/approve", headers=headers)
    assert res.status_code == 200
    assert res.json()["status"] == "approved"
    assert res.json()["item_status"] == "reviewed"


def test_localization_approval_enforces_math_invariance(admin_client):
    """Approving an item localization override validates SymPy math invariance."""
    client, SessionLocal = admin_client
    headers = {"X-User-Role": "reviewer", "X-User-Id": "rev-1"}

    db = SessionLocal()
    base_item = Item(
        item_id="item-math-1",
        node_id="MATH.FRAC.ADD_UNLIKE",
        type="mcq_single",
        difficulty_tier=1,
        stem={"type": "text", "content": "Find the value of 5 + 7."},
        payload={"options": [{"id": "A", "content": "12", "correct": True}]},
        scoring={"type": "exact"},
        hints=[{"level": 1}, {"level": 2}, {"level": 3}],
        worked_solution={"text": "5+7=12"},
        status="reviewed",
        a11y={},
    )
    # Valid localization: changes name, keeps math
    loc_valid = ItemLocalization(
        item_id="item-math-1",
        framework_id="gh_bece_math_2024",
        stem_override="Kofi adds 5 mangos and 7 mangos. How many mangos does he have?",
        payload_override={"options": [{"id": "A", "content": "12", "correct": True}]},
        review_status="pending",
    )
    db.add_all([base_item, loc_valid])
    db.commit()
    db.close()

    # Valid approval succeeds
    res = client.post(
        "/api/admin/localizations/item-math-1/approve?framework_id=gh_bece_math_2024",
        headers=headers,
    )
    assert res.status_code == 200
    assert res.json()["status"] == "approved"

    # Now test an override that modifies numeric answer
    db = SessionLocal()
    loc_invalid = ItemLocalization(
        item_id="item-math-2",
        framework_id="gh_bece_math_2024",
        stem_override="Kofi adds 10 mangos and 7 mangos.",
        payload_override={"options": [{"id": "A", "content": "17", "correct": True}]},
        review_status="pending",
    )
    base_item2 = Item(
        item_id="item-math-2",
        node_id="MATH.FRAC.ADD_UNLIKE",
        type="mcq_single",
        difficulty_tier=1,
        stem={"type": "text", "content": "Find 5 + 7."},
        payload={"options": [{"id": "A", "content": "12", "correct": True}]},
        scoring={"type": "exact"},
        hints=[{"level": 1}, {"level": 2}, {"level": 3}],
        worked_solution={"text": "12"},
        status="reviewed",
        a11y={},
    )
    db.add_all([base_item2, loc_invalid])
    db.commit()
    db.close()

    # Invalid approval fails with 400
    res = client.post(
        "/api/admin/localizations/item-math-2/approve?framework_id=gh_bece_math_2024",
        headers=headers,
    )
    assert res.status_code == 400
    assert "mathematical deviation" in res.json()["detail"]


def test_job_retry_capped_at_three(admin_client):
    """Retrying a failed job is capped at 3 total attempts."""
    client, SessionLocal = admin_client
    headers = {"X-User-Role": "admin"}

    db = SessionLocal()
    job = GenerationJob(
        job_id="job-retry-1",
        job_type="item_generation",
        target_id="MATH.FRAC.ADD_UNLIKE",
        status="failed",
        error="Transient timeout",
        job_metadata={"attempts": 2},
    )
    db.add(job)
    db.commit()
    db.close()

    # Attempt 3 succeeds
    res = client.post("/api/admin/jobs/job-retry-1/retry", headers=headers)
    assert res.status_code == 200
    assert res.json()["attempts"] == 3

    # Attempt 4 fails with 400
    res = client.post("/api/admin/jobs/job-retry-1/retry", headers=headers)
    assert res.status_code == 400
    assert "Maximum 3 attempts allowed" in res.json()["detail"]
