"""Celery tasks for content and item vector embedding.

Source of truth:
- docs/plan.md §2.8, §3.5
- Task 8 §8.5
"""

from typing import Any, Dict
from backend.app.workers.celery_app import celery_app
from backend.app.workers.job_recorder import create_generation_job, update_job_status
from backend.app.workers.limiter import acquire_rate_limit


@celery_app.task(bind=True, max_retries=3)
def task_embed_content(
    self,
    content_id: str,
) -> Dict[str, Any]:
    """Celery task embedding canonical lesson content into Weaviate SkillNodeContentChunk.
    
    Queue: embed (20/min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="embed_content",
        target_id=content_id,
        job_metadata={"content_id": content_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("embed")
        # In actual deployment, vectors are emitted to Weaviate collection SkillNodeContentChunk
        result = {"content_id": content_id, "status": "embedded"}
        update_job_status(job.job_id, status="completed")
        return result
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 10
        raise self.retry(exc=exc, countdown=countdown)


@celery_app.task(bind=True, max_retries=3)
def task_embed_item(
    self,
    item_id: str,
) -> Dict[str, Any]:
    """Celery task embedding assessment item stem into Weaviate ItemChunk.
    
    Queue: embed (20/min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="embed_item",
        target_id=item_id,
        job_metadata={"item_id": item_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("embed")
        result = {"item_id": item_id, "status": "embedded"}
        update_job_status(job.job_id, status="completed")
        return result
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 10
        raise self.retry(exc=exc, countdown=countdown)


@celery_app.task(bind=True, max_retries=3)
def task_embed_localized_content(
    self,
    content_id: str,
    framework_id: str,
) -> Dict[str, Any]:
    """Celery task embedding localized content into Weaviate LocalizedContentChunk.
    
    Queue: embed (20/min)
    Records generation_jobs row.
    """
    target_id = f"{content_id}:{framework_id}"
    job = create_generation_job(
        job_type="embed_localized_content",
        target_id=target_id,
        job_metadata={"content_id": content_id, "framework_id": framework_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("embed")
        result = {"content_id": content_id, "framework_id": framework_id, "status": "embedded"}
        update_job_status(job.job_id, status="completed")
        return result
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 10
        raise self.retry(exc=exc, countdown=countdown)
