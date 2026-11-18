"""State-mismatch anomalies (3 consecutive syncs -> incident) and the HTTP surface."""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import select

from backend.app.api import sync as sync_api
from backend.app.db.models.sync import SyncAnomaly
from backend.app.services.sync_service import sync_attempts
from conftest import SERVER_TIME, make_attempt, make_db

NODE = "MATH.FRAC.ADD_UNLIKE"


def test_matching_local_prediction_logs_no_anomaly(db, fresh_db):
    batch = [make_attempt(i) for i in range(4)]
    server = sync_attempts(fresh_db(), batch, server_time=SERVER_TIME).states["learner-a"]["nodes"][NODE]
    sync_attempts(
        db, batch, server_time=SERVER_TIME,
        local_states={"learner-a": {NODE: {"status": server["status"], "ability_elo": server["ability_elo"]}}},
    )
    assert db.execute(select(SyncAnomaly).where(SyncAnomaly.kind == "state_mismatch")).scalars().all() == []


def test_three_consecutive_mismatches_raise_an_incident(db):
    wrong = {"learner-a": {NODE: {"status": "mastered", "ability_elo": 9999.0}}}
    for n in range(3):
        sync_attempts(db, [make_attempt(n)], server_time=SERVER_TIME, local_states=wrong)
        db.commit()
    rows = db.execute(select(SyncAnomaly).where(SyncAnomaly.kind == "state_mismatch")
                      .order_by(SyncAnomaly.sync_no)).scalars().all()
    assert [r.consecutive_count for r in rows] == [1, 2, 3]
    assert [r.incident for r in rows] == [False, False, True]
    assert rows[0].local_state["status"] == "mastered" and rows[0].server_state["status"] != "mastered"


@pytest.fixture
def client():
    session = make_db()
    app = FastAPI()
    app.include_router(sync_api.router)
    app.dependency_overrides[sync_api.get_db] = lambda: session
    app.dependency_overrides[sync_api.get_principal] = lambda: {"learner_ids": ["learner-a"]}
    yield TestClient(app)
    session.close()


def test_post_attempts_returns_applied_duplicates_and_state(client):
    a = make_attempt(1, occurred=None)
    from datetime import datetime, timezone
    a["occurred_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    body = {"attempts": [a]}
    first = client.post("/api/sync/attempts", json=body).json()
    again = client.post("/api/sync/attempts", json=body).json()
    assert first["applied"] == [a["attempt_id"]] and first["state"]["learner-a"]["nodes"][NODE]["attempts_total"] == 1
    assert again["duplicates"] == [a["attempt_id"]] and again["applied"] == []


def test_state_endpoint_refuses_other_learners(client):
    assert client.post("/api/sync/state", json={"learner_id": "learner-z"}).status_code == 403
    assert client.post("/api/sync/state", json={"learner_id": "learner-a"}).status_code == 200


def test_cursor_endpoint(client):
    body = client.get("/api/sync/cursor").json()
    assert body["cursor_version"] == 1 and body["server_time"].endswith("Z")
