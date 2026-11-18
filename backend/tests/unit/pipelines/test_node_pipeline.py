"""Unit tests for Pipeline A1 (Node Authoring).

Source of truth:
- docs/plan.md §3.1
- docs/02-curriculum-framework-spec.md §2.1
- Task 8 §8.9
"""

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from backend.app.db.base import Base
from backend.app.db.models.content import SkillNode, Misconception
from backend.app.ai.pipelines.node_pipeline import (
    author_nodes,
    validate_node_atomicity,
    AtomicityTestError,
)
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """In-memory SQLite session with full schema."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()
    yield session
    session.close()
    Base.metadata.drop_all(engine)


def test_atomicity_rejection_est_minutes():
    """Reject nodes whose estimated duration is not in [8, 15] minutes."""
    # Case 1: est_minutes = 5
    invalid_node_short = {
        "node_id": "MATH.TEST.TOO_SHORT",
        "est_minutes": 5,
        "misconceptions": [{"id": "M1", "description": ""}, {"id": "M2", "description": ""}],
        "candidate_item_capacity": 25,
    }
    with pytest.raises(AtomicityTestError) as exc:
        validate_node_atomicity(invalid_node_short)
    assert "est_minutes (5) must be between 8 and 15" in str(exc.value)

    # Case 2: est_minutes = 20
    invalid_node_long = {
        "node_id": "MATH.TEST.TOO_LONG",
        "est_minutes": 20,
        "misconceptions": [{"id": "M1", "description": ""}, {"id": "M2", "description": ""}],
        "candidate_item_capacity": 25,
    }
    with pytest.raises(AtomicityTestError) as exc:
        validate_node_atomicity(invalid_node_long)
    assert "est_minutes (20) must be between 8 and 15" in str(exc.value)


def test_atomicity_rejection_fewer_than_two_misconceptions():
    """Reject nodes with fewer than 2 named misconceptions."""
    invalid_node_one_misc = {
        "node_id": "MATH.TEST.ONE_MISC",
        "est_minutes": 10,
        "misconceptions": [{"id": "M1", "description": ""}],
        "candidate_item_capacity": 25,
    }
    with pytest.raises(AtomicityTestError) as exc:
        validate_node_atomicity(invalid_node_one_misc)
    assert "must have at least 2 named misconceptions" in str(exc.value)


def test_atomicity_rejection_low_candidate_item_capacity():
    """Reject nodes that cannot support at least 20 candidate items."""
    invalid_node_low_capacity = {
        "node_id": "MATH.TEST.LOW_CAPACITY",
        "est_minutes": 12,
        "misconceptions": [{"id": "M1", "description": ""}, {"id": "M2", "description": ""}],
        "candidate_item_capacity": 15,
    }
    with pytest.raises(AtomicityTestError) as exc:
        validate_node_atomicity(invalid_node_low_capacity)
    assert "must support at least 20 candidate items" in str(exc.value)


def test_author_nodes_persists_valid_nodes_as_draft(db_session: Session):
    """Pipeline A1: Valid node passes atomicity and persists as status='draft'."""
    mock_payload = {
        "nodes": [
            {
                "node_id": "MATH.FRAC.ADD_LIKE_DENOM",
                "subject": "Mathematics",
                "topic": "Fractions",
                "subtopic": "Addition",
                "title": "Add Fractions with Like Denominators",
                "learner_title": "Adding Like Fractions",
                "description": "Add numerators when denominators are identical.",
                "grade_band_hint": "JSS1",
                "est_minutes": 10,
                "representations": ["area_model", "symbolic"],
                "misconceptions": [
                    {
                        "id": "FRAC.ADD_NUM_AND_DENOM",
                        "description": "Adds both numerators and denominators.",
                        "learner_facing_name": "Adding bottom numbers",
                    },
                    {
                        "id": "FRAC.DENOM_ONLY",
                        "description": "Keeps numerator and adds denominators.",
                        "learner_facing_name": "Changing bottom number",
                    },
                ],
                "candidate_item_capacity": 30,
            }
        ]
    }

    def fake_responder(model, prompt_name, prompt_version, system_instruction, user_prompt, variables):
        assert prompt_name == "node_authoring"
        return mock_payload, 500, 400

    gemini.set_mock_responder(fake_responder)
    try:
        nodes = author_nodes(
            subject="Mathematics",
            topic="Fractions",
            actor_id="lead-001",
            db=db_session,
        )

        assert len(nodes) == 1
        node = nodes[0]
        assert node.node_id == "MATH.FRAC.ADD_LIKE_DENOM"
        assert node.status == "draft"  # Must NOT be auto-published!
        assert node.est_minutes == 10

        # Check misconceptions persisted
        misc = db_session.query(Misconception).filter(Misconception.misconception_id == "FRAC.ADD_NUM_AND_DENOM").first()
        assert misc is not None
        assert misc.learner_facing_name == "Adding bottom numbers"

        # Check idempotency: running again returns existing node without error
        nodes2 = author_nodes(
            subject="Mathematics",
            topic="Fractions",
            actor_id="lead-001",
            db=db_session,
        )
        assert len(nodes2) == 1
        assert nodes2[0].node_id == "MATH.FRAC.ADD_LIKE_DENOM"

        total_nodes = db_session.query(SkillNode).count()
        assert total_nodes == 1
    finally:
        gemini.clear_mock_responder()
