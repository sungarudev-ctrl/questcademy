"""Future-dated attempts are rewritten; >30-day-old attempts are flagged and excluded."""
from datetime import timedelta

from sqlalchemy import select

from backend.app.db.models.sync import AttemptRecord, SyncAnomaly
from backend.app.services.sync_service import derive_learner_state, sync_attempts
from conftest import SERVER_TIME, iso, make_attempt


def test_attempt_one_hour_in_future_is_rewritten(db):
    a = make_attempt(1, occurred=SERVER_TIME + timedelta(hours=1))
    res = sync_attempts(db, [a], server_time=SERVER_TIME)
    rec = db.get(AttemptRecord, a["attempt_id"])
    assert rec.occurred_at == iso(SERVER_TIME - timedelta(seconds=5))
    assert rec.occurred_at_client == a["occurred_at"]
    assert res.states["learner-a"]["nodes"]["MATH.FRAC.ADD_UNLIKE"]["attempts_total"] == 1
    assert [x.kind for x in db.execute(select(SyncAnomaly)).scalars()] == ["clock_future"]


def test_within_five_minutes_is_not_rewritten(db):
    a = make_attempt(1, occurred=SERVER_TIME + timedelta(minutes=4))
    sync_attempts(db, [a], server_time=SERVER_TIME)
    assert db.get(AttemptRecord, a["attempt_id"]).occurred_at == a["occurred_at"]


def test_attempt_sixty_days_old_is_flagged_and_excluded(db):
    old = make_attempt(1, occurred=SERVER_TIME - timedelta(days=60))
    res = sync_attempts(db, [old], server_time=SERVER_TIME)
    assert db.get(AttemptRecord, old["attempt_id"]).flagged is True
    assert res.states["learner-a"]["nodes"] == {}


def test_lead_inclusion_brings_flagged_attempt_back(db):
    old = make_attempt(1, occurred=SERVER_TIME - timedelta(days=60))
    sync_attempts(db, [old], server_time=SERVER_TIME)
    db.get(AttemptRecord, old["attempt_id"]).included_by_lead = True
    db.flush()
    snap = derive_learner_state(db, "learner-a")
    assert snap["nodes"]["MATH.FRAC.ADD_UNLIKE"]["attempts_total"] == 1
