"""Objective mapper proposing candidate objective-to-node mappings with confidence scores.

Source of truth:
- docs/02-curriculum-framework-spec.md §3 (Rules M-1 through M-5)
- Task 8 §8.3

Invariant:
This tool NEVER writes to the database. It returns proposals only.
"""

from typing import Any, Dict, List, Optional
from backend.app.ai.gemini import GeminiClient


class ObjectiveMapper:
    """Proposes candidate objective-to-node mappings using framework_mapping prompt."""

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()

    def propose_mappings(
        self,
        framework_id: str,
        objectives: List[Dict[str, Any]],
        nodes: List[Dict[str, Any]],
        job_id: Optional[str] = None,
        db: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """Generate mapping proposals with confidence scores for syllabus objectives.
        
        Never writes to database. Returns proposals only.
        """
        variables = {
            "framework_id": framework_id,
            "objectives": objectives,
            "nodes": nodes,
        }

        response = self.client.generate_json(
            prompt_name="framework_mapping",
            variables=variables,
            framework_id=framework_id,
            job_id=job_id,
            db=db,
        )

        proposals = response.get("proposals", [])

        return proposals
