"""Objective extractor tool reading syllabus text and returning verbatim objectives.

Source of truth:
- docs/plan.md §3.4
- docs/02-curriculum-framework-spec.md §6
- Task 8 §8.3
"""

from typing import Any, Dict, List, Optional, Union
from backend.app.ai.gemini import GeminiClient


class ObjectiveExtractor:
    """Extracts verbatim syllabus objectives using framework_extraction prompt."""

    def __init__(self, gemini_client: Optional[GeminiClient] = None):
        self.client = gemini_client or GeminiClient()

    def extract(
        self,
        framework_id: str,
        source_text: str,
        grade_bands: str = "JSS1, JSS2, JSS3",
        job_id: Optional[str] = None,
        db: Optional[Any] = None,
    ) -> List[Dict[str, Any]]:
        """Extract verbatim syllabus objectives from source syllabus text."""
        variables = {
            "framework_id": framework_id,
            "grade_bands": grade_bands,
            "syllabus_text": source_text,
        }

        response = self.client.generate_json(
            prompt_name="framework_extraction",
            variables=variables,
            framework_id=framework_id,
            job_id=job_id,
            db=db,
        )

        objectives = response.get("objectives", [])
        return objectives

