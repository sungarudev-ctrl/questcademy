"""Job recorder tracking Celery task execution in generation_jobs table.

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5, §8.10
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from backend.app.db.base import get_db_context
from backend.app.db.models.framework import GenerationJob


def create_generation_job(
    job_type: str,
    target_id: str,
    job_metadata: Optional[Dict[str, Any]] = None,
    db: Optional[Session] = None,
) -> GenerationJob:
    """Create and persist a new generation_jobs entry in 'queued' status."""
    def _create(session: Session) -> GenerationJob:
        job = GenerationJob(
            job_id=str(uuid.uuid4()),
            job_type=job_type,
            target_id=target_id,
            status="queued",
            job_metadata=job_metadata or {},
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job

    if db is not None:
        return _create(db)
    with get_db_context() as session:
        return _create(session)


def update_job_status(
    job_id: str,
    status: str,
    error: Optional[str] = None,
    db: Optional[Session] = None,
) -> Optional[GenerationJob]:
    """Update status, error, and timestamps of a generation_jobs entry."""
    def _update(session: Session) -> Optional[GenerationJob]:
        job = session.query(GenerationJob).filter(GenerationJob.job_id == job_id).first()
        if not job:
            return None

        job.status = status
        if error:
            job.error = error

        now = datetime.now(timezone.utc)
        if status == "running" and not job.started_at:
            job.started_at = now
        elif status in ("completed", "failed"):
            job.completed_at = now

        session.commit()
        session.refresh(job)
        return job

    if db is not None:
        return _update(db)
    with get_db_context() as session:
        return _update(session)
