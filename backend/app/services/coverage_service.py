"""Coverage reporting service gating framework activation.

Source of truth:
- docs/02-curriculum-framework-spec.md §3, §9
- docs/05-assessment-item-spec.md §7, §8
- Task 8 §8.7
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.db.base import get_db_context
from backend.app.db.models.framework import (
    CurriculumFramework,
    SyllabusObjective,
    ObjectiveNodeMap,
    FrameworkRollout,
)
from backend.app.db.models.content import Item

# Item statuses that count towards the publish gate (doc 05 §7)
PUBLISHED_ITEM_STATUSES = ("reviewed", "piloting", "live", "calibrating", "calibrated")


class ObjectiveCoverageDetail(BaseModel):
    objective_id: str
    code: str
    text: str
    grade_band: str
    mapped_nodes: List[str]
    nodes_meeting_threshold: List[str]
    coverage_status: str  # 'full', 'partial', 'unmapped'


class CoverageReport(BaseModel):
    framework_id: str
    total_objectives: int
    covered_objectives: int
    partial_objectives: int
    unmapped_objectives: int
    coverage_pct: float
    eligible_for_activation: bool
    objective_details: List[ObjectiveCoverageDetail]


def check_node_item_threshold(node_id: str, db: Session) -> bool:
    """Check if a node has >= 15 published items and >= 5 tier-3 published items.
    
    Floor is 'reviewed' (doc 05 §7, doc 10 §5).
    """
    total_published = (
        db.query(func.count(Item.item_id))
        .filter(Item.node_id == node_id, Item.status.in_(PUBLISHED_ITEM_STATUSES))
        .scalar()
        or 0
    )
    if total_published < 15:
        return False

    tier3_published = (
        db.query(func.count(Item.item_id))
        .filter(
            Item.node_id == node_id,
            Item.status.in_(PUBLISHED_ITEM_STATUSES),
            Item.difficulty_tier == 3,
        )
        .scalar()
        or 0
    )
    return tier3_published >= 5


def compute_coverage(framework_id: str, db: Optional[Session] = None) -> CoverageReport:
    """Compute curriculum coverage for a framework.
    
    Rule:
    An objective is counted as covered only if EVERY node it maps to
    has >= 15 published items and >= 5 tier-3 items.
    Partial coverage is tracked in detail but DOES NOT count toward coverage_pct.
    Writes coverage_pct to framework_rollouts.
    Never activates a framework.
    """
    def _compute(session: Session) -> CoverageReport:
        # 1. Fetch all syllabus objectives for this framework
        objectives = (
            session.query(SyllabusObjective)
            .filter(SyllabusObjective.framework_id == framework_id)
            .order_by(SyllabusObjective.code)
            .all()
        )

        total_objs = len(objectives)
        if total_objs == 0:
            report = CoverageReport(
                framework_id=framework_id,
                total_objectives=0,
                covered_objectives=0,
                partial_objectives=0,
                unmapped_objectives=0,
                coverage_pct=0.0,
                eligible_for_activation=False,
                objective_details=[],
            )
            return report

        # 2. Fetch all mappings for these objectives
        obj_ids = [o.objective_id for o in objectives]
        mappings = (
            session.query(ObjectiveNodeMap)
            .filter(ObjectiveNodeMap.objective_id.in_(obj_ids))
            .all()
        )
        obj_to_nodes: Dict[str, List[str]] = {oid: [] for oid in obj_ids}
        all_node_ids = set()
        for m in mappings:
            obj_to_nodes[m.objective_id].append(m.node_id)
            all_node_ids.add(m.node_id)

        # 3. Precompute which nodes meet threshold
        node_meets_cache: Dict[str, bool] = {}
        for nid in all_node_ids:
            node_meets_cache[nid] = check_node_item_threshold(nid, session)

        # 4. Evaluate each objective
        covered_count = 0
        partial_count = 0
        unmapped_count = 0
        details: List[ObjectiveCoverageDetail] = []

        for obj in objectives:
            nodes = obj_to_nodes.get(obj.objective_id, [])
            if not nodes:
                unmapped_count += 1
                status = "unmapped"
                meeting = []
            else:
                meeting = [nid for nid in nodes if node_meets_cache.get(nid, False)]
                if len(meeting) == len(nodes):
                    covered_count += 1
                    status = "full"
                elif len(meeting) > 0:
                    partial_count += 1
                    status = "partial"
                else:
                    status = "unmapped"

            obj.coverage_status = status
            details.append(
                ObjectiveCoverageDetail(
                    objective_id=obj.objective_id,
                    code=obj.code,
                    text=obj.text,
                    grade_band=obj.grade_band,
                    mapped_nodes=nodes,
                    nodes_meeting_threshold=meeting,
                    coverage_status=status,
                )
            )

        coverage_pct = round((covered_count / total_objs) * 100.0, 2)
        eligible = coverage_pct >= 80.0

        # 5. Persist coverage_pct to latest framework_rollout for this framework
        rollout = (
            session.query(FrameworkRollout)
            .filter(FrameworkRollout.framework_id == framework_id)
            .order_by(FrameworkRollout.started_at.desc())
            .first()
        )
        if rollout:
            rollout.coverage_pct = coverage_pct

        session.commit()

        return CoverageReport(
            framework_id=framework_id,
            total_objectives=total_objs,
            covered_objectives=covered_count,
            partial_objectives=partial_count,
            unmapped_objectives=unmapped_count,
            coverage_pct=coverage_pct,
            eligible_for_activation=eligible,
            objective_details=details,
        )

    if db is not None:
        return _compute(db)
    with get_db_context() as session:
        return _compute(session)
