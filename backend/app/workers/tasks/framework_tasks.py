"""Celery tasks for Framework Extraction, Mapping Proposals, and Coverage (Pipeline C).

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5
"""

from typing import Any, Dict, List, Optional
from backend.app.workers.celery_app import celery_app
from backend.app.workers.job_recorder import create_generation_job, update_job_status
from backend.app.workers.limiter import acquire_rate_limit
from backend.app.ai.pipelines.framework_pipeline import (
    extract_objectives,
    map_objectives,
    get_framework_coverage,
)


@celery_app.task(bind=True, max_retries=3)
def task_extract_objectives(
    self,
    framework_id: str,
    source_text: str,
    actor_id: str,
    grade_bands: str = "JSS1, JSS2, JSS3",
) -> List[str]:
    """Celery task extracting syllabus objectives from syllabus source.
    
    Queue: framework (1/5min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="extract_objectives",
        target_id=framework_id,
        job_metadata={"actor_id": actor_id, "framework_id": framework_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("framework")
        objs = extract_objectives(
            framework_id=framework_id,
            source=source_text,
            actor_id=actor_id,
            grade_bands=grade_bands,
            job_id=job.job_id,
        )
        obj_ids = [o.objective_id for o in objs]
        update_job_status(job.job_id, status="completed")
        return obj_ids
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 120
        raise self.retry(exc=exc, countdown=countdown)


@celery_app.task(bind=True, max_retries=3)
def task_map_objectives(
    self,
    framework_id: str,
    actor_id: str,
) -> List[str]:
    """Celery task generating mapping proposals for a framework.
    
    Queue: framework (1/5min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="map_objectives",
        target_id=framework_id,
        job_metadata={"actor_id": actor_id, "framework_id": framework_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("framework")
        proposals = map_objectives(
            framework_id=framework_id,
            actor_id=actor_id,
            job_id=job.job_id,
        )
        prop_ids = [p.id for p in proposals]
        update_job_status(job.job_id, status="completed")
        return prop_ids
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 120
        raise self.retry(exc=exc, countdown=countdown)


@celery_app.task(bind=True, max_retries=3)
def task_compute_coverage(
    self,
    framework_id: str,
) -> Dict[str, Any]:
    """Celery task computing curriculum coverage report for a framework.
    
    Queue: framework (1/5min)
    Records generation_jobs row.
    """
    job = create_generation_job(
        job_type="compute_coverage",
        target_id=framework_id,
        job_metadata={"framework_id": framework_id},
    )
    update_job_status(job.job_id, status="running")

    try:
        acquire_rate_limit("framework")
        report = get_framework_coverage(framework_id=framework_id)
        update_job_status(job.job_id, status="completed")
        return {
            "framework_id": report.framework_id,
            "coverage_pct": report.coverage_pct,
            "eligible_for_activation": report.eligible_for_activation,
            "total_objectives": report.total_objectives,
            "covered_objectives": report.covered_objectives,
        }
    except Exception as exc:
        update_job_status(job.job_id, status="failed", error=str(exc))
        countdown = 2 ** self.request.retries * 60
        raise self.retry(exc=exc, countdown=countdown)
