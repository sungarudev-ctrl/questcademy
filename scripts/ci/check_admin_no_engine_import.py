#!/usr/bin/env python3
"""CI Gate: Admin UI Never Imports /engine.

Source of truth:
- docs/tasks.md §9.17
- docs/plan.md §5.4, §6

Rule:
The admin UI (web/src/app/(admin)) only reads persisted states and queries backend APIs;
it never bundles or calls engine code directly. Engine code is isolated to engine/ and
compiled to WASM strictly for student client apps.
"""

import os
import re
import sys
from pathlib import Path

# Match any import statement referencing engine
ENGINE_IMPORT_PATTERN = re.compile(
    r"""(?:from|import)\s+['"][^'"]*engine[^'"]*['"]|require\s*\(\s*['"][^'"]*engine[^'"]*['"]\s*\)""",
    re.IGNORECASE
)


def check_admin_no_engine_import(repo_root: Path) -> int:
    admin_dir = repo_root / "web" / "src" / "app" / "(admin)"
    if not admin_dir.exists():
        print(f"Admin UI directory {admin_dir} not found.")
        return 0

    violations = []

    for root, _, files in os.walk(admin_dir):
        for file_name in files:
            if not (file_name.endswith(".ts") or file_name.endswith(".tsx") or file_name.endswith(".js") or file_name.endswith(".jsx")):
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
                if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                    continue

                if ENGINE_IMPORT_PATTERN.search(stripped):
                    violations.append((rel_path, line_no, stripped))

    if violations:
        print("=" * 70)
        print("ERROR: Admin UI imports engine code directly!")
        print("Source of truth: docs/tasks.md §9.17")
        print("The Admin Studio must only communicate via backend REST/SSE APIs.")
        print("=" * 70)
        for rel_path, line_no, code in violations:
            print(f"  {rel_path}:{line_no}: {code}")
        print("=" * 70)
        return 1

    print("PASS: Admin UI does not import engine code.")
    return 0


if __name__ == "__main__":
    current = Path(__file__).resolve().parent
    repo_root = current.parent.parent
    sys.exit(check_admin_no_engine_import(repo_root))
