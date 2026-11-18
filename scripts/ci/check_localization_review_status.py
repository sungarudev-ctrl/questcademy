#!/usr/bin/env python3
"""CI Gate: Review Status Staging for Localizations.

Source of truth:
- docs/plan.md §2.10, §3.4
- Task 8 §8.6, §8.10

Rule:
All localizations (ItemLocalization, ContentLocalization) and mapping proposals
(ObjectiveNodeMapProposal) created by pipelines MUST stage with review_status='pending'.
No pipeline or automated worker code may set review_status='approved'.
Approval requires explicit human action.
"""

import os
import re
import sys
from pathlib import Path

FORBIDDEN_APPROVAL_PATTERN = re.compile(r"review_status\s*=\s*['\"]approved['\"]")

SCAN_DIR = Path("backend/app/ai/pipelines")


def check_localization_review_status(repo_root: Path) -> int:
    target_dir = repo_root / SCAN_DIR
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
                stripped = line.strip()
                if stripped.startswith("#"):
                    continue

                if FORBIDDEN_APPROVAL_PATTERN.search(line):
                    violations.append((rel_path, line_no, line.strip()))

    if violations:
        print("=" * 70)
        print("ERROR: Pipeline code sets review_status='approved'!")
        print("All generated items, content overrides, and proposals must stage as 'pending'.")
        for path, line_no, text in violations:
            print(f"  {path}:{line_no} -> {text}")
        print("=" * 70)
        return 1

    print("SUCCESS: Localization review staging check passed (zero automated approvals in pipelines).")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    sys.exit(check_localization_review_status(repo_root))
