#!/usr/bin/env python3
"""CI Gate: Dignity Constraints Enforcement (§10.2, §10.8).

Source of truth:
- docs/tasks.md §10.2, §10.8
- docs/04-learning-science.md

Rule:
The student web application strictly forbids:
- Grade level displays
- Percentiles or ranks
- Peer comparisons ("behind" / "ahead" language)
All copy must be forward-looking ("your starting point", "next up", "your weekly goal").
"""

import os
import re
import sys
from pathlib import Path

FORBIDDEN_PATTERNS = [
    (re.compile(r"\bgrade\s+level\b", re.IGNORECASE), "Grade level references are forbidden in student UI"),
    (re.compile(r"\bbehind\s+(your\s+)?peers\b", re.IGNORECASE), "Peer comparison ('behind peers') is forbidden"),
    (re.compile(r"\bahead\s+of\s+(your\s+)?peers\b", re.IGNORECASE), "Peer comparison ('ahead of peers') is forbidden"),
    (re.compile(r"\bpercentile\b", re.IGNORECASE), "Percentile rankings are forbidden in student UI"),
    (re.compile(r"\b(class|student|school)\s+rank\b", re.IGNORECASE), "Rankings are forbidden in student UI"),
]

STUDENT_DIRECTORIES = [
    Path("web/src/app/(student)"),
    Path("web/src/components/student"),
]


def check_dignity_constraints(repo_root: Path) -> int:
    violations = []

    for dir_rel in STUDENT_DIRECTORIES:
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
                        for pattern, rule_desc in FORBIDDEN_PATTERNS:
                            if pattern.search(line):
                                violations.append((rel_path, line_no, line.strip(), rule_desc))

    if violations:
        print("=" * 75)
        print("ERROR: Dignity Constraint Violations detected in student application!")
        print("Specification §10.2 & §10.8 forbids grade levels, percentiles, ranks, and peer comparisons.")
        print("-" * 75)
        for rel_path, line_no, snippet, rule in violations:
            print(f"  {rel_path}:{line_no} -> {rule}")
            print(f"    Line: \"{snippet}\"")
        print("=" * 75)
        return 1

    print("[PASS] Dignity constraints check: 0 violations found across student routes and components.")
    return 0


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent.parent
    sys.exit(check_dignity_constraints(repo_root))
