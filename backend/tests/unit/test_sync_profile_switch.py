"""A mixed batch is processed per learner without cross-contamination."""
from backend.app.services.sync_service import sync_attempts
from conftest import SERVER_TIME, make_attempt


def test_mixed_batch_equals_separate_batches(db, fresh_db):
    a_attempts = [make_attempt(i, learner="learner-a", correct=True) for i in range(0, 6)]
    b_attempts = [make_attempt(100 + i, learner="learner-b", correct=False) for i in range(0, 6)]

    mixed = sync_attempts(db, a_attempts + b_attempts, server_time=SERVER_TIME)
    only_a = sync_attempts(fresh_db(), a_attempts, server_time=SERVER_TIME)

    assert set(mixed.states) == {"learner-a", "learner-b"}
    assert mixed.states["learner-a"]["hash"] == only_a.states["learner-a"]["hash"]
    node_b = mixed.states["learner-b"]["nodes"]["MATH.FRAC.ADD_UNLIKE"]
    assert node_b["learner_id"] == "learner-b" and node_b["attempts_total"] == 6
