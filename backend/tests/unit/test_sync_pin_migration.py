"""Pin migration never mutates node state (I-11); attempts under an old pin still count."""
import hashlib
import json

from sqlalchemy import select

from backend.app.db.models.framework import Country, CurriculumFramework
from backend.app.db.models.sync import LearnerNodeStateRecord
from backend.app.services.framework_service import migrate_learner_pin
from backend.app.services.sync_service import derive_learner_state, sync_attempts
from conftest import SERVER_TIME, make_attempt


def _checksum(db):
    rows = db.execute(select(LearnerNodeStateRecord).order_by(
        LearnerNodeStateRecord.learner_id, LearnerNodeStateRecord.node_id)).scalars().all()
    return hashlib.sha256(json.dumps([r.state for r in rows], sort_keys=True).encode()).hexdigest()


def test_pin_migration_leaves_learner_node_state_byte_identical(db):
    batch = [make_attempt(i, correct=i % 3 != 0) for i in range(8)]
    sync_attempts(db, batch, server_time=SERVER_TIME)
    db.commit()
    before = _checksum(db)

    db.add(Country(country_code="GH", name="Ghana", default_locale="en-GH", default_currency="GHS"))
    for fid in ("gh_2024", "gh_2025"):
        db.add(CurriculumFramework(
            framework_id=fid, board="BECE", subject="MATH", version=fid[-4:], country_code="GH",
            locale="en-GH", currency="GHS", status="active", grading_scale=[],
            exam_structure={}, effective_from=SERVER_TIME.date(), framework_type="exam_board",
        ))
    db.commit()
    migrate_learner_pin(db=db, learner_id="learner-a", to_framework_id="gh_2024", reason="board_change", actor="lead")
    migrate_learner_pin(db=db, learner_id="learner-a", to_framework_id="gh_2025", reason="superseded", actor="lead")
    db.commit()

    assert _checksum(db) == before


def test_attempt_captured_under_old_pin_counts_after_migration(db):
    sync_attempts(db, [make_attempt(i) for i in range(4)], server_time=SERVER_TIME)
    db.commit()
    late = make_attempt(50)  # arrives after the pin changed elsewhere
    res = sync_attempts(db, [late], server_time=SERVER_TIME)
    assert res.states["learner-a"]["nodes"]["MATH.FRAC.ADD_UNLIKE"]["attempts_total"] == 5
    assert derive_learner_state(db, "learner-a")["nodes"]["MATH.FRAC.ADD_UNLIKE"]["attempts_total"] == 5
