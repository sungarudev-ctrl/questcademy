"""Celery tasks for Lesson Content Authoring (Pipeline A2).

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5
"""

from typing import Any, Dict, Optional
from backend.app.workers.celery_app import celery_app
from backend.app.workers.job_recorder import create_generation_job, update_job_status
from backend.app.workers.limiter import acquire_rate_limit
from backend.app.ai.pipelines.content_pipeline import (
    generate_content_canonical,
    generate_content_localized,
)


@celery_app.task(bind=True, max_retries=3)
def task_generate_content_canonical(
    self,
    node_id: str,
    actor_id: str,
) -> str:
    """Celery task generating canonical lesson content (Pipeline A2 Mode 1).
    
    Queue: authoring (1/min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="content_canonical",
        target_id=node_id,
        job_metadata={"actor_id": actor_id, "node_id": node_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("authoring")
        content = generate_content_canonical(
            node_id=node_id,
            actor_id=actor_id,
            job_id=job.job_id,
        )
        update_job_status(job.job_id, status="completed")
        return content.id
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 60
        raise self.retry(exc=exc, countdown=countdown)


@celery_app.task(bind=True, max_retries=3)
def task_generate_content_localized(
    self,
    content_id: str,
    framework_id: str,
    actor_id: str,
) -> Dict[str, Any]:
    """Celery task generating localized lesson content overrides (Pipeline A2 Mode 2).
    
    Queue: localization (3/min)
    Records generation_jobs row.
    """
    target_id = f"{content_id}:{framework_id}"
    job = create_generation_job(
        job_type="content_localized",
        target_id=target_id,
        job_metadata={"actor_id": actor_id, "content_id": content_id, "framework_id": framework_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("localization")
        loc = generate_content_localized(
            content_id=content_id,
            framework_id=framework_id,
            actor_id=actor_id,
            job_id=job.job_id,
        )
        update_job_status(job.job_id, status="completed")
        return {
            "content_id": loc.content_id,
            "framework_id": loc.framework_id,
            "review_status": loc.review_status,
        }
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 30
        raise self.retry(exc=exc, countdown=countdown)
