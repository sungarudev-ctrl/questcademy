"""A shuffled batch produces the same state as an ordered one."""
import random

from backend.app.services.sync_service import sync_attempts
from conftest import SERVER_TIME, make_attempt


def test_shuffled_batch_equals_ordered_batch(db, fresh_db):
    ordered = [make_attempt(i, correct=i % 4 != 0, tier=1 + i % 3) for i in range(12)]
    shuffled = list(ordered)
    random.Random(3).shuffle(shuffled)

    a = sync_attempts(db, ordered, server_time=SERVER_TIME)
    b = sync_attempts(fresh_db(), shuffled, server_time=SERVER_TIME)

    assert a.states["learner-a"]["hash"] == b.states["learner-a"]["hash"]


def test_late_arriving_earlier_attempt_is_replayed_in_order(db, fresh_db):
    early = make_attempt(0, correct=False)
    late = [make_attempt(i) for i in range(1, 5)]
    sync_attempts(db, late, server_time=SERVER_TIME)
    db.commit()
    res = sync_attempts(db, [early], server_time=SERVER_TIME)
    one_shot = sync_attempts(fresh_db(), [early] + late, server_time=SERVER_TIME)
    assert res.states["learner-a"]["hash"] == one_shot.states["learner-a"]["hash"]
