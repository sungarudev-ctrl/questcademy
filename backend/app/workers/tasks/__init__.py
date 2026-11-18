"""Workers tasks package."""
from backend.app.workers.tasks.node_tasks import task_author_nodes
from backend.app.workers.tasks.content_tasks import (
    task_generate_content_canonical,
    task_generate_content_localized,
)
from backend.app.workers.tasks.item_tasks import task_generate_items
from backend.app.workers.tasks.framework_tasks import (
    task_extract_objectives,
    task_map_objectives,
    task_compute_coverage,
)
from backend.app.workers.tasks.localization_tasks import task_refresh_localization
from backend.app.workers.tasks.embed_tasks import (
    task_embed_content,
    task_embed_item,
    task_embed_localized_content,
)

__all__ = [
    "task_author_nodes",
    "task_generate_content_canonical",
    "task_generate_content_localized",
    "task_generate_items",
    "task_extract_objectives",
    "task_map_objectives",
    "task_compute_coverage",
    "task_refresh_localization",
    "task_embed_content",
    "task_embed_item",
    "task_embed_localized_content",
]
