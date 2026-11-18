"""Gemini client wrapping LLM invocations with strict JSON schema, retries, and cost telemetry.

Source of truth:
- docs/plan.md §3.6
- Task 8 §8.2
"""

import json
import os
import re
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple, Union

from backend.app.services import cost_service


def find_prompts_dir() -> Path:
    """Locate the shared/prompts/v1 directory by traversing ancestor directories."""
    curr = Path(__file__).resolve()
    for parent in curr.parents:
        candidate = parent / "shared" / "prompts" / "v1"
        if candidate.exists():
            return candidate
    # Fallback to relative assumption
    return curr.parents[3] / "shared" / "prompts" / "v1"


# Path to shared prompt library
PROMPTS_DIR = find_prompts_dir()

# In-memory prompt cache: prompt_name -> parsed dict
_PROMPT_CACHE: Dict[str, Dict[str, Any]] = {}

# Mock client for unit & integration testing
_MOCK_RESPONDER = None



def parse_frontmatter(text: str) -> Tuple[Dict[str, str], str]:
    """Parse YAML-style frontmatter without external dependencies."""
    if not text.startswith("---"):
        return {}, text
    parts = text.split("---", 2)
    if len(parts) < 3:
        return {}, text
    frontmatter_text = parts[1]
    body = parts[2]
    meta = {}
    for line in frontmatter_text.strip().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            meta[k.strip()] = v.strip().strip("'\"")
    return meta, body


def set_mock_responder(responder):
    """Set a mock responder callable: responder(model, prompt_name, prompt_version, system_instruction, user_prompt) -> dict"""
    global _MOCK_RESPONDER
    _MOCK_RESPONDER = responder


def clear_mock_responder():
    """Clear mock responder."""
    global _MOCK_RESPONDER
    _MOCK_RESPONDER = None


def load_prompt(prompt_name: str) -> Dict[str, Any]:
    """Load and parse prompt markdown file from shared/prompts/v1/.
    
    Caches parsed prompt in memory.
    """
    if prompt_name in _PROMPT_CACHE:
        return _PROMPT_CACHE[prompt_name]

    file_path = PROMPTS_DIR / f"{prompt_name}.md"
    if not file_path.exists():
        raise FileNotFoundError(f"Prompt file '{file_path}' does not exist.")

    content = file_path.read_text(encoding="utf-8")

    # Parse frontmatter
    frontmatter, body = parse_frontmatter(content)


    # Extract sections: System Prompt, RULES, User Template
    system_prompt = ""
    rules = ""
    user_template = ""

    sections = re.split(r"^#\s+(.+)$", body, flags=re.MULTILINE)
    # sections is ['', 'System Prompt', content, 'RULES', content, 'User Template', content]
    for i in range(1, len(sections), 2):
        header = sections[i].strip()
        text = sections[i + 1].strip() if i + 1 < len(sections) else ""
        if header == "System Prompt":
            system_prompt = text
        elif header == "RULES":
            rules = text
        elif header == "User Template":
            user_template = text

    # Combined system instruction includes the rules
    full_system = f"{system_prompt}\n\n# RULES\n{rules}" if rules else system_prompt

    # Load JSON schema if declared
    json_schema = None
    schema_rel = frontmatter.get("schema")
    if schema_rel:
        schema_path = PROMPTS_DIR.parent.parent / schema_rel
        if schema_path.exists():
            with open(schema_path, "r", encoding="utf-8") as f:
                json_schema = json.load(f)

    parsed = {
        "prompt_name": prompt_name,
        "version": str(frontmatter.get("PROMPT_VERSION", "1.0.0")),
        "response_mime_type": frontmatter.get("response_mime_type", "application/json"),
        "model_target": frontmatter.get("model_target", "gemini-2.5-flash"),
        "pipeline": frontmatter.get("pipeline", "default"),
        "schema": json_schema,
        "system_instruction": full_system,
        "user_template": user_template,
    }

    _PROMPT_CACHE[prompt_name] = parsed
    return parsed


def format_template(template: str, variables: Dict[str, Any]) -> str:
    """Format template replacing {{key}} with value."""
    result = template
    for key, val in variables.items():
        placeholder = f"{{{{{key}}}}}"
        str_val = json.dumps(val, indent=2) if isinstance(val, (dict, list)) else str(val)
        result = result.replace(placeholder, str_val)
    return result


class GeminiClient:
    """Gemini API client with schema enforcement, retries, and cost tracking."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")

    def generate_json(
        self,
        prompt_name: str,
        variables: Dict[str, Any],
        model: Optional[str] = None,
        framework_id: Optional[str] = None,
        job_id: Optional[str] = None,
        db: Optional[Any] = None,
        max_retries: int = 3,
    ) -> Dict[str, Any]:
        """Execute a prompt and return validated JSON response.
        
        Logs every call and cost to gemini_calls.
        Retries on transient errors with exponential backoff.
        """
        prompt_info = load_prompt(prompt_name)
        selected_model = model or prompt_info["model_target"]
        system_instruction = prompt_info["system_instruction"]
        user_prompt = format_template(prompt_info["user_template"], variables)
        prompt_version = prompt_info["version"]
        pipeline_name = prompt_info["pipeline"]

        # If mock responder is active (unit tests / integration harness)
        if _MOCK_RESPONDER is not None:
            start_time = time.time()
            response_json, in_tokens, out_tokens = _MOCK_RESPONDER(
                model=selected_model,
                prompt_name=prompt_name,
                prompt_version=prompt_version,
                system_instruction=system_instruction,
                user_prompt=user_prompt,
                variables=variables,
            )
            latency_ms = int((time.time() - start_time) * 1000)

            # Record cost tracking
            cost_service.record_call(
                model=selected_model,
                prompt_version=prompt_version,
                input_tokens=in_tokens,
                output_tokens=out_tokens,
                latency_ms=latency_ms,
                pipeline_name=pipeline_name,
                framework_id=framework_id,
                job_id=job_id,
                db=db,
            )
            return response_json

        # Live Gemini API call with retries
        last_error = None
        for attempt in range(max_retries):
            start_time = time.time()
            try:
                # Use google.genai / google.generativeai
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=self.api_key)
                config = types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                )
                if prompt_info["schema"]:
                    config.response_schema = prompt_info["schema"]

                response = client.models.generate_content(
                    model=selected_model,
                    contents=user_prompt,
                    config=config,
                )

                latency_ms = int((time.time() - start_time) * 1000)
                usage = getattr(response, "usage_metadata", None)
                in_tokens = getattr(usage, "prompt_token_count", 0) if usage else 500
                out_tokens = getattr(usage, "candidates_token_count", 0) if usage else 500

                # Record cost tracking
                cost_service.record_call(
                    model=selected_model,
                    prompt_version=prompt_version,
                    input_tokens=in_tokens,
                    output_tokens=out_tokens,
                    latency_ms=latency_ms,
                    pipeline_name=pipeline_name,
                    framework_id=framework_id,
                    job_id=job_id,
                    db=db,
                )


                parsed_result = json.loads(response.text)
                return parsed_result

            except Exception as e:
                last_error = e
                backoff = 2 ** attempt
                time.sleep(backoff)

        raise RuntimeError(f"Gemini API call failed after {max_retries} attempts: {last_error}")
