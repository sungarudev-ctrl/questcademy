"""3 valid + 1 rejected: only the valid ones are applied; the rejected one carries a reason."""
from backend.app.services.sync_service import sync_attempts
from conftest import SERVER_TIME, make_attempt


def test_three_valid_one_rejected(db):
    good = [make_attempt(i) for i in range(3)]
    bad = make_attempt(9, hints_used=7)
    res = sync_attempts(db, good + [bad], server_time=SERVER_TIME)
    assert sorted(res.applied) == sorted(a["attempt_id"] for a in good)
    assert [r["attempt_id"] for r in res.rejected] == [bad["attempt_id"]]
    assert "hints_used" in res.rejected[0]["reason"]


def test_unknown_item_is_rejected_not_dropped_silently(db):
    a = make_attempt(1, item_id="00000000-0000-0000-0000-00000000dead")
    res = sync_attempts(db, [a], server_time=SERVER_TIME)
    assert res.rejected == [{"attempt_id": a["attempt_id"], "reason": "unknown_item"}]


def test_unauthorised_learner_is_rejected(db):
    a = make_attempt(1, learner="someone-else")
    res = sync_attempts(db, [a], server_time=SERVER_TIME, authorized_learner_ids={"learner-a"})
    assert res.rejected[0]["reason"] == "learner_not_authorized"
