"""Unit tests for Framework Service.

Source of truth:
- docs/plan.md §2.9 - §2.13, §6
- docs/02-curriculum-framework-spec.md §5, §9
"""

import hashlib
import json
from datetime import date
import pytest
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Integer,
    Numeric,
    String,
    Text,
    create_engine,
    select,
)
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.types import JSON

from backend.app.db.base import Base
from backend.app.db.models.sync import LearnerNodeStateRecord
from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    FrameworkRollout,
    LearnerFrameworkPin,
    LearnerPinMigration,
    LocalizationBrief,
    ObjectiveNodeMap,
    SyllabusObjective,
)
from backend.app.services.framework_service import (
    BulkMappingProhibitedError,
    CoverageGateError,
    FrameworkNotFoundError,
    activate_framework,
    compute_coverage,
    create_framework,
    import_objectives,
    map_objective,
    migrate_learner_pin,
    refresh_localization,
    supersede_framework,
)


@pytest.fixture
def db_session():
    """In-memory SQLite session with all framework tables created."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    # Seed initial test country
    gh = Country(
        country_code="GH",
        name="Ghana",
        default_locale="en-GH",
        default_currency="GHS",
        status="active",
    )
    ng = Country(
        country_code="NG",
        name="Nigeria",
        default_locale="en-NG",
        default_currency="NGN",
        status="active",
    )
    session.add_all([gh, ng])
    session.commit()

    yield session

    session.close()
    Base.metadata.drop_all(engine)


def test_create_framework_success(db_session: Session):
    fw = create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC (Ghana)",
        subject="mathematics",
        version="2024.1",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[{"grade": 1, "min_pct": 80, "meaning": "Excellent"}],
        exam_structure={"papers": [{"paper_id": "1", "name": "Objective"}]},
        grade_bands=[
            {"band_id": "JSS1", "ordinal": 7, "label_local": "JSS 1"},
            {"band_id": "JSS2", "ordinal": 8, "label_local": "JSS 2"},
        ],
    )
    db_session.commit()

    assert fw.framework_id == "gh_bece_math_2024"
    assert fw.status == "draft"

    # Verify rollout row initialized
    rollout = db_session.scalars(
        select(FrameworkRollout).where(FrameworkRollout.framework_id == "gh_bece_math_2024")
    ).first()
    assert rollout is not None
    assert rollout.phase == "planned"


def test_import_objectives_stages_drafts(db_session: Session):
    create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    db_session.commit()

    raw_objs = [
        {
            "code": "JSS1.NUM.2.3",
            "text": "Perform operations on fractions",
            "grade_band": "JSS1",
            "term": 1,
            "exam_weight": 0.06,
        },
        {
            "code": "JSS2.ALG.1.1",
            "text": "Solve linear equations",
            "grade_band": "JSS2",
            "term": 2,
            "exam_weight": 0.08,
        },
    ]

    staged = import_objectives(db_session, "gh_bece_math_2024", raw_objs)
    db_session.commit()

    assert len(staged) == 2
    assert all(obj.coverage_status == "unmapped" for obj in staged)

    # Rollout phase updated to mapping
    rollout = db_session.scalars(
        select(FrameworkRollout).where(FrameworkRollout.framework_id == "gh_bece_math_2024")
    ).first()
    assert rollout.phase == "mapping"


def test_map_objective_prohibits_bulk_mapping(db_session: Session):
    create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    import_objectives(
        db_session,
        "gh_bece_math_2024",
        [{"code": "JSS1.NUM.1", "text": "Fractions", "grade_band": "JSS1"}],
    )
    db_session.commit()

    obj_id = "gh_bece_math_2024.JSS1.NUM.1"

    # Runtime assertion: Calling with list fails with BulkMappingProhibitedError
    with pytest.raises(BulkMappingProhibitedError):
        map_objective(db_session, [obj_id], "MATH.FRAC.ADD", actor="lead_curriculum")  # type: ignore

    with pytest.raises(BulkMappingProhibitedError):
        map_objective(db_session, obj_id, ["MATH.FRAC.ADD", "MATH.FRAC.SUB"], actor="lead_curriculum")  # type: ignore

    # Single call succeeds
    mapping = map_objective(db_session, obj_id, "MATH.FRAC.ADD", actor="lead_curriculum")
    db_session.commit()
    assert mapping.objective_id == obj_id
    assert mapping.node_id == "MATH.FRAC.ADD"

    # Objective status changed from unmapped to partial
    obj = db_session.get(SyllabusObjective, obj_id)
    assert obj.coverage_status == "partial"


def test_compute_coverage_counts_objectives_with_15_published_items(db_session: Session):
    create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    import_objectives(
        db_session,
        "gh_bece_math_2024",
        [
            {"code": "OBJ.1", "text": "Add fractions", "grade_band": "JSS1"},
            {"code": "OBJ.2", "text": "Sub fractions", "grade_band": "JSS1"},
        ],
    )
    db_session.commit()

    map_objective(db_session, "gh_bece_math_2024.OBJ.1", "MATH.FRAC.ADD", actor="lead")
    map_objective(db_session, "gh_bece_math_2024.OBJ.2", "MATH.FRAC.SUB", actor="lead")
    db_session.commit()

    # Node 1 has 16 published items (>= 15 -> covered)
    # Node 2 has 14 published items (< 15 -> not covered)
    item_counts = {
        "MATH.FRAC.ADD": 16,
        "MATH.FRAC.SUB": 14,
    }

    coverage = compute_coverage(db_session, "gh_bece_math_2024", published_items_by_node=item_counts)
    # 1 of 2 covered = 50.0%
    assert coverage == 50.0


def test_activate_framework_raises_below_80_percent_coverage(db_session: Session):
    create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    # Create 1000 objectives so we can achieve exactly 79.9%
    # 799 covered / 1000 = 79.9%
    objs = [{"code": f"OBJ.{i}", "text": f"Objective {i}", "grade_band": "JSS1"} for i in range(1000)]
    import_objectives(db_session, "gh_bece_math_2024", objs)
    db_session.commit()

    item_counts = {}
    for i in range(1000):
        obj_id = f"gh_bece_math_2024.OBJ.{i}"
        node_id = f"MATH.NODE.{i}"
        map_objective(db_session, obj_id, node_id, actor="lead")
        if i < 799:
            item_counts[node_id] = 15  # covered
        else:
            item_counts[node_id] = 5   # not covered

    db_session.commit()

    coverage = compute_coverage(db_session, "gh_bece_math_2024", published_items_by_node=item_counts)
    assert coverage == 79.9

    # Hard gate: 79.9% MUST raise CoverageGateError
    with pytest.raises(CoverageGateError) as excinfo:
        activate_framework(db_session, "gh_bece_math_2024", actor="lead", published_items_by_node=item_counts)
    assert "below the 80.0% requirement" in str(excinfo.value)

    # Add 1 more covered objective -> 800/1000 = 80.0%
    item_counts["MATH.NODE.799"] = 15
    activated = activate_framework(db_session, "gh_bece_math_2024", actor="lead", published_items_by_node=item_counts)
    assert activated.status == "active"


def test_supersede_framework_generates_diff_and_leaves_pins_untouched(db_session: Session):
    fw1 = create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    fw2 = create_framework(
        db=db_session,
        framework_id="gh_bece_math_2025",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2025",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2025, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    import_objectives(
        db_session,
        "gh_bece_math_2024",
        [{"code": "OBJ.A", "text": "Old text", "grade_band": "JSS1"}],
    )
    import_objectives(
        db_session,
        "gh_bece_math_2025",
        [
            {"code": "OBJ.A", "text": "Old text", "grade_band": "JSS2"}, # remapped
            {"code": "OBJ.B", "text": "New text", "grade_band": "JSS2"}, # added
        ],
    )
    db_session.commit()

    # Pinned learner on fw1
    pin = LearnerFrameworkPin(learner_id="learner-abc", framework_id="gh_bece_math_2024")
    db_session.add(pin)
    db_session.commit()

    diff = supersede_framework(db_session, "gh_bece_math_2024", "gh_bece_math_2025", actor="lead")
    db_session.commit()

    assert diff.from_framework == "gh_bece_math_2024"
    assert diff.to_framework == "gh_bece_math_2025"
    assert "OBJ.B" in diff.objectives_added["codes"]
    assert len(diff.objectives_remapped) == 1

    # Old framework is superseded
    assert fw1.status == "superseded"

    # Invariant V-3 & I-11: Learner pin is NOT mutated!
    saved_pin = db_session.scalars(
        select(LearnerFrameworkPin).where(LearnerFrameworkPin.learner_id == "learner-abc")
    ).first()
    assert saved_pin.framework_id == "gh_bece_math_2024"


def test_migrate_learner_pin_leaves_node_state_byte_identical(db_session: Session):
    create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    create_framework(
        db=db_session,
        framework_id="ng_bece_math_2024",
        country_code="NG",
        board="NECO",
        subject="mathematics",
        version="2024",
        locale="en-NG",
        currency="NGN",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )

    # Initial learner node state
    node_state = LearnerNodeStateRecord(
        learner_id="learner-007",
        node_id="MATH.FRAC.ADD_UNLIKE",
        status="mastered",
        ability_elo=1450.0,
        state={
            "learner_id": "learner-007",
            "node_id": "MATH.FRAC.ADD_UNLIKE",
            "status": "mastered",
            "ability_elo": 1450.0,
            "attempts_total": 7,
            "recent_window": [{"attempt_id": "a1", "correct": True}],
            "distinct_days": ["2026-09-01", "2026-09-03"],
            "max_tier_correct": 3,
            "mastered_at": "2026-09-03T10:00:00Z",
            "stability": 6.5,
            "difficulty_fsrs": 4.2,
            "due_at": "2026-09-10T10:00:00Z",
            "lapses": 0,
        },
    )
    db_session.add(node_state)
    db_session.commit()

    def get_node_state_checksum():
        rows = db_session.scalars(
            select(LearnerNodeStateRecord).where(LearnerNodeStateRecord.learner_id == "learner-007")
        ).all()
        data = [
            {"status": r.status, "ability_elo": r.ability_elo, "state": r.state}
            for r in rows
        ]
        dump = json.dumps(data, sort_keys=True)
        return hashlib.sha256(dump.encode("utf-8")).hexdigest()

    checksum_before = get_node_state_checksum()

    # Execute pin migration
    migration = migrate_learner_pin(
        db=db_session,
        learner_id="learner-007",
        to_framework_id="ng_bece_math_2024",
        reason="country_change",
        actor="admin_user",
    )
    db_session.commit()

    checksum_after = get_node_state_checksum()

    # Invariant I-11 Verification: Checksum of learner_node_state MUST be byte-identical!
    assert checksum_before == checksum_after
    assert migration.mastery_preserved is True
    assert migration.to_framework == "ng_bece_math_2024"

    # Learner pin is updated
    pin = db_session.scalars(
        select(LearnerFrameworkPin).where(LearnerFrameworkPin.learner_id == "learner-007")
    ).first()
    assert pin.framework_id == "ng_bece_math_2024"


def test_refresh_localization(db_session: Session):
    create_framework(
        db=db_session,
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        grading_scale=[],
        exam_structure={},
    )
    brief = LocalizationBrief(
        framework_id="gh_bece_math_2024",
        currency="GHS",
        common_names=["Kofi", "Ama"],
        cities=["Accra", "Kumasi"],
        foods=["Jollof", "Waakye"],
        units_preferred={"length": "cm", "mass": "kg"},
        avoid=["Thanksgiving", "snow"],
        scenario_bank=[{"topic": "market", "context": "buying yam"}],
    )
    db_session.add(brief)
    db_session.commit()

    res = refresh_localization(db_session, "gh_bece_math_2024", actor="lead")
    assert res["status"] == "staged_drafts"
    assert res["framework_id"] == "gh_bece_math_2024"
