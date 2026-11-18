"""FastAPI routes for Curriculum Frameworks and Countries.

Source of truth:
- docs/plan.md §5
- docs/02-curriculum-framework-spec.md §5, §9
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Header, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    LocalizationBrief,
    SyllabusObjective,
)
from backend.app.schemas.framework import (
    CountryResponse,
    CoverageReportResponse,
    CurriculumFrameworkCreate,
    CurriculumFrameworkResponse,
    LocalizationBriefResponse,
    ObjectiveMappingRequest,
)
from backend.app.services.framework_service import (
    BulkMappingProhibitedError,
    CoverageGateError,
    FrameworkNotFoundError,
    activate_framework,
    compute_coverage,
    create_framework,
    import_objectives,
    map_objective,
    supersede_framework,
)

router = APIRouter(prefix="/api", tags=["frameworks"])


# Simple DB dependency placeholder / mock hook for unit testing
def get_db():
    raise NotImplementedError("Database session dependency must be overridden in test/app harness.")


def require_curriculum_lead(x_user_role: Optional[str] = Header(None, alias="X-User-Role")):
    """RBAC gate requiring curriculum_lead role for write operations."""
    if x_user_role not in ("curriculum_lead", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Requires curriculum_lead role.",
        )
    return x_user_role


@router.get("/countries", response_model=List[CountryResponse])
def list_countries(db: Session = Depends(get_db)):
    """List registered countries and their status."""
    return db.scalars(select(Country)).all()


@router.get("/frameworks", response_model=List[CurriculumFrameworkResponse])
def list_frameworks(
    country: Optional[str] = Query(None, alias="country", min_length=2, max_length=2),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
):
    """List frameworks, optionally filtered by country or status."""
    stmt = select(CurriculumFramework)
    if country:
        stmt = stmt.where(CurriculumFramework.country_code == country.upper())
    if status_filter:
        stmt = stmt.where(CurriculumFramework.status == status_filter)
    return db.scalars(stmt).all()


@router.get("/frameworks/{framework_id}", response_model=CurriculumFrameworkResponse)
def get_framework(framework_id: str, db: Session = Depends(get_db)):
    """Get full framework detail."""
    fw = db.get(CurriculumFramework, framework_id)
    if not fw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Framework not found.")
    return fw


@router.get("/frameworks/{framework_id}/coverage", response_model=CoverageReportResponse)
def get_framework_coverage(framework_id: str, db: Session = Depends(get_db)):
    """Get framework coverage report."""
    fw = db.get(CurriculumFramework, framework_id)
    if not fw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Framework not found.")

    objectives = db.scalars(
        select(SyllabusObjective).where(SyllabusObjective.framework_id == framework_id)
    ).all()
    total = len(objectives)
    coverage_pct = compute_coverage(db, framework_id)
    covered = int(round((coverage_pct / 100.0) * total)) if total > 0 else 0
    unmapped = total - covered

    return CoverageReportResponse(
        framework_id=framework_id,
        total_objectives=total,
        covered_objectives=covered,
        unmapped_objectives=unmapped,
        coverage_pct=coverage_pct,
        is_activatable=coverage_pct >= 80.0,
    )


@router.get("/frameworks/{framework_id}/localization-brief", response_model=LocalizationBriefResponse)
def get_localization_brief(framework_id: str, db: Session = Depends(get_db)):
    """Get localization brief for a framework."""
    brief = db.get(LocalizationBrief, framework_id)
    if not brief:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Localization brief not found.")
    return brief


@router.post("/frameworks/import", response_model=CurriculumFrameworkResponse)
def import_new_framework(
    payload: CurriculumFrameworkCreate,
    db: Session = Depends(get_db),
    actor: str = Depends(require_curriculum_lead),
):
    """Import and create a new framework in draft status (curriculum_lead only)."""
    fw = create_framework(
        db=db,
        framework_id=payload.framework_id,
        country_code=payload.country_code,
        board=payload.board,
        subject=payload.subject,
        version=payload.version,
        locale=payload.locale,
        currency=payload.currency,
        effective_from=payload.effective_from,
        effective_until=payload.effective_until,
        grading_scale=payload.grading_scale,
        exam_structure=payload.exam_structure,
        grade_bands=[gb.model_dump() for gb in payload.grade_bands] if payload.grade_bands else None,
    )
    db.commit()
    db.refresh(fw)
    return fw


@router.post("/frameworks/{framework_id}/map-objective")
def map_single_objective(
    framework_id: str,
    payload: ObjectiveMappingRequest,
    db: Session = Depends(get_db),
    actor: str = Depends(require_curriculum_lead),
):
    """Map a single syllabus objective to a canonical node (no bulk approve)."""
    try:
        mapping = map_objective(db, payload.objective_id, payload.node_id, actor)
        db.commit()
        return {"status": "mapped", "objective_id": mapping.objective_id, "node_id": mapping.node_id}
    except BulkMappingProhibitedError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/frameworks/{framework_id}/activate", response_model=CurriculumFrameworkResponse)
def activate_framework_endpoint(
    framework_id: str,
    db: Session = Depends(get_db),
    actor: str = Depends(require_curriculum_lead),
):
    """Activate a framework. Gated on coverage >= 80%."""
    try:
        fw = activate_framework(db, framework_id, actor)
        db.commit()
        db.refresh(fw)
        return fw
    except CoverageGateError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except FrameworkNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/frameworks/{framework_id}/supersede")
def supersede_framework_endpoint(
    framework_id: str,
    new_framework_id: str = Query(...),
    reason: str = Query("version_upgrade"),
    db: Session = Depends(get_db),
    actor: str = Depends(require_curriculum_lead),
):
    """Supersede an existing framework with a newer version. Generates diff report."""
    try:
        diff = supersede_framework(db, framework_id, new_framework_id, actor, reason=reason)
        db.commit()
        return {
            "status": "superseded",
            "from_framework": framework_id,
            "to_framework": new_framework_id,
            "diff_id": diff.id,
        }
    except FrameworkNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
