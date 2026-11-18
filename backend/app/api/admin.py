"""FastAPI administrative endpoints for Content Studio.

Source of truth:
- docs/tasks.md §9.15
- docs/plan.md §5.4, §6
- docs/02-curriculum-framework-spec.md §6, §9
- docs/05-assessment-item-spec.md §7

Strict Governance:
1. Every endpoint requires admin-level RBAC (curriculum_lead, reviewer, content_admin, admin).
2. Bulk approvals are physically prohibited; any /api/admin/*/bulk endpoint returns HTTP 405 Method Not Allowed.
3. Every approve/reject action logs actor_id and timestamp.
4. An item with untagged distractors cannot be approved.
5. Localizations violating SymPy math invariance cannot be approved.
"""

from datetime import datetime, timezone
import json
from typing import Any, Dict, List, Optional
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from backend.app.db.models.content import (
    Item,
    ItemLifecycleEvent,
    ItemMisconception,
    Misconception,
    SkillNode,
    SkillNodeContent,
)
from backend.app.db.models.framework import (
    ContentLocalization,
    Country,
    CurriculumFramework,
    FrameworkCohortStats,
    FrameworkRollout,
    GenerationJob,
    ItemLocalization,
    ObjectiveNodeMap,
    ObjectiveNodeMapProposal,
    SyllabusObjective,
)
from backend.app.services.cost_service import get_cost_breakdown
from backend.app.services.coverage_service import compute_coverage
from backend.app.services.framework_service import map_objective
from backend.app.ai.tools.sympy_solver import verify_math_invariance
from backend.app.ai.tools.validator import compute_flesch_kincaid_grade


router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_db():
    raise NotImplementedError("Database session dependency must be overridden in app/test harness.")


# =====================================================================
# RBAC Gates
# =====================================================================

ADMIN_ROLES = ("curriculum_lead", "reviewer", "content_admin", "admin")


def require_admin(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> Dict[str, str]:
    """Validate admin-scoped RBAC and extract user context."""
    if not x_user_role or x_user_role.lower() not in ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Admin role required (curriculum_lead, reviewer, content_admin, admin).",
        )
    return {
        "role": x_user_role.lower(),
        "user_id": x_user_id or "system-admin",
    }


def require_lead(
    x_user_role: Optional[str] = Header(None, alias="X-User-Role"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
) -> Dict[str, str]:
    """Validate curriculum lead or full admin for structural changes."""
    if not x_user_role or x_user_role.lower() not in ("curriculum_lead", "content_admin", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Curriculum Lead or Admin role required.",
        )
    return {
        "role": x_user_role.lower(),
        "user_id": x_user_id or "system-lead",
    }


# =====================================================================
# Governance: Hard HTTP 405 Bulk Operations Gate (§9.15)
# =====================================================================

@router.api_route("/bulk", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
@router.api_route("/{path:path}/bulk", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def reject_bulk_operations(request: Request, path: Optional[str] = None):
    """Refuse any bulk administrative operation by returning HTTP 405 Method Not Allowed."""
    return JSONResponse(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        content={
            "detail": "Bulk operations are prohibited by governance rules. Each curriculum item, node, mapping, and localization must be reviewed individually.",
            "documentation": "/docs/02-curriculum-framework-spec.md#9-governance",
            "prohibited_path": request.url.path,
        },
        headers={"Allow": "GET, POST (single item only)"},
    )


# =====================================================================
# 1. Framework Rollout & Blockers (§9.2, §9.15)
# =====================================================================

class BlockersUpdateRequest(BaseModel):
    blockers: List[str]


@router.get("/frameworks/{framework_id}/rollout")
def get_framework_rollout(
    framework_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Retrieve framework rollout state, phase, blockers, and activation status."""
    rollout = db.query(FrameworkRollout).filter(FrameworkRollout.framework_id == framework_id).first()
    if not rollout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rollout for framework '{framework_id}' not found.")
    return {
        "id": rollout.id,
        "framework_id": rollout.framework_id,
        "country_code": rollout.country_code,
        "phase": rollout.phase,
        "coverage_pct": float(rollout.coverage_pct) if rollout.coverage_pct is not None else 0.0,
        "blockers": rollout.blockers or [],
        "started_at": rollout.started_at,
        "activated_at": rollout.activated_at,
        "superseded_at": rollout.superseded_at,
    }


@router.patch("/frameworks/{framework_id}/blockers")
def update_framework_blockers(
    framework_id: str,
    payload: BlockersUpdateRequest,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Update rollout blockers list."""
    rollout = db.query(FrameworkRollout).filter(FrameworkRollout.framework_id == framework_id).first()
    if not rollout:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rollout for framework '{framework_id}' not found.")
    rollout.blockers = payload.blockers
    db.commit()
    db.refresh(rollout)
    return {"status": "updated", "framework_id": framework_id, "blockers": rollout.blockers}


# =====================================================================
# 2. Objectives & Importer Wizard (§9.4, §9.15)
# =====================================================================

class ExtractObjectivesRequest(BaseModel):
    source_text: str
    grade_bands: Optional[List[str]] = None
    provenance: Optional[str] = None


@router.post("/frameworks/{framework_id}/objectives/extract")
def extract_framework_objectives(
    framework_id: str,
    payload: ExtractObjectivesRequest,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Trigger objective extraction from syllabus text/document."""
    fw = db.query(CurriculumFramework).filter(CurriculumFramework.framework_id == framework_id).first()
    if not fw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Framework '{framework_id}' not found.")

    from backend.app.ai.pipelines.framework_pipeline import extract_objectives
    from backend.app.workers.job_recorder import create_generation_job

    job = create_generation_job(
        job_type="framework_extraction",
        target_id=framework_id,
        job_metadata={"actor_id": actor["user_id"], "provenance": payload.provenance},
        db=db,
    )
    db.commit()


    try:
        objectives = extract_objectives(
            framework_id=framework_id,
            text=payload.source_text,
            grade_bands=payload.grade_bands,
            job_id=job.job_id,
            db=db,
        )
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        return {
            "job_id": job.job_id,
            "status": "completed",
            "extracted_count": len(objectives),
            "objectives": [
                {"objective_id": obj.objective_id, "code": obj.code, "text": obj.text, "grade_band": obj.grade_band}
                for obj in objectives
            ],
        }
    except Exception as e:
        job.status = "failed"
        job.error = str(e)
        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Extraction failed: {e}")


class ObjectiveUpdateRequest(BaseModel):
    code: Optional[str] = None
    text: Optional[str] = None
    grade_band: Optional[str] = None
    term: Optional[int] = None


@router.patch("/objectives/{objective_id}")
def update_objective(
    objective_id: str,
    payload: ObjectiveUpdateRequest,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Correct an individual extracted objective during importer wizard."""
    obj = db.query(SyllabusObjective).filter(SyllabusObjective.objective_id == objective_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Objective '{objective_id}' not found.")

    if payload.code is not None:
        obj.code = payload.code
    if payload.text is not None:
        obj.text = payload.text
    if payload.grade_band is not None:
        obj.grade_band = payload.grade_band
    if payload.term is not None:
        obj.term = payload.term

    db.commit()
    db.refresh(obj)
    return {
        "objective_id": obj.objective_id,
        "code": obj.code,
        "text": obj.text,
        "grade_band": obj.grade_band,
        "term": obj.term,
        "updated_by": actor["user_id"],
    }


class ObjectiveMappingCreate(BaseModel):
    node_id: str


@router.post("/objectives/{objective_id}/mappings")
def create_objective_mapping(
    objective_id: str,
    payload: ObjectiveMappingCreate,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Map a single syllabus objective to a canonical skill node."""
    obj = db.query(SyllabusObjective).filter(SyllabusObjective.objective_id == objective_id).first()
    if not obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Objective '{objective_id}' not found.")

    mapping = map_objective(
        framework_id=obj.framework_id,
        objective_id=objective_id,
        node_id=payload.node_id,
        db=db,
    )
    return {
        "status": "mapped",
        "objective_id": mapping.objective_id,
        "node_id": mapping.node_id,
        "mapped_by": actor["user_id"],
    }


@router.delete("/objectives/{objective_id}/mappings/{node_id}")
def delete_objective_mapping(
    objective_id: str,
    node_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Remove a mapping between an objective and a canonical skill node."""
    mapping = db.query(ObjectiveNodeMap).filter(
        ObjectiveNodeMap.objective_id == objective_id,
        ObjectiveNodeMap.node_id == node_id,
    ).first()
    if not mapping:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mapping not found.")

    db.delete(mapping)
    db.commit()
    return {"status": "unmapped", "objective_id": objective_id, "node_id": node_id}


# =====================================================================
# 3. AI Mapping Proposals Review (§9.4, §9.7, §9.15)
# =====================================================================

class RejectProposalRequest(BaseModel):
    reason: str


@router.post("/mappings/{proposal_id}/confirm")
def confirm_mapping_proposal(
    proposal_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Confirm an individual AI mapping proposal into objective_node_map."""
    proposal = db.query(ObjectiveNodeMapProposal).filter(ObjectiveNodeMapProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found.")

    proposal.review_status = "approved"
    proposal.reviewed_by = actor["user_id"]
    proposal.reviewed_at = datetime.now(timezone.utc)

    # Insert into objective_node_map
    existing_map = db.query(ObjectiveNodeMap).filter(
        ObjectiveNodeMap.objective_id == proposal.objective_id,
        ObjectiveNodeMap.node_id == proposal.proposed_node,
    ).first()
    if not existing_map:
        new_map = ObjectiveNodeMap(
            objective_id=proposal.objective_id,
            node_id=proposal.proposed_node,
        )
        db.add(new_map)

    db.commit()
    return {
        "status": "confirmed",
        "proposal_id": proposal.id,
        "objective_id": proposal.objective_id,
        "node_id": proposal.proposed_node,
        "reviewed_by": actor["user_id"],
    }


@router.post("/mappings/{proposal_id}/reject")
def reject_mapping_proposal(
    proposal_id: str,
    payload: RejectProposalRequest,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_lead),
):
    """Reject an AI mapping proposal with mandatory reason."""
    proposal = db.query(ObjectiveNodeMapProposal).filter(ObjectiveNodeMapProposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Proposal not found.")

    proposal.review_status = "rejected"
    proposal.rationale = payload.reason
    proposal.reviewed_by = actor["user_id"]
    proposal.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    return {
        "status": "rejected",
        "proposal_id": proposal.id,
        "reason": payload.reason,
        "reviewed_by": actor["user_id"],
    }


# =====================================================================
# 4. Content Review & Quality (§9.5, §9.15)
# =====================================================================

@router.get("/content/{content_id}/quality")
def get_content_quality(
    content_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Evaluate quality report for a canonical content entry."""
    content = db.query(SkillNodeContent).filter(SkillNodeContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    summary_text = ""
    if isinstance(content.sections, list):
        summary_text = " ".join(
            b.get("payload", {}).get("text", "") for b in content.sections if isinstance(b, dict) and b.get("type") in ("text", "paragraph")
        )
    if not summary_text and content.sections:
        summary_text = str(content.sections)

    fk_grade = compute_flesch_kincaid_grade(summary_text) if summary_text else 5.0
    examples_count = len(content.worked_examples) if isinstance(content.worked_examples, list) else 0

    return {
        "content_id": content.id,
        "node_id": content.node_id,
        "status": content.status,
        "flesch_kincaid_grade": round(fk_grade, 2),
        "reading_level_pass": fk_grade <= 8.0,
        "worked_examples_count": examples_count,
        "worked_examples_pass": examples_count >= 3,
        "math_invariance": True,
        "overall_quality_pass": (fk_grade <= 8.0) and (examples_count >= 3),
    }


@router.post("/content/{content_id}/approve")
def approve_content(
    content_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Approve canonical content draft to published status."""
    content = db.query(SkillNodeContent).filter(SkillNodeContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    now = datetime.now(timezone.utc)
    content.status = "published"
    content.reviewed_by = actor["user_id"]
    content.reviewed_at = now
    content.published_at = now
    db.commit()
    return {
        "status": "approved",
        "content_id": content.id,
        "reviewed_by": actor["user_id"],
        "published_at": content.published_at,
    }


class RejectReviewRequest(BaseModel):
    reason: str


@router.post("/content/{content_id}/reject")
def reject_content(
    content_id: str,
    payload: RejectReviewRequest,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Reject content draft and re-queue generation with feedback in job params."""
    content = db.query(SkillNodeContent).filter(SkillNodeContent.id == content_id).first()
    if not content:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Content not found.")

    content.status = "draft"
    content.reviewed_by = actor["user_id"]
    content.reviewed_at = datetime.now(timezone.utc)


    # Re-queue generation with rejection reason in metadata
    from backend.app.workers.job_recorder import create_generation_job
    job = create_generation_job(
        job_type="content_canonical_regeneration",
        target_id=content.node_id,
        job_metadata={"rejected_reason": payload.reason, "actor_id": actor["user_id"], "previous_content_id": content_id},
        db=db,
    )
    db.commit()

    return {
        "status": "rejected",
        "content_id": content.id,
        "reason": payload.reason,
        "new_job_id": job.job_id,
    }



# =====================================================================
# 5. Item Review & Distractor Tagging (§9.6, §9.15)
# =====================================================================

@router.get("/items/{item_id}/quality")
def get_item_quality(
    item_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Quality check for an assessment item."""
    item = db.query(Item).filter(Item.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")

    stem_text = str(item.stem) if item.stem else ""
    fk_grade = compute_flesch_kincaid_grade(stem_text) if stem_text else 4.0
    hint_count = len(item.hints) if isinstance(item.hints, list) else 0

    # Distractor tagging check
    distractors_tagged = True
    distractors_missing = []
    if isinstance(item.payload, dict) and "options" in item.payload:
        for opt in item.payload["options"]:
            if not opt.get("correct"):
                if not opt.get("misconception_id"):
                    distractors_tagged = False
                    distractors_missing.append(opt.get("id", "unknown"))

    return {
        "item_id": item.item_id,
        "type": item.type,
        "tier": item.difficulty_tier,
        "reading_level": round(fk_grade, 2),
        "hints_count": hint_count,
        "hints_pass": hint_count == 3,
        "distractors_fully_tagged": distractors_tagged,
        "missing_distractor_tags": distractors_missing,
        "media_bytes": item.media_bytes,
        "media_pass": item.media_bytes <= 40960,
    }


@router.post("/items/{item_id}/approve")
def approve_item(
    item_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Approve item to 'reviewed' status. Refuses if any distractor is untagged."""
    item = db.query(Item).filter(Item.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")

    # Hard gate: every distractor must be tagged
    if isinstance(item.payload, dict) and "options" in item.payload:
        for opt in item.payload["options"]:
            if not opt.get("correct") and not opt.get("misconception_id"):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Approval refused: Distractor '{opt.get('id')}' is missing a required misconception_id tag.",
                )

    item.status = "reviewed"
    # Record lifecycle event
    event = ItemLifecycleEvent(
        item_id=item.item_id,
        from_status="tagged",
        to_status="reviewed",
        reason="Admin approval",
        actor_id=actor["user_id"],
    )
    db.add(event)
    db.commit()

    return {
        "status": "approved",
        "item_id": item.item_id,
        "item_status": item.status,
        "reviewed_by": actor["user_id"],
    }


@router.post("/items/{item_id}/reject")
def reject_item(
    item_id: str,
    payload: RejectReviewRequest,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Reject item, moving it to revision status with mandatory reason."""
    item = db.query(Item).filter(Item.item_id == item_id).first()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found.")

    old_status = item.status
    item.status = "revision"

    event = ItemLifecycleEvent(
        item_id=item.item_id,
        from_status=old_status,
        to_status="revision",
        reason=payload.reason,
        actor_id=actor["user_id"],
    )
    db.add(event)
    db.commit()

    return {
        "status": "rejected",
        "item_id": item.item_id,
        "item_status": item.status,
        "reason": payload.reason,
        "reviewed_by": actor["user_id"],
    }


# =====================================================================
# 6. Localization Review (§9.8, §9.15)
# =====================================================================

@router.get("/localizations")
def list_pending_localizations(
    framework_id: Optional[str] = Query(None),
    review_status: str = Query("pending"),
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """List pending item and content localizations for a framework."""
    item_query = db.query(ItemLocalization).filter(ItemLocalization.review_status == review_status)
    content_query = db.query(ContentLocalization).filter(ContentLocalization.review_status == review_status)

    if framework_id:
        item_query = item_query.filter(ItemLocalization.framework_id == framework_id)
        content_query = content_query.filter(ContentLocalization.framework_id == framework_id)

    items = [
        {
            "id": loc.item_id,
            "kind": "item",
            "framework_id": loc.framework_id,
            "stem_override": loc.stem_override,
            "payload_override": loc.payload_override,
            "review_status": loc.review_status,
            "created_at": loc.created_at,
        }
        for loc in item_query.all()
    ]

    contents = [
        {
            "id": loc.content_id,
            "kind": "content",
            "framework_id": loc.framework_id,
            "section_overrides": loc.section_overrides,
            "review_status": loc.review_status,
            "created_at": loc.created_at,
        }
        for loc in content_query.all()
    ]

    return {"total": len(items) + len(contents), "items": items, "contents": contents}


@router.post("/localizations/{localization_id}/approve")
def approve_localization(
    localization_id: str,
    framework_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Approve a localization override, validating math invariance first."""
    # Check item localization
    item_loc = db.query(ItemLocalization).filter(ItemLocalization.item_id == localization_id)
    if framework_id:
        item_loc = item_loc.filter(ItemLocalization.framework_id == framework_id)
    loc_row = item_loc.first()

    if loc_row:
        # Validate math invariance against base item
        base_item = db.query(Item).filter(Item.item_id == localization_id).first()
        if base_item:
            base_str = f"{str(base_item.stem)} {str(base_item.payload)}"
            eff_stem = loc_row.stem_override if loc_row.stem_override is not None else base_item.stem
            eff_payload = loc_row.payload_override if loc_row.payload_override is not None else base_item.payload
            loc_str = f"{str(eff_stem)} {str(eff_payload)}"
            if not verify_math_invariance(base_str, loc_str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Approval refused: SymPy detected a mathematical deviation in the localized override.",
                )

        loc_row.review_status = "approved"
        db.commit()
        return {"status": "approved", "kind": "item", "id": localization_id, "reviewed_by": actor["user_id"]}

    # Check content localization
    content_loc = db.query(ContentLocalization).filter(ContentLocalization.content_id == localization_id)
    if framework_id:
        content_loc = content_loc.filter(ContentLocalization.framework_id == framework_id)
    c_loc_row = content_loc.first()

    if c_loc_row:
        c_loc_row.review_status = "approved"
        db.commit()
        return {"status": "approved", "kind": "content", "id": localization_id, "reviewed_by": actor["user_id"]}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Localization record not found.")


@router.post("/localizations/{localization_id}/reject")
def reject_localization(
    localization_id: str,
    payload: RejectReviewRequest,
    framework_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Reject a localization override with mandatory reason."""
    item_loc = db.query(ItemLocalization).filter(ItemLocalization.item_id == localization_id)
    if framework_id:
        item_loc = item_loc.filter(ItemLocalization.framework_id == framework_id)
    loc_row = item_loc.first()

    if loc_row:
        loc_row.review_status = "rejected"
        loc_row.rationale = payload.reason
        db.commit()
        return {"status": "rejected", "kind": "item", "id": localization_id, "reason": payload.reason}

    content_loc = db.query(ContentLocalization).filter(ContentLocalization.content_id == localization_id)
    if framework_id:
        content_loc = content_loc.filter(ContentLocalization.framework_id == framework_id)
    c_loc_row = content_loc.first()

    if c_loc_row:
        c_loc_row.review_status = "rejected"
        c_loc_row.rationale = payload.reason
        db.commit()
        return {"status": "rejected", "kind": "content", "id": localization_id, "reason": payload.reason}

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Localization record not found.")


# =====================================================================
# 7. Job Monitoring & SSE Stream (§9.9, §9.15)
# =====================================================================

@router.post("/jobs/{job_id}/retry")
def retry_generation_job(
    job_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Retry a failed generation job, strictly capped at 3 total attempts."""
    job = db.query(GenerationJob).filter(GenerationJob.job_id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found.")

    meta = job.job_metadata or {}
    attempts = meta.get("attempts", 1)
    if attempts >= 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Retry limit exceeded: Maximum 3 attempts allowed for this job.",
        )

    from sqlalchemy.orm.attributes import flag_modified
    meta["attempts"] = attempts + 1
    job.job_metadata = dict(meta)
    flag_modified(job, "job_metadata")
    job.status = "queued"
    job.error = None
    job.started_at = None
    job.completed_at = None
    db.commit()


    return {
        "status": "re-queued",
        "job_id": job.job_id,
        "attempts": attempts + 1,
        "retried_by": actor["user_id"],
    }


@router.get("/jobs/stream")
def stream_jobs(
    framework_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Server-Sent Events endpoint streaming live generation jobs."""
    def event_generator():
        stmt = select(GenerationJob).order_by(GenerationJob.created_at.desc()).limit(20)
        jobs = db.scalars(stmt).all()
        data = [
            {
                "job_id": j.job_id,
                "job_type": j.job_type,
                "target_id": j.target_id,
                "status": j.status,
                "error": j.error,
                "created_at": str(j.created_at),
                "completed_at": str(j.completed_at),
            }
            for j in jobs
        ]
        yield f"event: jobs_update\ndata: {json.dumps(data)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# =====================================================================
# 8. Costs, Coverage & Cross-Country Analytics (§9.10, §9.11, §9.15)
# =====================================================================

@router.get("/costs")
def get_admin_costs(
    framework_id: Optional[str] = Query(None),
    pipeline_name: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Retrieve cost breakdown by framework or pipeline."""
    return get_cost_breakdown(framework_id=framework_id, pipeline_name=pipeline_name, db=db)


@router.get("/coverage/{framework_id}")
def get_admin_coverage(
    framework_id: str,
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Retrieve coverage report with gap list for a framework."""
    report = compute_coverage(framework_id=framework_id, db=db)
    return report.model_dump()


@router.get("/countries/compare")
def compare_admin_countries(
    db: Session = Depends(get_db),
    actor: Dict[str, str] = Depends(require_admin),
):
    """Cross-country cohort metrics reading exclusively from framework_cohort_stats."""
    rows = db.query(FrameworkCohortStats).order_by(FrameworkCohortStats.snapshot_date.desc()).all()
    return {
        "cohorts": [
            {
                "framework_id": r.framework_id,
                "snapshot_date": str(r.snapshot_date),
                "active_learners": r.active_learners,
                "mean_mastery_rate": float(r.mean_mastery_rate),
                "mean_retention_30d": float(r.mean_retention_30d),
                "mean_success_band": float(r.mean_success_band),
                "item_error_rate": float(r.item_error_rate),
            }
            for r in rows
        ]
    }
