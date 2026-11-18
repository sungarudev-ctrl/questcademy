"""Shared fixtures for sync tests. They run the real engine through the Node sidecar."""

import json
import shutil
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.app.db.models  # noqa: F401  (register all tables)
from backend.app.db.base import Base
from backend.app.db.models.content import Item, SkillNode

SERVER_TIME = datetime(2026, 11, 18, 12, 0, 0, tzinfo=timezone.utc)
NODE_ID = "MATH.FRAC.ADD_UNLIKE"
ITEM_IDS = [str(uuid.UUID(int=i + 1)) for i in range(6)]
RETIRED_ITEM_ID = str(uuid.UUID(int=999))
ATTEMPT_LOG = Path(__file__).resolve().parents[3] / "shared" / "testdata" / "attempt_log.json"


def pytest_collection_modifyitems(config, items):
    if shutil.which("node") is None:
        skip = pytest.mark.skip(reason="node is required for the engine sidecar")
        for item in items:
            if "sync" in item.nodeid:
                item.add_marker(skip)


def make_db():
    engine = create_engine(
        "sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    session.add(SkillNode(
        node_id=NODE_ID, subject="MATH", topic="FRAC", title="Add unlike", learner_title="Add unlike",
        description="d", est_minutes=10, status="live",
    ))
    session.flush()
    for item_id in ITEM_IDS + [RETIRED_ITEM_ID]:
        session.add(Item(
            item_id=item_id, node_id=NODE_ID, type="mcq_single", difficulty_tier=1, stem=[], payload={},
            scoring={}, hints=[], worked_solution=[], a11y={},
            status="retired" if item_id == RETIRED_ITEM_ID else "live",
        ))
    session.commit()
    return session


@pytest.fixture
def db():
    session = make_db()
    yield session
    session.close()


@pytest.fixture
def fresh_db():
    """Factory for a second, independent database (SQLite SAVEPOINTs make rollback unreliable here)."""
    made = []

    def _make():
        s = make_db()
        made.append(s)
        return s

    yield _make
    for s in made:
        s.close()


def iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def make_attempt(n: int, *, learner="learner-a", item_id=None, occurred=None, correct=True, tier=1, **kw):
    occurred = occurred or SERVER_TIME - timedelta(hours=2) + timedelta(minutes=n)
    attempt = {
        "attempt_id": str(uuid.UUID(int=10_000 + n)),
        "learner_id": learner,
        "node_id": NODE_ID,
        "item_id": item_id or ITEM_IDS[n % len(ITEM_IDS)],
        "difficulty_tier": tier,
        "correct": correct,
        "partial_credit": 1.0 if correct else 0.0,
        "selected_option": "A",
        "misconception_id": None,
        "latency_ms": 9000,
        "hints_used": 0,
        "session_id": str(uuid.UUID(int=77)),
        "occurred_at": iso(occurred),
        "is_review": False,
        "is_placement": False,
        "is_exam": False,
    }
    attempt.update(kw)
    return attempt


@pytest.fixture
def attempt_log():
    return json.loads(ATTEMPT_LOG.read_text(encoding="utf8"))["attempts"]
