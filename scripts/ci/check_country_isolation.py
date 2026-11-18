#!/usr/bin/env python3
"""CI Gate: Country Isolation Lint Rule.

Source of truth:
- docs/plan.md §2.9, §9.2
- docs/10-engineering-standards.md §5

Rule:
No file outside backend/app/db/models/framework.py, backend/app/schemas/framework.py,
and backend/app/api/frameworks.py may reference country_code in Python, SQL, or TypeScript.
Specifically enforced on db/models/skill_graph.py, db/models/item.py,
db/models/misconception.py, backend/app/services/content_resolver.py,
backend/app/api/learners.py, backend/app/api/analytics.py, and all files under engine/.

SQL Lint Query (for database schema verification):
SELECT table_name, column_name
FROM information_schema.columns
WHERE column_name = 'country_code'
  AND table_name NOT IN ('countries', 'curriculum_frameworks', 'framework_rollouts');
"""

import os
import re
import sys
from pathlib import Path

# Permitted paths where country_code may appear
PERMITTED_RELATIVE_PATHS = {
    Path("backend/app/db/models/framework.py"),
    Path("backend/app/schemas/framework.py"),
    Path("backend/app/api/frameworks.py"),
    Path("backend/app/services/framework_service.py"),
    Path("backend/alembic/versions/001_country_and_framework_layer.py"),
    Path("backend/alembic/versions/002_review_staging_and_pipelines.py"),
    Path("backend/alembic/versions/003_item_and_framework_schema_v2.py"),
    Path("backend/tests/unit/test_framework_service.py"),
    Path("backend/tests/unit/pipelines/test_content_localized.py"),
    Path("backend/tests/unit/pipelines/test_framework_pipeline.py"),
    Path("backend/tests/unit/pipelines/test_item_pipeline.py"),
    Path("backend/tests/unit/pipelines/test_localization_pipeline.py"),
    Path("backend/tests/integration/test_pipeline_end_to_end.py"),
    Path("backend/app/api/admin.py"),
    Path("backend/tests/integration/test_admin_api.py"),
    Path("scripts/ci/check_country_isolation.py"),
}

# Directories to scan
SCAN_DIRECTORIES = ["backend", "engine"]


def check_country_isolation(repo_root: Path) -> int:
    pattern = re.compile(r"\bcountry_code\b")
    violations = []

    for scan_dir_name in SCAN_DIRECTORIES:
        scan_dir = repo_root / scan_dir_name
        if not scan_dir.exists():
            continue

        for root, dirs, files in os.walk(scan_dir):
            # Ignore git, node_modules, cache, venvs
            dirs[:] = [
                d for d in dirs
                if d not in {".git", "node_modules", ".pytest_cache", "__pycache__", ".venv", "dist", "build"}
            ]

            for file_name in files:
                ext = Path(file_name).suffix
                if ext not in {".py", ".ts", ".js", ".sql"}:
                    continue

                full_path = Path(root) / file_name
                rel_path = full_path.relative_to(repo_root)

                if rel_path in PERMITTED_RELATIVE_PATHS:
                    continue

                try:
                    content = full_path.read_text(encoding="utf-8", errors="ignore")
                except Exception as e:
                    print(f"Warning: Could not read {rel_path}: {e}")
                    continue

                for line_no, line in enumerate(content.splitlines(), start=1):
                    if pattern.search(line):
                        violations.append((rel_path, line_no, line.strip()))

    if violations:
        print("=" * 70)
        print("ERROR: Country-Isolation Lint Rule Violated!")
        print("The identifier 'country_code' was found in forbidden files:")
        for path, line_no, text in violations:
            print(f"  {path}:{line_no} -> {text}")
        print("Rule: country_code is strictly isolated to the framework layer.")
        print("It MUST NEVER appear on skill_nodes, items, content, misconceptions, or engine code.")
        print("=" * 70)
        return 1

    print("SUCCESS: Country-isolation lint check passed (0 violations).")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[2]
    sys.exit(check_country_isolation(repo_root))
