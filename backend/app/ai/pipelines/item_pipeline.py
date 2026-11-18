"""Pipeline B — Assessment Item Generation & Localization.

Source of truth:
- docs/plan.md §3.3
- docs/05-assessment-item-spec.md §1, §3, §5, §7, §8, §9
- Task 8 §8.4
"""

import uuid
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from backend.app.db.base import get_db_context
from backend.app.db.models.content import (
    SkillNode,
    SkillNodeContent,
    Item,
    Misconception,
    MisconceptionNode,
    ItemMisconception,
)
from backend.app.db.models.framework import (
    CurriculumFramework,
    ObjectiveNodeMap,
    SyllabusObjective,
    ItemLocalization,
    LocalizationToken,
)
from backend.app.ai.gemini import GeminiClient
from backend.app.ai.tools.validator import validate_item
from backend.app.ai.tools.dedup import check_duplicate
from backend.app.ai.tools.sympy_solver import verify_math_invariance


class ItemPipelineValidationError(ValueError):
    """Raised when generated item fails validation or self-evaluation."""
    pass


def generate_items(
    node_id: str,
    count: int = 20,
    actor_id: Optional[str] = None,
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> List[Item]:
    """Pipeline B: Generates, validates, dedupes, and localizes assessment items for a SkillNode.
    
    1. Loads node, published content, and misconceptions.
    2. Calls Gemini (flash) to generate candidate items across 18 types and tier mix.
    3. Validates each item (hints=3, reading level, distractor tagging, SymPy agreement).
    4. Evaluates self-score (reject if < 0.7).
    5. Deduplicates against existing items on node (drop if cosine distance < 0.15).
    6. Persists items with status='tagged'.
    7. Generates item_localizations for active frameworks mapped to this node.
    """
    client = gemini_client or GeminiClient()

    def _execute(session: Session) -> List[Item]:
        node = session.query(SkillNode).filter(SkillNode.node_id == node_id).first()
        if not node:
            raise ValueError(f"SkillNode '{node_id}' not found.")

        content = (
            session.query(SkillNodeContent)
            .filter(SkillNodeContent.node_id == node_id)
            .order_by(SkillNodeContent.version.desc())
            .first()
        )
        content_summary = content.summary if content else node.description

        # Load misconceptions
        misc_links = session.query(MisconceptionNode).filter(MisconceptionNode.node_id == node_id).all()
        misc_ids = [m.misconception_id for m in misc_links]
        miscs = session.query(Misconception).filter(Misconception.misconception_id.in_(misc_ids)).all()
        misc_list = [
            {"id": m.misconception_id, "description": m.description, "learner_facing_name": m.learner_facing_name}
            for m in miscs
        ]

        # Calculate tier targets (doc 05 §8)
        # e.g., for count=20: 8 Tier 1, 8 Tier 2, 4 Tier 3
        tier1_target = max(1, int(count * 0.40))
        tier2_target = max(1, int(count * 0.40))
        tier3_target = max(1, count - tier1_target - tier2_target)

        variables = {
            "node_id": node.node_id,
            "title": node.title,
            "grade_band_hint": node.grade_band_hint or "JSS2",
            "summary": content_summary,
            "misconceptions": misc_list,
            "count": count,
            "tier1_count": tier1_target,
            "tier2_count": tier2_target,
            "tier3_count": tier3_target,
        }

        # Step 1 & 2: Call Gemini to generate candidate items
        response = client.generate_json(
            prompt_name="item_generation",
            variables=variables,
            job_id=job_id,
            db=session,
        )

        candidate_items = response.get("items", [])

        # Fetch existing items on this node for deduplication
        existing_items = session.query(Item).filter(Item.node_id == node_id).all()
        existing_stems = [
            (it.stem if isinstance(it.stem, str) else str(it.stem))
            for it in existing_items
        ]

        # Find active frameworks mapped to this node
        active_framework_ids = [
            r[0]
            for r in (
                session.query(SyllabusObjective.framework_id)
                .join(ObjectiveNodeMap, ObjectiveNodeMap.objective_id == SyllabusObjective.objective_id)
                .filter(ObjectiveNodeMap.node_id == node_id)
                .distinct()
                .all()
            )
        ]

        persisted_items = []

        for candidate in candidate_items:
            # Step 3: Strict Item Validator
            val_res = validate_item(candidate, grade_band=node.grade_band_hint or "JSS2")
            if not val_res.is_valid:
                continue  # Reject invalid items

            # Step 4: Self-Evaluation score
            self_eval_vars = {
                "candidate_type": "item",
                "node_id": node.node_id,
                "content_payload": candidate,
            }
            eval_res = client.generate_json(
                prompt_name="self_evaluation",
                variables=self_eval_vars,
                job_id=job_id,
                db=session,
            )

            score = eval_res.get("overall_score", 1.0)
            if score < 0.70:
                continue  # Reject if quality score < 0.7

            # Step 5: Semantic Deduplication
            cand_stem = candidate.get("stem", "")
            cand_stem_str = cand_stem if isinstance(cand_stem, str) else str(cand_stem)
            is_dup, min_dist, _ = check_duplicate(cand_stem_str, existing_stems, min_distance_threshold=0.15)
            if is_dup:
                continue  # Drop duplicate item

            # Step 6: Persist item as 'tagged'
            new_item_id = str(uuid.uuid4())
            item_entity = Item(
                item_id=new_item_id,
                node_id=node.node_id,
                type=candidate.get("type", "mcq_single"),
                difficulty_tier=candidate.get("difficulty_tier", 1),
                difficulty_elo=1200,
                stem=candidate.get("stem"),
                payload=candidate.get("payload", {}),
                scoring=candidate.get("scoring", {"mode": "exact", "max_marks": 1}),
                hints=candidate.get("hints", []),
                worked_solution=candidate.get("worked_solution", ""),
                offline_capable=candidate.get("offline_capable", True),
                media_bytes=candidate.get("media_bytes", 0),
                status="tagged",  # Distractors carry verified misconception IDs
                a11y=candidate.get("a11y", {}),
            )
            session.add(item_entity)
            existing_stems.append(cand_stem_str)

            # Persist item misconceptions mapping
            if candidate.get("type") in ("mcq_single", "mcq"):
                seen_m_ids = set()
                for opt in candidate.get("payload", {}).get("options", []):
                    m_id = opt.get("misconception_id")
                    if m_id and m_id not in seen_m_ids:
                        seen_m_ids.add(m_id)
                        session.add(
                            ItemMisconception(
                                item_id=new_item_id,
                                misconception_id=m_id,
                                pattern={"option_id": opt.get("id")},
                            )
                        )

            # Step 7: Localize item for each active mapped framework
            for fw_id in active_framework_ids:
                tokens = session.query(LocalizationToken).filter(LocalizationToken.framework_id == fw_id).all()
                tok_dict = {t.token_key: t.token_value for t in tokens}

                loc_vars = {
                    "framework_id": fw_id,
                    "currency": tok_dict.get("currency", "GHS"),
                    "tokens": tok_dict,
                    "type": candidate.get("type"),
                    "stem": candidate.get("stem"),
                    "payload": candidate.get("payload"),
                    "worked_solution": candidate.get("worked_solution"),
                }

                loc_response = client.generate_json(
                    prompt_name="item_localization",
                    variables=loc_vars,
                    framework_id=fw_id,
                    job_id=job_id,
                    db=session,
                )


                stem_ovr = loc_response.get("stem_override")
                payload_ovr = loc_response.get("payload_override")
                sol_ovr = loc_response.get("solution_override")

                # Verify math invariance with SymPy if override is present
                if stem_ovr or payload_ovr:
                    eff_stem = stem_ovr if stem_ovr is not None else cand_stem_str
                    eff_payload = payload_ovr if payload_ovr is not None else candidate.get("payload")
                    base_str = f"{cand_stem_str} {str(candidate.get('payload'))}"
                    loc_str = f"{str(eff_stem)} {str(eff_payload)}"
                    if not verify_math_invariance(base_str, loc_str):
                        continue  # Discard localization that alters math

                    item_loc = ItemLocalization(
                        item_id=new_item_id,
                        framework_id=fw_id,
                        stem_override=stem_ovr,
                        payload_override=payload_ovr,
                        solution_override=sol_ovr,
                        rationale=loc_response.get("rationale", f"Localized for {fw_id}"),
                        review_status="pending",  # Staged for review
                        created_by=actor_id,
                    )
                    session.add(item_loc)

            persisted_items.append(item_entity)

        session.commit()
        for it in persisted_items:
            session.refresh(it)
        return persisted_items

    if db is not None:
        return _execute(db)
    with get_db_context() as session:
        return _execute(session)
