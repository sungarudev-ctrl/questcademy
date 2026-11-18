#!/usr/bin/env python3
"""CI Gate: Prompt Location Enforcement.

Source of truth:
- docs/plan.md §3.1, §9.2
- Task 8 §8.1, §8.10

Rule:
NO pipeline code may hardcode prompts or prompt strings.
All prompts must reside in shared/prompts/v1/*.md with frontmatter schemas.
Pipelines must call GeminiClient with prompt_name referring to files in shared/prompts/v1/.
"""

import os
import re
import sys
from pathlib import Path

FORBIDDEN_PATTERNS = [
    (re.compile(r'["\']You are (a|an)\b', re.IGNORECASE), "Hardcoded system prompt 'You are a/an'"),
    (re.compile(r'["\']Return (a )?valid JSON\b', re.IGNORECASE), "Hardcoded JSON instruction"),
    (re.compile(r'["\']Output format:\s*JSON\b', re.IGNORECASE), "Hardcoded output format directive"),
]

PIPELINES_DIR = Path("backend/app/ai/pipelines")


def check_prompt_locations(repo_root: Path) -> int:
    target_dir = repo_root / PIPELINES_DIR
    if not target_dir.exists():
        print(f"Error: Directory {target_dir} not found.")
        return 1

    violations = []
    for root, _, files in os.walk(target_dir):
        for file_name in files:
            if not file_name.endswith(".py"):
                continue

            full_path = Path(root) / file_name
            rel_path = full_path.relative_to(repo_root)

            try:
                content = full_path.read_text(encoding="utf-8", errors="ignore")
            except Exception as e:
                print(f"Warning: Could not read {rel_path}: {e}")
                continue

            for line_no, line in enumerate(content.splitlines(), start=1):
                # Ignore comment lines
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue

                for pattern, desc in FORBIDDEN_PATTERNS:
                    if pattern.search(line):
                        violations.append((rel_path, line_no, desc, line.strip()))

    if violations:
        print("=" * 70)
        print("ERROR: Hardcoded Prompts Detected in Pipelines!")
        print("All prompts must be loaded from shared/prompts/v1/*.md.")
        for path, line_no, desc, text in violations:
            print(f"  {path}:{line_no} [{desc}] -> {text}")
        print("=" * 70)
        return 1

    print("SUCCESS: Prompt location check passed (no hardcoded prompts in pipelines).")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    sys.exit(check_prompt_locations(repo_root))
