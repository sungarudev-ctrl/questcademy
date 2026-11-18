#!/usr/bin/env python3
"""CI Gate: No Bulk Approve Endpoints in Backend API.

Source of truth:
- docs/tasks.md §9.15, §9.17
- docs/plan.md §6
- docs/02-curriculum-framework-spec.md §9

Rule:
No endpoint may offer bulk approval of items, content, mappings, or localizations.
Any path ending with /bulk must return HTTP 405 Method Not Allowed.
Any route pattern like bulk_approve, bulk-approve, or bulk approval handlers is forbidden.
"""

import os
import re
import sys
from pathlib import Path

# Pattern to detect any route decorator attempting to register bulk approval or operations other than the 405 gate
BULK_ROUTE_PATTERN = re.compile(r"""@router\.(get|post|put|patch|delete)\s*\(\s*["'].*bulk.*["']""", re.IGNORECASE)
BULK_DEF_PATTERN = re.compile(r"""def\s+(bulk_approve|approve_all|bulk_confirm|bulk_review|approve_bulk)\b""", re.IGNORECASE)


def check_no_bulk_endpoints(repo_root: Path) -> int:
    api_dir = repo_root / "backend" / "app" / "api"
    if not api_dir.exists():
        print(f"API directory {api_dir} not found.")
        return 0

    violations = []

    for root, _, files in os.walk(api_dir):
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

                # The 405 rejection handler uses @router.api_route to catch and block bulk calls
                if "reject_bulk_operations" in line or "status.HTTP_405_METHOD_NOT_ALLOWED" in line:
                    continue

                if BULK_ROUTE_PATTERN.search(stripped):
                    violations.append((rel_path, line_no, stripped))
                elif BULK_DEF_PATTERN.search(stripped):
                    violations.append((rel_path, line_no, stripped))

    if violations:
        print("=" * 70)
        print("ERROR: Forbidden bulk operation endpoint detected!")
        print("Curriculum framework governance (§9) strictly prohibits bulk approvals.")
        print("All review decisions must be made individually with human audit.")
        print("=" * 70)
        for rel_path, line_no, code in violations:
            print(f"  {rel_path}:{line_no}: {code}")
        print("=" * 70)
        return 1

    print("PASS: No bulk approval endpoints found in backend API routes.")
    return 0


if __name__ == "__main__":
    current = Path(__file__).resolve().parent
    repo_root = current.parent.parent
    sys.exit(check_no_bulk_endpoints(repo_root))
