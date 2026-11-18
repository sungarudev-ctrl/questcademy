"""Pipeline C — Framework Expansion (Objective Extraction, Mapping Proposals, and Coverage).

Source of truth:
- docs/plan.md §3.4
- docs/02-curriculum-framework-spec.md §3, §6, §9
- Task 8 §8.4

CRITICAL GOVERNANCE INVARIANT:
This pipeline NEVER writes directly to objective_node_map.
It writes candidate proposals to objective_node_map_proposals for human curriculum lead review.
"""

import uuid
from typing import Any, Dict, List, Optional, Union
from sqlalchemy.orm import Session
from backend.app.db.base import get_db_context
from backend.app.db.models.framework import (
    CurriculumFramework,
    SyllabusObjective,
    ObjectiveNodeMapProposal,
)
from backend.app.db.models.content import SkillNode
from backend.app.ai.gemini import GeminiClient
from backend.app.ai.tools.objective_extractor import ObjectiveExtractor
from backend.app.ai.tools.objective_mapper import ObjectiveMapper
from backend.app.services.coverage_service import compute_coverage, CoverageReport


def extract_objectives(
    framework_id: str,
    source: Union[bytes, str],
    actor_id: str,
    grade_bands: str = "JSS1, JSS2, JSS3",
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> List[SyllabusObjective]:
    """Pipeline C Step 1: Extracts verbatim syllabus objectives from source text.
    
    Persists objectives with coverage_status='unmapped'.
    Stops for human correction — does not automatically proceed to mapping.
    """
    text = source.decode("utf-8", errors="ignore") if isinstance(source, bytes) else str(source)
    extractor = ObjectiveExtractor(gemini_client=gemini_client)

    def _execute(session: Session) -> List[SyllabusObjective]:
        fw = session.query(CurriculumFramework).filter(CurriculumFramework.framework_id == framework_id).first()
        if not fw:
            raise ValueError(f"CurriculumFramework '{framework_id}' not found.")

        raw_objectives = extractor.extract(
            framework_id=framework_id,
            source_text=text,
            grade_bands=grade_bands,
            job_id=job_id,
            db=session,
        )

        persisted = []
        for obj in raw_objectives:
            obj_id = f"{framework_id}:{obj['code']}"
            existing = session.query(SyllabusObjective).filter(SyllabusObjective.objective_id == obj_id).first()
            if existing:
                persisted.append(existing)
                continue

            entity = SyllabusObjective(
                objective_id=obj_id,
                framework_id=framework_id,
                code=obj["code"],
                text=obj["text"],
                grade_band=obj.get("grade_band", "JSS1"),
                term=obj.get("term"),
                exam_weight=obj.get("exam_weight"),
                coverage_status="unmapped",
            )
            session.add(entity)
            persisted.append(entity)

        session.commit()
        for p in persisted:
            session.refresh(p)
        return persisted

    if db is not None:
        return _execute(db)
    with get_db_context() as session:
        return _execute(session)


def map_objectives(
    framework_id: str,
    actor_id: str,
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> List[ObjectiveNodeMapProposal]:
    """Pipeline C Step 3: Proposes objective-to-node mappings with confidence scores.
    
    Persists proposals in objective_node_map_proposals with review_status='pending'.
    NEVER writes directly to objective_node_map.
    """
    mapper = ObjectiveMapper(gemini_client=gemini_client)

    def _execute(session: Session) -> List[ObjectiveNodeMapProposal]:
        objectives = (
            session.query(SyllabusObjective)
            .filter(SyllabusObjective.framework_id == framework_id)
            .all()
        )
        nodes = session.query(SkillNode).all()

        obj_data = [{"objective_id": o.objective_id, "code": o.code, "text": o.text} for o in objectives]
        node_data = [{"node_id": n.node_id, "title": n.title, "description": n.description} for n in nodes]

        raw_proposals = mapper.propose_mappings(
            framework_id=framework_id,
            objectives=obj_data,
            nodes=node_data,
            job_id=job_id,
            db=session,
        )

        persisted_proposals = []
        for prop in raw_proposals:
            existing = (
                session.query(ObjectiveNodeMapProposal)
                .filter(
                    ObjectiveNodeMapProposal.framework_id == framework_id,
                    ObjectiveNodeMapProposal.objective_id == prop["objective_id"],
                    ObjectiveNodeMapProposal.proposed_node == prop["proposed_node"],
                )
                .first()
            )
            if existing:
                persisted_proposals.append(existing)
                continue

            entity = ObjectiveNodeMapProposal(
                id=str(uuid.uuid4()),
                framework_id=framework_id,
                objective_id=prop["objective_id"],
                proposed_node=prop["proposed_node"],
                confidence=prop.get("confidence", 0.8),
                rationale=prop.get("rationale", ""),
                review_status="pending",
            )
            session.add(entity)
            persisted_proposals.append(entity)

        session.commit()
        for p in persisted_proposals:
            session.refresh(p)
        return persisted_proposals

    if db is not None:
        return _execute(db)
    with get_db_context() as session:
        return _execute(session)


def get_framework_coverage(framework_id: str, db: Optional[Session] = None) -> CoverageReport:
    """Pipeline C Step 9: Compute coverage report for framework activation gate."""
    return compute_coverage(framework_id=framework_id, db=db)
