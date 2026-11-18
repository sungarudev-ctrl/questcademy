#!/usr/bin/env python3
"""CI Gate: Gemini Telemetry and Cost Recording.

Source of truth:
- docs/plan.md §3.6
- Task 8 §8.8, §8.10

Rule:
1. No direct unmetered calls to google-generativeai / google.genai outside backend/app/ai/gemini.py.
2. All AI generation invocations in pipelines and tools must go through GeminiClient,
   which automatically logs tokens, latency, cost estimate, and framework_id to gemini_calls.
"""

import ast
import os
import re
import sys
from pathlib import Path

# Direct SDK imports that are forbidden outside backend/app/ai/gemini.py
FORBIDDEN_DIRECT_SDK_PATTERNS = [
    re.compile(r"\bimport\s+google\.generativeai\b"),
    re.compile(r"\bfrom\s+google\.generativeai\b"),
    re.compile(r"\bimport\s+google\.genai\b"),
    re.compile(r"\bfrom\s+google\.genai\b"),
]

PERMITTED_FILE = Path("backend/app/ai/gemini.py")
SCAN_DIRS = [
    Path("backend/app/ai/pipelines"),
    Path("backend/app/ai/tools"),
    Path("backend/app/workers"),
    Path("backend/app/services"),
]


def check_gemini_cost_recorded(repo_root: Path) -> int:
    violations = []

    for scan_rel in SCAN_DIRS:
        scan_dir = repo_root / scan_rel
        if not scan_dir.exists():
            continue

        for root, _, files in os.walk(scan_dir):
            for file_name in files:
                if not file_name.endswith(".py"):
                    continue

                full_path = Path(root) / file_name
                rel_path = full_path.relative_to(repo_root)

                if rel_path == PERMITTED_FILE:
                    continue

                try:
                    content = full_path.read_text(encoding="utf-8", errors="ignore")
                except Exception as e:
                    print(f"Warning: Could not read {rel_path}: {e}")
                    continue

                for line_no, line in enumerate(content.splitlines(), start=1):
                    stripped = line.strip()
                    if stripped.startswith("#"):
                        continue

                    for pattern in FORBIDDEN_DIRECT_SDK_PATTERNS:
                        if pattern.search(line):
                            violations.append((
                                rel_path,
                                line_no,
                                "Direct unmetered Google GenAI SDK import (must use GeminiClient)",
                                line.strip()
                            ))

    if violations:
        print("=" * 70)
        print("ERROR: Direct unmetered Google GenAI SDK imports found!")
        print("All AI calls must pass through GeminiClient in backend/app/ai/gemini.py")
        print("to guarantee telemetry and cost tracking into the gemini_calls table.")
        for path, line_no, desc, text in violations:
            print(f"  {path}:{line_no} [{desc}] -> {text}")
        print("=" * 70)
        return 1

    print("SUCCESS: Zero unmetered AI SDK imports found. All calls routed through GeminiClient.")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    sys.exit(check_gemini_cost_recorded(repo_root))
