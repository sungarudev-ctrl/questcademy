"""Unit tests for shared prompt library.

Source of truth:
- docs/plan.md §3
- Task 8 §8.1, §8.9
"""

import re
import json
from pathlib import Path
import pytest
from backend.app.ai.gemini import parse_frontmatter, PROMPTS_DIR

CHANGELOG_PATH = PROMPTS_DIR.parent / "CHANGELOG.md"


REQUIRED_PROMPTS = [
    "node_authoring",
    "content_canonical",
    "content_localized",
    "item_generation",
    "item_localization",
    "framework_extraction",
    "framework_mapping",
    "self_evaluation",
    "localization_refresh",
]


def test_all_required_prompt_files_exist():
    """Verify all 9 prompts exist in shared/prompts/v1/."""
    for prompt_name in REQUIRED_PROMPTS:
        prompt_file = PROMPTS_DIR / f"{prompt_name}.md"
        assert prompt_file.exists(), f"Missing required prompt file: {prompt_file}"


def test_every_prompt_has_valid_version_header_and_rules():
    """Verify every prompt has PROMPT_VERSION header, System Prompt, and RULES block."""
    for prompt_name in REQUIRED_PROMPTS:
        prompt_file = PROMPTS_DIR / f"{prompt_name}.md"
        content = prompt_file.read_text(encoding="utf-8")

        # Must have frontmatter
        assert content.startswith("---"), f"{prompt_name}.md missing frontmatter opening '---'"
        frontmatter, body = parse_frontmatter(content)

        # Version check
        assert "PROMPT_VERSION" in frontmatter, f"{prompt_name}.md missing PROMPT_VERSION"
        assert re.match(r"^\d+\.\d+\.\d+$", str(frontmatter["PROMPT_VERSION"])), f"Invalid semver in {prompt_name}.md"

        # Check required sections
        assert "# System Prompt" in body, f"{prompt_name}.md missing '# System Prompt'"
        assert "# RULES" in body, f"{prompt_name}.md missing '# RULES'"
        assert "# User Template" in body, f"{prompt_name}.md missing '# User Template'"


def test_every_json_emitting_prompt_declares_mime_type_and_schema():
    """Verify every JSON-emitting prompt declares application/json and has a valid JSON schema."""
    for prompt_name in REQUIRED_PROMPTS:
        prompt_file = PROMPTS_DIR / f"{prompt_name}.md"
        content = prompt_file.read_text(encoding="utf-8")
        frontmatter, _ = parse_frontmatter(content)

        mime_type = frontmatter.get("response_mime_type")
        assert mime_type == "application/json", f"{prompt_name}.md does not declare response_mime_type: application/json"

        schema_rel = frontmatter.get("schema")
        assert schema_rel, f"{prompt_name}.md missing schema reference"
        repo_root = PROMPTS_DIR.parent.parent.parent
        schema_path = repo_root / schema_rel
        assert schema_path.exists(), f"Schema file does not exist: {schema_path}"

        # Schema must be valid JSON
        with open(schema_path, "r", encoding="utf-8") as f:
            schema_data = json.load(f)
            assert isinstance(schema_data, dict)
            assert schema_data.get("type") == "object"



def test_changelog_records_every_prompt_version():
    """Verify CHANGELOG.md exists and documents every prompt version."""
    assert CHANGELOG_PATH.exists(), f"Missing CHANGELOG.md at {CHANGELOG_PATH}"
    changelog = CHANGELOG_PATH.read_text(encoding="utf-8")

    assert "[1.0.0]" in changelog
    for prompt_name in REQUIRED_PROMPTS:
        assert f"{prompt_name}.md" in changelog, f"CHANGELOG.md does not reference {prompt_name}.md"
