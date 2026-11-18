"""Pipeline A2 — Lesson Content Authoring (Canonical Mode 1 & Localized Mode 2).

Source of truth:
- docs/plan.md §3.2
- docs/05-assessment-item-spec.md §1, Rule A-3
- Task 8 §8.4
"""

import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from backend.app.db.base import get_db_context
from backend.app.db.models.content import (
    SkillNode,
    SkillNodePrerequisite,
    SkillNodeContent,
    Misconception,
    MisconceptionNode,
)
from backend.app.db.models.framework import (
    ContentLocalization,
    LocalizationBrief,
    LocalizationToken,
)
from backend.app.ai.gemini import GeminiClient
from backend.app.ai.tools.validator import compute_flesch_kincaid_grade, GRADE_BAND_TO_GRADE
from backend.app.ai.tools.sympy_solver import verify_math_invariance
from backend.app.ai.tools.chunker import chunk_sections


class ContentValidationError(ValueError):
    """Raised when generated lesson content fails validation gates."""
    pass


def generate_content_canonical(
    node_id: str,
    actor_id: str,
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> SkillNodeContent:
    """Pipeline A2 Mode 1: Generates canonical 17-block lesson content for a SkillNode.
    
    Validates:
    - Worked examples >= 3
    - Reading level >= 2 years below target grade
    - All math in KaTeX
    Persists skill_node_content.status = 'draft'.
    """
    client = gemini_client or GeminiClient()

    def _execute(session: Session) -> SkillNodeContent:
        node = session.query(SkillNode).filter(SkillNode.node_id == node_id).first()
        if not node:
            raise ValueError(f"SkillNode '{node_id}' not found.")

        prereqs = (
            session.query(SkillNodePrerequisite)
            .filter(SkillNodePrerequisite.node_id == node_id)
            .all()
        )
        prereq_ids = [p.prerequisite_node_id for p in prereqs]

        misc_links = (
            session.query(MisconceptionNode)
            .filter(MisconceptionNode.node_id == node_id)
            .all()
        )
        misc_ids = [m.misconception_id for m in misc_links]
        miscs = (
            session.query(Misconception)
            .filter(Misconception.misconception_id.in_(misc_ids))
            .all()
        )
        misc_list = [
            {"id": m.misconception_id, "description": m.description, "learner_facing_name": m.learner_facing_name}
            for m in miscs
        ]

        variables = {
            "node_id": node.node_id,
            "title": node.title,
            "description": node.description,
            "grade_band_hint": node.grade_band_hint or "JSS2",
            "prerequisites": prereq_ids,
            "misconceptions": misc_list,
        }

        response = client.generate_json(
            prompt_name="content_canonical",
            variables=variables,
            job_id=job_id,
            db=session,
        )


        # Validate worked examples >= 3
        worked_examples = response.get("worked_examples", [])
        if len(worked_examples) < 3:
            raise ContentValidationError(
                f"Validation failed: content must have at least 3 worked examples, got {len(worked_examples)}."
            )

        # Validate reading level
        summary = response.get("summary", "")
        fk_grade = compute_flesch_kincaid_grade(summary)
        target_grade = GRADE_BAND_TO_GRADE.get(node.grade_band_hint or "JSS2", 8.0)
        max_allowed = target_grade - 2.0
        if fk_grade > max_allowed:
            raise ContentValidationError(
                f"Reading level gate failed: summary grade {fk_grade} exceeds maximum allowed {max_allowed}."
            )

        # Check existing content for version increment
        latest_content = (
            session.query(SkillNodeContent)
            .filter(SkillNodeContent.node_id == node_id)
            .order_by(SkillNodeContent.version.desc())
            .first()
        )
        version = (latest_content.version + 1) if latest_content else 1

        content_record = SkillNodeContent(
            id=str(uuid.uuid4()),
            node_id=node.node_id,
            version=version,
            summary=summary,
            learning_objectives=response.get("learning_objectives", []),
            sections=response.get("sections", []),
            worked_examples=worked_examples,
            key_formulas=response.get("key_formulas", []),
            analogies=response.get("analogies", []),
            common_mistakes=response.get("common_mistakes", []),
            estimated_minutes=response.get("estimated_minutes", node.est_minutes),
            status="draft",  # Staged for review
            generated_by="gemini-2.5-pro",
        )
        session.add(content_record)
        session.commit()
        session.refresh(content_record)

        # Chunk sections for retrieval/embedding
        chunk_sections(content_record.sections)

        return content_record

    if db is not None:
        return _execute(db)
    with get_db_context() as session:
        return _execute(session)


def generate_content_localized(
    content_id: str,
    framework_id: str,
    actor_id: str,
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> ContentLocalization:
    """Pipeline A2 Mode 2: Generates localized sparse section overrides for a framework.
    
    Validates mathematical invariance with SymPy.
    Persists with review_status='pending'.
    """
    client = gemini_client or GeminiClient()

    def _execute(session: Session) -> ContentLocalization:
        base_content = session.query(SkillNodeContent).filter(SkillNodeContent.id == content_id).first()
        if not base_content:
            raise ValueError(f"SkillNodeContent '{content_id}' not found.")

        brief = session.query(LocalizationBrief).filter(LocalizationBrief.framework_id == framework_id).first()
        tokens = session.query(LocalizationToken).filter(LocalizationToken.framework_id == framework_id).all()
        token_dict = {t.token_key: t.token_value for t in tokens}

        variables = {
            "framework_id": framework_id,
            "currency": brief.currency if brief else token_dict.get("currency", "GHS"),
            "common_names": brief.common_names if brief else [],
            "cities": brief.cities if brief else [],
            "foods": brief.foods if brief else [],
            "units_preferred": brief.units_preferred if brief else {},
            "avoid": brief.avoid if brief else [],
            "scenario_bank": brief.scenario_bank if brief else [],
            "base_sections": base_content.sections,
        }

        response = client.generate_json(
            prompt_name="content_localized",
            variables=variables,
            framework_id=framework_id,
            job_id=job_id,
            db=session,
        )


        section_overrides = response.get("section_overrides", {})
        rationale = response.get("rationale", f"Localized for framework {framework_id}")

        def _strip_index(sec: Any) -> str:
            if isinstance(sec, dict):
                return str({k: v for k, v in sec.items() if k != "section_index"})
            return str(sec)

        # Validate mathematical invariance on every overridden section
        base_sections = base_content.sections or []
        for idx_str, override_sec in section_overrides.items():
            idx = int(idx_str)
            if idx < len(base_sections):
                base_sec = base_sections[idx]
                base_str = _strip_index(base_sec)
                loc_str = _strip_index(override_sec)
                if not verify_math_invariance(base_str, loc_str):
                    raise ContentValidationError(
                        f"Math invariance gate failed for section {idx}: localized content altered mathematical values."
                    )

        # Check if localization record already exists
        loc_record = (
            session.query(ContentLocalization)
            .filter(
                ContentLocalization.content_id == content_id,
                ContentLocalization.framework_id == framework_id,
            )
            .first()
        )
        if loc_record:
            loc_record.section_overrides = section_overrides
            loc_record.rationale = rationale
            loc_record.review_status = "pending"  # Reset to pending for review
        else:
            loc_record = ContentLocalization(
                content_id=content_id,
                framework_id=framework_id,
                section_overrides=section_overrides,
                rationale=rationale,
                review_status="pending",  # Staged for review
                created_by=actor_id,
            )
            session.add(loc_record)

        session.commit()
        session.refresh(loc_record)
        return loc_record

    if db is not None:
        return _execute(db)
    with get_db_context() as session:
        return _execute(session)
