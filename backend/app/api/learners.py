"""FastAPI endpoints for learner framework pinning and migration audit.

Source of truth:
- docs/plan.md §2.13, §5
- docs/02-curriculum-framework-spec.md §5
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models.framework import LearnerFrameworkPin, LearnerPinMigration
from backend.app.schemas.framework import ChangeFrameworkRequest, PinMigrationResponse
from backend.app.services.framework_service import (
    FrameworkNotFoundError,
    migrate_learner_pin,
)

router = APIRouter(prefix="/api/learners", tags=["learners"])


def get_db():
    raise NotImplementedError("Database session dependency must be overridden.")


@router.post("/{learner_id}/change-framework", response_model=PinMigrationResponse)
def change_learner_framework(
    learner_id: str,
    payload: ChangeFrameworkRequest,
    db: Session = Depends(get_db),
):
    """Changes a learner's framework pin.
    
    Invariant I-11: Pin migration NEVER mutates learner_node_state.
    Mastery is on canonical nodes; pins are on frameworks.
    """
    try:
        migration = migrate_learner_pin(
            db=db,
            learner_id=learner_id,
            to_framework_id=payload.to_framework_id,
            reason=payload.reason,
            actor=payload.actor,
        )
        db.commit()
        db.refresh(migration)
        return migration
    except FrameworkNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{learner_id}/framework-history")
def get_learner_framework_history(
    learner_id: str,
    db: Session = Depends(get_db),
):
    """Retrieves full audit history of framework pins and pin migrations for a learner."""
    current_pins = db.scalars(
        select(LearnerFrameworkPin).where(LearnerFrameworkPin.learner_id == learner_id)
    ).all()

    migrations = db.scalars(
        select(LearnerPinMigration)
        .where(LearnerPinMigration.learner_id == learner_id)
        .order_by(LearnerPinMigration.migrated_at.desc())
    ).all()

    return {
        "learner_id": learner_id,
        "current_pins": [
            {"framework_id": pin.framework_id, "pinned_at": pin.pinned_at}
            for pin in current_pins
        ],
        "migration_history": [
            {
                "id": m.id,
                "from_framework": m.from_framework,
                "to_framework": m.to_framework,
                "reason": m.reason,
                "mastery_preserved": m.mastery_preserved,
                "migrated_at": m.migrated_at,
            }
            for m in migrations
        ],
    }
