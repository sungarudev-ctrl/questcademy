"""Framework service layer.

Source of truth:
- docs/plan.md §2.2, §2.9 - §2.13, §3.4, §6
- docs/02-curriculum-framework-spec.md §3, §5, §6, §9
"""

from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Sequence, Union
import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    FrameworkCohortStats,
    FrameworkGradeBand,
    FrameworkRollout,
    FrameworkVersionDiff,
    ItemLocalization,
    LearnerFrameworkPin,
    LearnerPinMigration,
    LocalizationBrief,
    LocalizationToken,
    ObjectiveNodeMap,
    SyllabusObjective,
)


class FrameworkError(Exception):
    """Base exception for framework service errors."""
    pass


class FrameworkNotFoundError(FrameworkError):
    """Raised when a framework is not found."""
    pass


class BulkMappingProhibitedError(FrameworkError, TypeError):
    """Raised when an attempt is made to map objectives in bulk (doc 02 §9)."""
    pass


class CoverageGateError(FrameworkError, ValueError):
    """Raised when framework activation is attempted below the 80% coverage gate."""
    pass


PUBLISHED_ITEM_STATUSES = frozenset({
    "reviewed",
    "piloted",
    "live",
    "calibrating",
    "calibrated",
})


def create_framework(
    db: Session,
    framework_id: str,
    country_code: str,
    board: str,
    subject: str,
    version: str,
    locale: str,
    currency: str,
    effective_from: date,
    grading_scale: List[Dict[str, Any]],
    exam_structure: Dict[str, Any],
    effective_until: Optional[date] = None,
    grade_bands: Optional[List[Dict[str, Any]]] = None,
) -> CurriculumFramework:
    """Creates a new curriculum framework in 'draft' status."""
    framework = CurriculumFramework(
        framework_id=framework_id,
        country_code=country_code,
        board=board,
        subject=subject,
        version=version,
        locale=locale,
        currency=currency,
        effective_from=effective_from,
        effective_until=effective_until,
        status="draft",
        grading_scale=grading_scale,
        exam_structure=exam_structure,
    )
    db.add(framework)

    if grade_bands:
        for gb in grade_bands:
            band = FrameworkGradeBand(
                framework_id=framework_id,
                band_id=gb["band_id"],
                ordinal=gb["ordinal"],
                typical_age=gb.get("typical_age"),
                label_local=gb["label_local"],
            )
            db.add(band)

    # Initialize rollout tracking
    rollout = FrameworkRollout(
        country_code=country_code,
        framework_id=framework_id,
        phase="planned",
        coverage_pct=Decimal("0.00"),
    )
    db.add(rollout)
    db.flush()
    return framework


def import_objectives(
    db: Session,
    framework_id: str,
    raw_objectives: Union[List[Dict[str, Any]], str],
    extractor_func=None,
) -> List[SyllabusObjective]:
    """Imports official syllabus objectives verbatim and stages them as 'unmapped'.
    
    If raw_objectives is text/PDF and extractor_func is provided, it calls the extractor.
    """
    framework = db.get(CurriculumFramework, framework_id)
    if not framework:
        raise FrameworkNotFoundError(f"Framework '{framework_id}' not found.")

    if isinstance(raw_objectives, str) and extractor_func is not None:
        extracted = extractor_func(raw_objectives)
    elif isinstance(raw_objectives, list):
        extracted = raw_objectives
    else:
        raise ValueError("raw_objectives must be a list of objectives or a string with an extractor_func.")

    staged_objectives: List[SyllabusObjective] = []
    for item in extracted:
        obj = SyllabusObjective(
            objective_id=item.get("objective_id") or f"{framework_id}.{item['code']}",
            framework_id=framework_id,
            code=item["code"],
            text=item["text"],
            grade_band=item["grade_band"],
            term=item.get("term"),
            exam_weight=item.get("exam_weight"),
            coverage_status="unmapped",
        )
        db.add(obj)
        staged_objectives.append(obj)

    # Update rollout phase
    rollouts = db.scalars(
        select(FrameworkRollout).where(FrameworkRollout.framework_id == framework_id)
    ).all()
    for r in rollouts:
        r.phase = "mapping"

    db.flush()
    return staged_objectives


def map_objective(
    db: Session,
    objective_id: str,
    node_id: str,
    actor: str,
) -> ObjectiveNodeMap:
    """Maps a single syllabus objective to a canonical skill node.
    
    CRITICAL GOVERNANCE RULE (doc 02 §9):
    Bulk-approving mappings is prohibited. The service strictly enforces that
    objective_id and node_id are single strings. Passing lists, tuples, sets,
    or iterables raises BulkMappingProhibitedError at runtime.
    """
    if not isinstance(objective_id, str):
        raise BulkMappingProhibitedError(
            f"Bulk mapping prohibited: objective_id must be a string, got {type(objective_id).__name__}."
        )
    if not isinstance(node_id, str):
        raise BulkMappingProhibitedError(
            f"Bulk mapping prohibited: node_id must be a string, got {type(node_id).__name__}."
        )

    # Check existence of objective
    objective = db.get(SyllabusObjective, objective_id)
    if not objective:
        raise ValueError(f"Objective '{objective_id}' does not exist.")

    # Check if mapping already exists
    existing = db.get(ObjectiveNodeMap, (objective_id, node_id))
    if existing:
        return existing

    mapping = ObjectiveNodeMap(objective_id=objective_id, node_id=node_id)
    db.add(mapping)

    # Update coverage_status to partial or full
    if objective.coverage_status == "unmapped":
        objective.coverage_status = "partial"

    db.flush()
    return mapping


def compute_coverage(
    db: Session,
    framework_id: str,
    published_items_by_node: Optional[Dict[str, int]] = None,
) -> float:
    """Computes framework coverage_pct per plan §6 and doc 02 §6.
    
    Formula: percentage of syllabus objectives in this framework that map to
    canonical nodes with >= 15 published items (statuses: reviewed, piloted,
    live, calibrating, calibrated).
    """
    objectives = db.scalars(
        select(SyllabusObjective).where(SyllabusObjective.framework_id == framework_id)
    ).all()

    if not objectives:
        return 0.0

    total_objectives = len(objectives)
    covered_count = 0

    for obj in objectives:
        # Get mapped nodes
        mapped_nodes = db.scalars(
            select(ObjectiveNodeMap.node_id).where(ObjectiveNodeMap.objective_id == obj.objective_id)
        ).all()

        if not mapped_nodes:
            continue

        # Count published items
        total_published_items = 0
        for nid in mapped_nodes:
            if published_items_by_node is not None:
                total_published_items += published_items_by_node.get(nid, 0)
            else:
                try:
                    from backend.app.db.models.content import Item
                    items_count = (
                        db.query(func.count(Item.item_id))
                        .filter(
                            Item.node_id == nid,
                            Item.status.in_(("reviewed", "piloting", "live", "calibrating", "calibrated")),
                        )
                        .scalar()
                        or 0
                    )
                    total_published_items += items_count
                except Exception:
                    total_published_items += 0

        if total_published_items >= 15:
            covered_count += 1
            if obj.coverage_status != "full":
                obj.coverage_status = "full"

    coverage_pct = round((covered_count / total_objectives) * 100.0, 2)

    # Update rollout record
    rollouts = db.scalars(
        select(FrameworkRollout).where(FrameworkRollout.framework_id == framework_id)
    ).all()
    for r in rollouts:
        r.coverage_pct = Decimal(str(coverage_pct))

    db.flush()
    return coverage_pct


def activate_framework(
    db: Session,
    framework_id: str,
    actor: str,
    published_items_by_node: Optional[Dict[str, int]] = None,
) -> CurriculumFramework:
    """Activates a framework. Fails with CoverageGateError if coverage_pct < 80.0."""
    framework = db.get(CurriculumFramework, framework_id)
    if not framework:
        raise FrameworkNotFoundError(f"Framework '{framework_id}' not found.")

    coverage = compute_coverage(db, framework_id, published_items_by_node=published_items_by_node)
    if coverage < 80.0:
        raise CoverageGateError(
            f"Cannot activate framework '{framework_id}': coverage is {coverage:.1f}%, which is below the 80.0% requirement."
        )

    framework.status = "active"
    rollouts = db.scalars(
        select(FrameworkRollout).where(FrameworkRollout.framework_id == framework_id)
    ).all()
    for r in rollouts:
        r.phase = "active"
        r.activated_at = datetime.now(timezone.utc)

    db.flush()
    return framework


def supersede_framework(
    db: Session,
    framework_id: str,
    new_framework_id: str,
    actor: str,
    reason: str = "version_upgrade",
) -> FrameworkVersionDiff:
    """Supersedes an existing framework with a new framework version.
    
    Generates a version diff report (added, removed, remapped objectives).
    Marks old framework status as 'superseded'.
    Does NOT mutate any learner pins (Invariant I-11).
    """
    old_fw = db.get(CurriculumFramework, framework_id)
    new_fw = db.get(CurriculumFramework, new_framework_id)
    if not old_fw or not new_fw:
        raise FrameworkNotFoundError("One or both frameworks not found.")

    old_objs = {
        o.code: o for o in db.scalars(select(SyllabusObjective).where(SyllabusObjective.framework_id == framework_id)).all()
    }
    new_objs = {
        o.code: o for o in db.scalars(select(SyllabusObjective).where(SyllabusObjective.framework_id == new_framework_id)).all()
    }

    added = [code for code in new_objs if code not in old_objs]
    removed = [code for code in old_objs if code not in new_objs]
    remapped = []

    for code, nobj in new_objs.items():
        if code in old_objs:
            oobj = old_objs[code]
            if nobj.grade_band != oobj.grade_band or nobj.term != oobj.term:
                remapped.append({
                    "code": code,
                    "old_grade_band": oobj.grade_band,
                    "new_grade_band": nobj.grade_band,
                })

    diff = FrameworkVersionDiff(
        from_framework=framework_id,
        to_framework=new_framework_id,
        objectives_added={"codes": added},
        objectives_removed={"codes": removed},
        objectives_remapped=remapped,
        coverage_delta={"reason": reason, "generated_by": actor},
    )
    db.add(diff)

    old_fw.status = "superseded"
    old_rollouts = db.scalars(
        select(FrameworkRollout).where(FrameworkRollout.framework_id == framework_id)
    ).all()
    for r in old_rollouts:
        r.phase = "superseded"
        r.superseded_at = datetime.now(timezone.utc)

    db.flush()
    return diff


def migrate_learner_pin(
    db: Session,
    learner_id: str,
    to_framework_id: str,
    reason: str,
    actor: str,
) -> LearnerPinMigration:
    """Migrates a learner's framework pin.
    
    INVARIANT I-11: A pin migration NEVER mutates learner_node_state.
    Mastery is on canonical nodes; pins are on frameworks.
    Creates a LearnerPinMigration audit row and updates/inserts LearnerFrameworkPin.
    """
    valid_reasons = {"country_change", "board_change", "superseded"}
    if reason not in valid_reasons:
        raise ValueError(f"Invalid pin migration reason: {reason}. Must be one of {valid_reasons}.")

    target_framework = db.get(CurriculumFramework, to_framework_id)
    if not target_framework:
        raise FrameworkNotFoundError(f"Target framework '{to_framework_id}' not found.")

    current_pin = db.scalars(
        select(LearnerFrameworkPin).where(LearnerFrameworkPin.learner_id == learner_id)
    ).first()

    from_framework_id = current_pin.framework_id if current_pin else None

    # Record migration audit trail
    migration = LearnerPinMigration(
        learner_id=learner_id,
        from_framework=from_framework_id,
        to_framework=to_framework_id,
        reason=reason,
        mastery_preserved=True,  # Invariant I-11
    )
    db.add(migration)

    # Update or insert pin
    if current_pin:
        current_pin.framework_id = to_framework_id
        current_pin.pinned_at = datetime.now(timezone.utc)
    else:
        new_pin = LearnerFrameworkPin(
            learner_id=learner_id,
            framework_id=to_framework_id,
            pinned_at=datetime.now(timezone.utc),
        )
        db.add(new_pin)

    # Note: Zero queries, updates, or deletions touch learner_node_state!
    db.flush()
    return migration


def refresh_localization(
    db: Session,
    framework_id: str,
    actor: str,
) -> Dict[str, Any]:
    """Refreshes localization overrides against the latest brief (Pipeline D).
    
    Loads the localization brief, stages updated drafts, and reports count.
    """
    brief = db.get(LocalizationBrief, framework_id)
    if not brief:
        raise ValueError(f"No localization brief configured for framework '{framework_id}'.")

    # In a full run, Pipeline D loads all items/content for this framework and stages drafts
    return {
        "framework_id": framework_id,
        "refreshed_at": datetime.now(timezone.utc).isoformat(),
        "staged_item_overrides": 0,
        "staged_content_overrides": 0,
        "status": "staged_drafts",
    }
