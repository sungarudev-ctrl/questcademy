#!/usr/bin/env python3
"""CI Gate: Disallow dangerouslySetInnerHTML in student client code.

Rule:
Direct HTML injection introduces XSS risks. All rich text and mathematics
must be processed through BlockRenderer and KaTeX abstractions without raw
dangerouslySetInnerHTML invocations.
"""

import os
import re
import sys
from pathlib import Path

TARGET_DIRS = [
    Path("web/src/app/(student)"),
    Path("web/src/components/student"),
]

PATTERN = re.compile(r"dangerouslySetInnerHTML", re.IGNORECASE)


def check_no_raw_html(repo_root: Path) -> int:
    violations = []

    for dir_rel in TARGET_DIRS:
        dir_path = repo_root / dir_rel
        if not dir_path.exists():
            continue

        for root, _, files in os.walk(dir_path):
            for file_name in files:
                if not file_name.endswith((".tsx", ".ts", ".jsx", ".js")):
                    continue

                full_path = Path(root) / file_name
                rel_path = full_path.relative_to(repo_root)

                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    for line_no, line in enumerate(f, start=1):
                        if PATTERN.search(line):
                            violations.append((rel_path, line_no, line.strip()))

    if violations:
        print("=" * 75)
        print("ERROR: dangerouslySetInnerHTML detected in student UI components!")
        for rel_path, line_no, snippet in violations:
            print(f"  {rel_path}:{line_no} -> {snippet}")
        print("=" * 75)
        return 1

    print("[PASS] dangerouslySetInnerHTML check: 0 occurrences in student UI.")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    sys.exit(check_no_raw_html(repo_root))
