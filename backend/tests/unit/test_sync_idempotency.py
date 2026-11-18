"""Same batch twice -> same state, no duplicate rows (I-8)."""
from sqlalchemy import func, select

from backend.app.db.models.sync import AttemptRecord
from backend.app.services.sync_service import sync_attempts
from conftest import SERVER_TIME, make_attempt


def test_same_batch_twice_produces_same_state(db):
    batch = [make_attempt(i, correct=i % 3 != 0) for i in range(8)]
    first = sync_attempts(db, batch, server_time=SERVER_TIME)
    db.commit()
    second = sync_attempts(db, batch, server_time=SERVER_TIME)
    db.commit()

    assert len(first.applied) == 8 and first.duplicates == []
    assert second.applied == [] and len(second.duplicates) == 8
    assert db.execute(select(func.count()).select_from(AttemptRecord)).scalar() == 8
    assert first.states["learner-a"]["nodes"]["MATH.FRAC.ADD_UNLIKE"]["attempts_total"] == 8


def test_duplicate_inside_one_batch_is_counted_once(db):
    a = make_attempt(1)
    res = sync_attempts(db, [a, dict(a)], server_time=SERVER_TIME)
    assert res.applied == [a["attempt_id"]]
    assert res.duplicates == [a["attempt_id"]]
