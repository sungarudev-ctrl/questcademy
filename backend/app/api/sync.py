"""Sync endpoints. Source of truth: docs/sync-contract.md §2.

Auth is a dependency to be overridden by the Task 13 auth layer; it must return
{"learner_ids": [...]} — the set of learner profiles this device account may act for
(profile switch, §5).
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.services import sync_service
from backend.app.services.engine_bridge import EngineBridgeError

router = APIRouter(prefix="/api/sync", tags=["sync"])

CURSOR_VERSION = 1


def get_db():
    raise NotImplementedError("Database session dependency must be overridden.")


def get_principal() -> Dict[str, Any]:
    raise NotImplementedError("Auth dependency must be overridden (Task 13).")


class SyncAttemptsRequest(BaseModel):
    attempts: List[Dict[str, Any]] = Field(max_length=500)
    local_states: Optional[Dict[str, Dict[str, Dict[str, Any]]]] = None


class SyncStateRequest(BaseModel):
    learner_id: str
    since: Optional[str] = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/attempts")
def post_attempts(
    body: SyncAttemptsRequest,
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_principal),
):
    try:
        result = sync_service.sync_attempts(
            db,
            body.attempts,
            server_time=_now(),
            authorized_learner_ids=set(principal["learner_ids"]),
            local_states=body.local_states,
        )
        db.commit()
    except EngineBridgeError as exc:
        db.rollback()
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    return {
        "applied": result.applied,
        "duplicates": result.duplicates,
        "rejected": result.rejected,
        "state": result.states,
        "telemetry": result.telemetry,
    }


@router.post("/state")
def post_state(
    body: SyncStateRequest,
    db: Session = Depends(get_db),
    principal: Dict[str, Any] = Depends(get_principal),
):
    if body.learner_id not in principal["learner_ids"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="learner_not_authorized")
    snapshot = sync_service.state_since(db, body.learner_id, body.since)
    return {"state": snapshot["nodes"], "latest_attempt_at": snapshot["latest_attempt_at"]}


@router.get("/cursor")
def get_cursor(principal: Dict[str, Any] = Depends(get_principal)):
    return {"server_time": _now().strftime("%Y-%m-%dT%H:%M:%SZ"), "cursor_version": CURSOR_VERSION}
