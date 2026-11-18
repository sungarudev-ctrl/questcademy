"""Celery tasks for Localization Refresh (Pipeline D).

Source of truth:
- docs/plan.md §3.4 (Pipeline D), §3.5
- Task 8 §8.5
"""

from typing import Any, Dict
from backend.app.workers.celery_app import celery_app
from backend.app.workers.job_recorder import create_generation_job, update_job_status
from backend.app.workers.limiter import acquire_rate_limit
from backend.app.ai.pipelines.localization_pipeline import refresh_localization


@celery_app.task(bind=True, max_retries=3)
def task_refresh_localization(
    self,
    framework_id: str,
    actor_id: str,
) -> Dict[str, Any]:
    """Celery task refreshing all localizations for a framework against updated brief (Pipeline D).
    
    Queue: localization (2/min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="refresh_localization",
        target_id=framework_id,
        job_metadata={"actor_id": actor_id, "framework_id": framework_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("localization")
        result = refresh_localization(
            framework_id=framework_id,
            actor_id=actor_id,
            job_id=job.job_id,
        )
        update_job_status(job.job_id, status="completed")
        return result
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 30
        raise self.retry(exc=exc, countdown=countdown)
