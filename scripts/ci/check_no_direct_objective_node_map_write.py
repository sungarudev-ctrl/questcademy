#!/usr/bin/env python3
"""CI Gate: Prohibition of Direct Writes to objective_node_map.

Source of truth:
- docs/02-curriculum-framework-spec.md §3, §9
- docs/plan.md §3.4
- Task 8 §8.4, §8.10

Rule:
AI pipelines and workers MUST NEVER write directly to objective_node_map.
Pipeline C proposes mappings into objective_node_map_proposals (review_status='pending').
Only the human curriculum lead, via framework_service.map_objective, is authorized
to insert into objective_node_map.
"""

import os
import re
import sys
from pathlib import Path

FORBIDDEN_PATTERN = re.compile(r"\bObjectiveNodeMap\s*\(")

SCAN_DIRS = [
    Path("backend/app/ai"),
    Path("backend/app/workers"),
]

PERMITTED_FILES = {
    # Only framework_service is permitted to create ObjectiveNodeMap rows
    Path("backend/app/services/framework_service.py"),
}


def check_no_direct_objective_node_map_write(repo_root: Path) -> int:
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

                if rel_path in PERMITTED_FILES:
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

                    # Check for instantiation of ObjectiveNodeMap(...)
                    if FORBIDDEN_PATTERN.search(line):
                        violations.append((rel_path, line_no, line.strip()))

    if violations:
        print("=" * 70)
        print("ERROR: Direct instantiation of ObjectiveNodeMap found in AI/Worker code!")
        print("AI pipelines must write proposals to ObjectiveNodeMapProposal only.")
        for path, line_no, text in violations:
            print(f"  {path}:{line_no} -> {text}")
        print("=" * 70)
        return 1

    print("SUCCESS: Zero direct ObjectiveNodeMap writes found in AI and worker layers.")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    sys.exit(check_no_direct_objective_node_map_write(repo_root))
