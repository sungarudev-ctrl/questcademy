"""Gate: web/ and mobile/ must not implement engine predicates (docs/sync-contract.md §9, Task 12.12).

Mastery, Elo, selection, placement and FSRS live only in /engine. Clients import it
(web) or bind to its build (mobile). Exit 1 and list offenders on violation.
"""

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCAN = [(ROOT / "web" / "src", {".ts", ".tsx"}), (ROOT / "mobile" / "lib", {".dart"})]

PATTERNS = [
    (re.compile(r"\b(static\s+)?bool\s+isMastered\s*\("), "re-implements isMastered"),
    (re.compile(r"function\s+isMastered\s*\("), "re-implements isMastered"),
    (re.compile(r"^\s*(static\s+)?[A-Z]\w*\s+updateElo\s*\("), "re-implements updateElo"),
    (re.compile(r"function\s+updateElo\s*\("), "re-implements updateElo"),
    (re.compile(r"-285(\.0)?\b.*-115|tierOffset", re.I), "bakes Elo tier offsets"),
    (re.compile(r"math\.pow\(\s*10(\.0)?\s*,"), "inlines the Elo expected-score formula"),
    (re.compile(r"Math\.pow\(\s*10\s*,|10\s*\*\*\s*\("), "inlines the Elo expected-score formula"),
]


def main() -> int:
    offenders = []
    for base, exts in SCAN:
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if path.suffix not in exts or "node_modules" in path.parts or "test" in path.parts:
                continue
            for lineno, line in enumerate(path.read_text(encoding="utf8", errors="ignore").splitlines(), 1):
                for pattern, why in PATTERNS:
                    if pattern.search(line):
                        offenders.append(f"{path.relative_to(ROOT)}:{lineno}: {why}")
    if offenders:
        print("Engine predicates must not be implemented in clients:")
        print("\n".join(offenders))
        return 1
    print("OK: no client-side engine predicates")
    return 0


if __name__ == "__main__":
    sys.exit(main())
