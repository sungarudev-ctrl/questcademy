"""Unit tests for Pipeline C (Framework Extraction, Mapping Proposals, and Coverage).

Source of truth:
- docs/plan.md §3.4
- docs/02-curriculum-framework-spec.md §3, §6, §9
- Task 8 §8.9
"""

from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from backend.app.db.base import Base
from backend.app.db.models.content import SkillNode, Item
from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    SyllabusObjective,
    ObjectiveNodeMap,
    ObjectiveNodeMapProposal,
    FrameworkRollout,
)
from backend.app.ai.pipelines.framework_pipeline import (
    extract_objectives,
    map_objectives,
    get_framework_coverage,
)
from backend.app.services.framework_service import map_objective, BulkMappingProhibitedError
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """In-memory SQLite session with full framework schema."""
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
        status="draft",
        grading_scale=[],
        exam_structure={},
    )
    session.add(fw)

    rollout = FrameworkRollout(
        country_code="GH",
        framework_id="gh_bece_math_2024",
        phase="importing",
    )
    session.add(rollout)

    session.commit()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_extraction_returns_verbatim_objectives(db_session: Session):
    """Pipeline C Step 1: Extracts verbatim objectives, persists as coverage_status='unmapped'."""
    raw_syllabus = "SECTION 1: NUMBERS\n1. Add and subtract fractions with different denominators."
    mock_payload = {
        "objectives": [
            {
                "code": "JSS2.NUM.1.1",
                "text": "Add and subtract fractions with different denominators.",
                "grade_band": "JSS2",
                "term": 1,
                "exam_weight": 0.05,
            }
        ]
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 500, 200))
    try:
        objs = extract_objectives(
            framework_id="gh_bece_math_2024",
            source=raw_syllabus,
            actor_id="lead-001",
            db=db_session,
        )

        assert len(objs) == 1
        obj = objs[0]
        assert obj.code == "JSS2.NUM.1.1"
        assert obj.text == "Add and subtract fractions with different denominators."  # Verbatim
        assert obj.coverage_status == "unmapped"

        db_obj = db_session.query(SyllabusObjective).filter(SyllabusObjective.objective_id == obj.objective_id).first()
        assert db_obj is not None
        assert db_obj.coverage_status == "unmapped"
    finally:
        gemini.clear_mock_responder()


def test_mapping_returns_proposals_and_never_writes_directly_to_map(db_session: Session):
    """Pipeline C Step 3: Writes proposals to staging table; NEVER inserts into objective_node_map."""
    # Seed objective and skill node
    obj = SyllabusObjective(
        objective_id="gh_bece_math_2024:JSS2.NUM.1.1",
        framework_id="gh_bece_math_2024",
        code="JSS2.NUM.1.1",
        text="Add fractions with unlike denominators.",
        grade_band="JSS2",
        coverage_status="unmapped",
    )
    node = SkillNode(
        node_id="MATH.FRAC.ADD_UNLIKE",
        subject="Mathematics",
        topic="Fractions",
        title="Add Fractions with Unlike Denominators",
        learner_title="Adding Unlike Fractions",
        description="LCD method.",
        est_minutes=12,
        status="live",
    )
    db_session.add_all([obj, node])
    db_session.commit()

    mock_payload = {
        "proposals": [
            {
                "objective_id": "gh_bece_math_2024:JSS2.NUM.1.1",
                "proposed_node": "MATH.FRAC.ADD_UNLIKE",
                "confidence": 0.95,
                "rationale": "Direct alignment with fraction addition objective.",
            }
        ]
    }

    gemini.set_mock_responder(lambda *args, **kwargs: (mock_payload, 500, 200))
    try:
        proposals = map_objectives(
            framework_id="gh_bece_math_2024",
            actor_id="lead-001",
            db=db_session,
        )

        assert len(proposals) == 1
        prop = proposals[0]
        assert float(prop.confidence) == 0.95
        assert prop.review_status == "pending"

        # Check proposal exists in staging table
        db_prop = db_session.query(ObjectiveNodeMapProposal).filter(ObjectiveNodeMapProposal.id == prop.id).first()
        assert db_prop is not None

        # CRITICAL CHECK: objective_node_map MUST HAVE ZERO ROWS!
        direct_maps_count = db_session.query(ObjectiveNodeMap).count()
        assert direct_maps_count == 0
    finally:
        gemini.clear_mock_responder()


def test_coverage_computed_at_80_percent_boundary(db_session: Session):
    """Pipeline C Step 9: Coverage counts only if node has >= 15 published items and >= 5 tier-3 items."""
    # Create 5 objectives
    objs = []
    for i in range(1, 6):
        o = SyllabusObjective(
            objective_id=f"gh_bece_math_2024:OBJ_{i}",
            framework_id="gh_bece_math_2024",
            code=f"OBJ_{i}",
            text=f"Objective {i}",
            grade_band="JSS2",
        )
        objs.append(o)
    db_session.add_all(objs)

    # Create 5 nodes
    nodes = []
    for i in range(1, 6):
        n = SkillNode(
            node_id=f"NODE_{i}",
            subject="Mathematics",
            topic="Topic",
            title=f"Node {i}",
            learner_title=f"Node {i}",
            description="desc",
            est_minutes=10,
        )
        nodes.append(n)
        # Map OBJ_i -> NODE_i
        db_session.add(ObjectiveNodeMap(objective_id=f"gh_bece_math_2024:OBJ_{i}", node_id=f"NODE_{i}"))
    db_session.add_all(nodes)

    # For Nodes 1, 2, 3: Give 15 published items (including 5 Tier 3) -> Covered (3/5 = 60.0%)
    for i in range(1, 4):
        for j in range(1, 11):
            db_session.add(Item(node_id=f"NODE_{i}", type="mcq", difficulty_tier=1, status="reviewed", stem="", payload={}, scoring={}, hints=[], worked_solution="", a11y={}))
        for j in range(1, 6):
            db_session.add(Item(node_id=f"NODE_{i}", type="mcq", difficulty_tier=3, status="reviewed", stem="", payload={}, scoring={}, hints=[], worked_solution="", a11y={}))

    db_session.commit()

    # 3 / 5 = 60.0% coverage -> Ineligible for activation
    report1 = get_framework_coverage("gh_bece_math_2024", db=db_session)
    assert report1.coverage_pct == 60.0
    assert report1.eligible_for_activation is False

    # For Node 4: Give 15 published items (with 5 Tier 3) -> 4 / 5 = 80.0% coverage -> Eligible!
    for j in range(1, 11):
        db_session.add(Item(node_id="NODE_4", type="mcq", difficulty_tier=1, status="reviewed", stem="", payload={}, scoring={}, hints=[], worked_solution="", a11y={}))
    for j in range(1, 6):
        db_session.add(Item(node_id="NODE_4", type="mcq", difficulty_tier=3, status="reviewed", stem="", payload={}, scoring={}, hints=[], worked_solution="", a11y={}))
    db_session.commit()

    report2 = get_framework_coverage("gh_bece_math_2024", db=db_session)
    assert report2.coverage_pct == 80.0
    assert report2.eligible_for_activation is True

    # Check rollout table was updated with coverage_pct
    rollout = db_session.query(FrameworkRollout).filter(FrameworkRollout.framework_id == "gh_bece_math_2024").first()
    assert float(rollout.coverage_pct) == 80.0


def test_proposal_cannot_be_bulk_approved(db_session: Session):
    """Governance check: map_objective prohibits lists / bulk approval."""
    with pytest.raises(BulkMappingProhibitedError):
        map_objective(
            db=db_session,
            objective_id=["obj1", "obj2"],  # List passed!
            node_id="node1",
            actor="lead-001",
        )
