"""Framework-aware content resolver.

Source of truth:
- docs/plan.md §2.10, §5
- docs/02-curriculum-framework-spec.md §1, §5

Invariant:
The resolver NEVER mutates the base item or content in-place or in the database.
It returns a localized view (or deep copy).
If the learner's pin does not match framework_id, it raises FrameworkPinMismatchError.
"""

import copy
from typing import Any, Dict, Optional, Union
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.db.models.framework import ContentLocalization, ItemLocalization


class ContentResolverError(Exception):
    """Base exception for content resolver."""
    pass


class FrameworkPinMismatchError(ContentResolverError, ValueError):
    """Raised when the requested framework_id does not match the learner's active pin."""
    pass


class ItemNotFoundError(ContentResolverError, KeyError):
    """Raised when the requested base item is not found."""
    pass


class ContentNotFoundError(ContentResolverError, KeyError):
    """Raised when the requested base content is not found."""
    pass


def resolve_item(
    db: Session,
    item_id: str,
    framework_id: str,
    learner_pin: str,
    base_item: Optional[Union[Dict[str, Any], Any]] = None,
) -> Dict[str, Any]:
    """Resolves an item for a learner pinned to a framework.
    
    1. Validates that learner_pin == framework_id. Raises FrameworkPinMismatchError if mismatched.
    2. Retrieves base item (from db or passed object).
    3. Deep-copies the base item so the original is never mutated.
    4. Queries item_localizations for (item_id, framework_id).
    5. If a localization row exists, applies stem_override, payload_override,
       and solution_override on top of the view.
    6. Returns the localized item view.
    """
    if learner_pin != framework_id:
        raise FrameworkPinMismatchError(
            f"Learner pin mismatch: learner is pinned to '{learner_pin}', but requested framework is '{framework_id}'."
        )

    # Convert base_item to dict if object
    if base_item is None:
        raise ItemNotFoundError(f"Base item '{item_id}' not found.")

    if hasattr(base_item, "__dict__"):
        base_dict = {
            k: v for k, v in base_item.__dict__.items() if not k.startswith("_")
        }
    elif isinstance(base_item, dict):
        base_dict = base_item
    else:
        raise ValueError(f"Unsupported base_item type: {type(base_item)}")

    # Deep copy to guarantee non-mutation invariant
    item_view = copy.deepcopy(base_dict)

    # Query localization overlay (only approved overrides are visible to learners)
    loc = db.scalars(
        select(ItemLocalization).where(
            ItemLocalization.item_id == item_id,
            ItemLocalization.framework_id == framework_id,
            ItemLocalization.review_status == "approved",
        )
    ).first()

    if loc:
        if loc.stem_override is not None:
            item_view["stem"] = copy.deepcopy(loc.stem_override)
        if loc.payload_override is not None:
            # Shallow/deep update of payload dictionary
            if isinstance(item_view.get("payload"), dict) and isinstance(loc.payload_override, dict):
                merged_payload = copy.deepcopy(item_view["payload"])
                merged_payload.update(copy.deepcopy(loc.payload_override))
                item_view["payload"] = merged_payload
            else:
                item_view["payload"] = copy.deepcopy(loc.payload_override)
        if loc.solution_override is not None:
            item_view["worked_solution"] = copy.deepcopy(loc.solution_override)
        item_view["is_localized"] = True
        item_view["framework_id"] = framework_id
    else:
        item_view["is_localized"] = False
        item_view["framework_id"] = framework_id

    return item_view


def resolve_content(
    db: Session,
    content_id: str,
    framework_id: str,
    learner_pin: str,
    base_content: Optional[Union[Dict[str, Any], Any]] = None,
) -> Dict[str, Any]:
    """Resolves lesson content for a learner pinned to a framework.
    
    1. Validates that learner_pin == framework_id.
    2. Deep-copies base content to prevent mutation.
    3. Queries content_localizations for (content_id, framework_id) with review_status == 'approved'.
    4. If found, applies section_overrides (sparse map of index -> Block[]).
    5. Returns the localized content view.
    """
    if learner_pin != framework_id:
        raise FrameworkPinMismatchError(
            f"Learner pin mismatch: learner is pinned to '{learner_pin}', but requested framework is '{framework_id}'."
        )

    if base_content is None:
        raise ContentNotFoundError(f"Base content '{content_id}' not found.")

    if hasattr(base_content, "__dict__"):
        base_dict = {
            k: v for k, v in base_content.__dict__.items() if not k.startswith("_")
        }
    elif isinstance(base_content, dict):
        base_dict = base_content
    else:
        raise ValueError(f"Unsupported base_content type: {type(base_content)}")

    content_view = copy.deepcopy(base_dict)

    loc = db.scalars(
        select(ContentLocalization).where(
            ContentLocalization.content_id == content_id,
            ContentLocalization.framework_id == framework_id,
            ContentLocalization.review_status == "approved",
        )
    ).first()


    if loc and loc.section_overrides:
        sections = copy.deepcopy(content_view.get("sections", []))
        # section_overrides is a sparse map: e.g. {"1": [...blocks...]} or {1: [...]}
        for idx_str, override_blocks in loc.section_overrides.items():
            try:
                idx = int(idx_str)
                if 0 <= idx < len(sections):
                    sections[idx] = copy.deepcopy(override_blocks)
            except (ValueError, TypeError):
                continue
        content_view["sections"] = sections
        content_view["is_localized"] = True
        content_view["framework_id"] = framework_id
    else:
        content_view["is_localized"] = False
        content_view["framework_id"] = framework_id

    return content_view
