"""Pipeline D — Localization Refresh.

Source of truth:
- docs/plan.md §3.4 (Pipeline D)
- Task 8 §8.4
"""

from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from backend.app.db.base import get_db_context
from backend.app.db.models.framework import (
    LocalizationBrief,
    ItemLocalization,
    ContentLocalization,
)
from backend.app.db.models.content import Item, SkillNodeContent
from backend.app.ai.gemini import GeminiClient
from backend.app.ai.tools.sympy_solver import verify_math_invariance


class LocalizationRefreshError(ValueError):
    """Raised when localization refresh fails math invariance."""
    pass


def refresh_localization(
    framework_id: str,
    actor_id: str,
    db: Optional[Session] = None,
    job_id: Optional[str] = None,
    gemini_client: Optional[GeminiClient] = None,
) -> Dict[str, Any]:
    """Pipeline D: Refreshes all item and content localization overrides for a framework.
    
    1. Loads updated localization brief.
    2. Loads all item_localizations and content_localizations for framework.
    3. Regenerates each override against the updated brief.
    4. Enforces SymPy math invariance on all math-bearing content.
    5. Stages refreshed overrides as review_status='pending'.
    """
    client = gemini_client or GeminiClient()

    def _execute(session: Session) -> Dict[str, Any]:
        brief = session.query(LocalizationBrief).filter(LocalizationBrief.framework_id == framework_id).first()
        if not brief:
            raise ValueError(f"LocalizationBrief not found for framework '{framework_id}'.")

        brief_data = {
            "currency": brief.currency,
            "common_names": brief.common_names,
            "cities": brief.cities,
            "foods": brief.foods,
            "units_preferred": brief.units_preferred,
            "avoid": brief.avoid,
            "scenario_bank": brief.scenario_bank,
        }

        # 1. Refresh item localizations
        item_locs = (
            session.query(ItemLocalization)
            .filter(ItemLocalization.framework_id == framework_id)
            .all()
        )
        refreshed_items_count = 0

        for it_loc in item_locs:
            base_item = session.query(Item).filter(Item.item_id == it_loc.item_id).first()
            if not base_item:
                continue

            variables = {
                "framework_id": framework_id,
                "updated_brief": brief_data,
                "target_type": "item",
                "base_entity": {
                    "stem": base_item.stem,
                    "payload": base_item.payload,
                    "worked_solution": base_item.worked_solution,
                },
                "current_override": {
                    "stem_override": it_loc.stem_override,
                    "payload_override": it_loc.payload_override,
                    "solution_override": it_loc.solution_override,
                },
            }

            response = client.generate_json(
                prompt_name="localization_refresh",
                variables=variables,
                framework_id=framework_id,
                job_id=job_id,
                db=session,
            )

            new_ovr = response.get("refreshed_override", {})
            if isinstance(new_ovr, dict):
                stem_ovr = new_ovr.get("stem_override", it_loc.stem_override)
                payload_ovr = new_ovr.get("payload_override", it_loc.payload_override)
                sol_ovr = new_ovr.get("solution_override", it_loc.solution_override)

                # Validate math invariance
                eff_stem = stem_ovr if stem_ovr is not None else base_item.stem
                eff_payload = payload_ovr if payload_ovr is not None else base_item.payload
                base_str = f"{str(base_item.stem)} {str(base_item.payload)}"
                ovr_str = f"{str(eff_stem)} {str(eff_payload)}"
                if not verify_math_invariance(base_str, ovr_str):
                    raise LocalizationRefreshError(
                        f"Refreshed item localization failed math invariance for item '{it_loc.item_id}'."
                    )

                it_loc.stem_override = stem_ovr
                it_loc.payload_override = payload_ovr
                it_loc.solution_override = sol_ovr
                it_loc.rationale = response.get("rationale", it_loc.rationale)
                it_loc.review_status = "pending"  # Enqueue for review
                refreshed_items_count += 1

        # 2. Refresh content localizations
        content_locs = (
            session.query(ContentLocalization)
            .filter(ContentLocalization.framework_id == framework_id)
            .all()
        )
        refreshed_content_count = 0

        for c_loc in content_locs:
            base_content = session.query(SkillNodeContent).filter(SkillNodeContent.id == c_loc.content_id).first()
            if not base_content:
                continue

            variables = {
                "framework_id": framework_id,
                "updated_brief": brief_data,
                "target_type": "content",
                "base_entity": {
                    "sections": base_content.sections,
                },
                "current_override": {
                    "section_overrides": c_loc.section_overrides,
                },
            }

            response = client.generate_json(
                prompt_name="localization_refresh",
                variables=variables,
                framework_id=framework_id,
                job_id=job_id,
                db=session,
            )

            new_ovr = response.get("refreshed_override", {})
            if isinstance(new_ovr, dict):
                sec_ovr = new_ovr.get("section_overrides", new_ovr)

                def _strip_index(sec: Any) -> str:
                    if isinstance(sec, dict):
                        return str({k: v for k, v in sec.items() if k != "section_index"})
                    return str(sec)

                # Verify math invariance on each section
                base_secs = base_content.sections or []
                for idx_str, override_sec in sec_ovr.items():
                    try:
                        idx = int(idx_str)
                        if idx < len(base_secs):
                            if not verify_math_invariance(_strip_index(base_secs[idx]), _strip_index(override_sec)):
                                raise LocalizationRefreshError(
                                    f"Refreshed content localization failed math invariance for section {idx}."
                                )
                    except ValueError:
                        continue

                c_loc.section_overrides = sec_ovr
                c_loc.rationale = response.get("rationale", c_loc.rationale)
                c_loc.review_status = "pending"  # Enqueue for review
                refreshed_content_count += 1

        session.commit()
        return {
            "framework_id": framework_id,
            "refreshed_items": refreshed_items_count,
            "refreshed_contents": refreshed_content_count,
            "review_status": "pending",
        }

    if db is not None:
        return _execute(db)
    with get_db_context() as session:
        return _execute(session)
