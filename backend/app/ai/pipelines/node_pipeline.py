"""Pipeline A1 — Skill Node Authoring.

Source of truth:
- docs/plan.md §3.1
- docs/02-curriculum-framework-spec.md §2.1 (Atomicity test)
- Task 8 §8.4
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from backend.app.db.base import get_db_context
from backend.app.db.models.content import SkillNode, Misconception, MisconceptionNode
from backend.app.ai.gemini import GeminiClient


class AtomicityTestError(ValueError):
    """Raised when a candidate SkillNode fails the strict Atomicity Test (doc 02 §2.1)."""
    pass


def validate_node_atomicity(node_dict: Dict[str, Any]) -> None:
    """Validate a candidate SkillNode against doc 02 §2.1 atomicity requirements.
    
    Rejects if:
    - est_minutes not in [8, 15]
    - fewer than 2 named misconceptions
    - candidate_item_capacity < 20 (cannot support >= 20 distinct items)
    """
    est_minutes = node_dict.get("est_minutes")
    if est_minutes is None or not (8 <= est_minutes <= 15):
        raise AtomicityTestError(
            f"Atomicity test failed for node '{node_dict.get('node_id')}': "
            f"est_minutes ({est_minutes}) must be between 8 and 15 inclusive."
        )

    misconceptions = node_dict.get("misconceptions", [])
    if len(misconceptions) < 2:
        raise AtomicityTestError(
            f"Atomicity test failed for node '{node_dict.get('node_id')}': "
            f"must have at least 2 named misconceptions, got {len(misconceptions)}."
        )

    capacity = node_dict.get("candidate_item_capacity", 0)
    if capacity < 20:
        raise AtomicityTestError(
            f"Atomicity test failed for node '{node_dict.get('node_id')}': "
            f"must support at least 20 candidate items, got capacity {capacity}."
        )


def author_nodes(
    subject: str,
    topic: str,
    actor_id: str,
    context: str = "",
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> List[SkillNode]:
    """Pipeline A1: Proposes candidate SkillNodes, enforces atomicity, stages as status='draft'.
    
    Never auto-publishes. Enqueues for human review.
    """
    client = gemini_client or GeminiClient()

    def _persist(session: Session) -> List[SkillNode]:
        # 1. Call Gemini via node_authoring prompt
        variables = {
            "subject": subject,
            "topic": topic,
            "context": context or f"Standard curriculum topics for {subject} - {topic}",
        }

        response = client.generate_json(
            prompt_name="node_authoring",
            variables=variables,
            job_id=job_id,
            db=session,
        )

        candidate_nodes = response.get("nodes", [])
        created_nodes = []
        for candidate in candidate_nodes:
            # 2. Reject nodes failing atomicity test
            validate_node_atomicity(candidate)


            # Check if node already exists (idempotency)
            existing = session.query(SkillNode).filter(SkillNode.node_id == candidate["node_id"]).first()
            if existing:
                created_nodes.append(existing)
                continue

            node = SkillNode(
                node_id=candidate["node_id"],
                subject=candidate.get("subject", subject),
                topic=candidate.get("topic", topic),
                subtopic=candidate.get("subtopic"),
                title=candidate["title"],
                learner_title=candidate["learner_title"],
                description=candidate["description"],
                grade_band_hint=candidate.get("grade_band_hint"),
                est_minutes=candidate["est_minutes"],
                representations=candidate.get("representations", []),
                status="draft",  # Human review required
            )
            session.add(node)

            # Persist misconceptions
            for misc in candidate.get("misconceptions", []):
                misc_id = misc["id"]
                existing_misc = session.query(Misconception).filter(Misconception.misconception_id == misc_id).first()
                if not existing_misc:
                    new_misc = Misconception(
                        misconception_id=misc_id,
                        domain=candidate.get("topic", topic),
                        description=misc.get("description", ""),
                        learner_facing_name=misc.get("learner_facing_name", misc_id),
                    )
                    session.add(new_misc)

                # Link misconception to node
                link = (
                    session.query(MisconceptionNode)
                    .filter(
                        MisconceptionNode.misconception_id == misc_id,
                        MisconceptionNode.node_id == node.node_id,
                    )
                    .first()
                )
                if not link:
                    session.add(MisconceptionNode(misconception_id=misc_id, node_id=node.node_id))

            created_nodes.append(node)

        session.commit()
        for n in created_nodes:
            session.refresh(n)
        return created_nodes

    if db is not None:
        return _persist(db)
    with get_db_context() as session:
        return _persist(session)
