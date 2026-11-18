"""Celery tasks for Skill Node Authoring (Pipeline A1).

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5
"""

from typing import Any, Dict, List, Optional
from backend.app.workers.celery_app import celery_app
from backend.app.workers.job_recorder import create_generation_job, update_job_status
from backend.app.workers.limiter import acquire_rate_limit
from backend.app.ai.pipelines.node_pipeline import author_nodes


@celery_app.task(bind=True, max_retries=3)
def task_author_nodes(
    self,
    subject: str,
    topic: str,
    actor_id: str,
    context: str = "",
    db: Optional[Any] = None,
) -> List[str]:
    """Celery task executing Pipeline A1 (node authoring).
    
    Queue: authoring (1/min)
    Records generation_jobs row.
    """
    target_id = f"{subject}:{topic}"
    job = create_generation_job(
        job_type="author_nodes",
        target_id=target_id,
        job_metadata={"actor_id": actor_id, "subject": subject, "topic": topic},
        db=db,
    )
    update_job_status(job.job_id, status="running", db=db)

    try:
        acquire_rate_limit("authoring")
        nodes = author_nodes(
            subject=subject,
            topic=topic,
            actor_id=actor_id,
            context=context,
            job_id=job.job_id,
            db=db,
        )
        node_ids = [n.node_id for n in nodes]
        update_job_status(job.job_id, status="completed", db=db)
        return node_ids
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc), db=db)
        countdown = 2 ** self.request.retries * 60
        raise self.retry(exc=exc, countdown=countdown)
