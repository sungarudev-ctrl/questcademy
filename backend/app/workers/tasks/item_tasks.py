"""Celery tasks for Item Generation and Localization (Pipeline B).

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5
"""

from typing import Any, Dict, List, Optional
from backend.app.workers.celery_app import celery_app
from backend.app.workers.job_recorder import create_generation_job, update_job_status
from backend.app.workers.limiter import acquire_rate_limit
from backend.app.ai.pipelines.item_pipeline import generate_items


@celery_app.task(bind=True, max_retries=3)
def task_generate_items(
    self,
    node_id: str,
    count: int = 20,
    actor_id: Optional[str] = None,
) -> List[str]:
    """Celery task generating items for a SkillNode (Pipeline B).
    
    Queue: items (5/min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="generate_items",
        target_id=node_id,
        job_metadata={"actor_id": actor_id, "node_id": node_id, "count": count},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("items")
        items = generate_items(
            node_id=node_id,
            count=count,
            actor_id=actor_id,
            job_id=job.job_id,
        )
        item_ids = [it.item_id for it in items]
        update_job_status(job.job_id, status="completed")
        return item_ids
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 30
        raise self.retry(exc=exc, countdown=countdown)
