"""API package."""
from backend.app.api.frameworks import router as frameworks_router
from backend.app.api.learners import router as learners_router
from backend.app.api.analytics import router as analytics_router
from backend.app.api.admin import router as admin_router

__all__ = [
    "frameworks_router",
    "learners_router",
    "analytics_router",
    "admin_router",
]

