"""Cross-framework cohort comparison analytics.

Source of truth:
- docs/plan.md §2.12, §5

Rule:
Analytics that compare cohorts read strictly from framework_cohort_stats.
No join in the query path touches skill_nodes or items — those are country-agnostic.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models.framework import FrameworkCohortStats
from backend.app.schemas.framework import (
    FrameworkCohortStatItem,
    FrameworkCompareResponse,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def get_db():
    raise NotImplementedError("Database session dependency must be overridden.")


def require_admin(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """Admin RBAC gate for cross-framework analytics."""
    if x_user_role not in ("admin", "curriculum_lead"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin or Curriculum Lead role required.",
        )
    return x_user_role


@router.get("/frameworks/compare", response_model=FrameworkCompareResponse)
def compare_framework_cohorts(
    framework_ids: Optional[List[str]] = Query(None, alias="framework_id"),
    db: Session = Depends(get_db),
    actor: str = Depends(require_admin),
):
    """Compare cohorts across frameworks.
    
    Reads exclusively from framework_cohort_stats.
    Zero joins to skill_nodes, items, or content tables.
    """
    stmt = select(FrameworkCohortStats)
    if framework_ids:
        stmt = stmt.where(FrameworkCohortStats.framework_id.in_(framework_ids))

    stats_rows = db.scalars(
        stmt.order_by(FrameworkCohortStats.snapshot_date.desc())
    ).all()

    cohort_items = [
        FrameworkCohortStatItem(
            framework_id=row.framework_id,
            snapshot_date=row.snapshot_date,
            active_learners=row.active_learners,
            mean_mastery_rate=float(row.mean_mastery_rate),
            mean_retention_30d=float(row.mean_retention_30d),
            mean_success_band=float(row.mean_success_band),
            item_error_rate=float(row.item_error_rate),
        )
        for row in stats_rows
    ]

    return FrameworkCompareResponse(cohorts=cohort_items)


@router.get("/costs")
def get_ai_costs(
    framework_id: Optional[str] = Query(None),
    pipeline_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    actor: str = Depends(require_admin),
):
    """Retrieve Gemini AI generation costs and token usage."""
    from backend.app.services import cost_service

    if framework_id:
        return cost_service.cost_by_framework(framework_id, db=db)
    if pipeline_name:
        return cost_service.cost_by_pipeline(pipeline_name, db=db)
    return cost_service.get_cost_breakdown(db=db)

