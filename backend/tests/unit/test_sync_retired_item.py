"""An attempt on a retired item is stored but never reaches Elo or mastery."""
from backend.app.db.models.sync import AttemptRecord
from backend.app.services.sync_service import sync_attempts
from conftest import RETIRED_ITEM_ID, SERVER_TIME, make_attempt


def test_retired_item_attempt_stored_but_excluded(db):
    live = [make_attempt(i) for i in range(3)]
    retired = make_attempt(5, item_id=RETIRED_ITEM_ID)
    res = sync_attempts(db, live + [retired], server_time=SERVER_TIME)

    assert db.get(AttemptRecord, retired["attempt_id"]).excluded_reason == "retired_item"
    node = res.states["learner-a"]["nodes"]["MATH.FRAC.ADD_UNLIKE"]
    assert node["attempts_total"] == 3
    assert {
        "event_type": "content_gap",
        "node_id": "MATH.FRAC.ADD_UNLIKE",
        "item_id": RETIRED_ITEM_ID,
        "reason": "attempt_on_retired_item",
    } in res.telemetry
