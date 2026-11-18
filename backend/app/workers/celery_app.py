"""Celery application configuration and queue routing.

Source of truth:
- docs/plan.md §3.5
- Task 8 §8.5
"""

import os
from celery import Celery

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/1")

celery_app = Celery(
    "questcademy_pipelines",
    broker=REDIS_URL,
    backend=REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_default_queue="authoring",
    task_routes={
        "backend.app.workers.tasks.node_tasks.*": {"queue": "authoring"},
        "backend.app.workers.tasks.content_tasks.task_generate_content_canonical": {"queue": "authoring"},
        "backend.app.workers.tasks.content_tasks.task_generate_content_localized": {"queue": "localization"},
        "backend.app.workers.tasks.item_tasks.*": {"queue": "items"},
        "backend.app.workers.tasks.framework_tasks.*": {"queue": "framework"},
        "backend.app.workers.tasks.localization_tasks.*": {"queue": "localization"},
        "backend.app.workers.tasks.embed_tasks.*": {"queue": "embed"},
    },
)
