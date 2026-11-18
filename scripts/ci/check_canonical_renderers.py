#!/usr/bin/env python3
"""CI Gate: Canonical Single-Source Renderers.

Source of truth:
- docs/tasks.md §9.13, §9.17
- docs/plan.md §5.4
- docs/10-engineering-standards.md

Rule:
There is exactly one BlockRenderer and one ItemRenderer shared across all client and admin views.
Forking, renaming, or reimplementing these renderers in subdirectories is strictly prohibited.
All imports must reference the canonical path:
- '@/components/render/BlockRenderer'
- '@/components/render/ItemRenderer'
"""

import os
import re
import sys
from pathlib import Path

CANONICAL_BLOCK_RENDERER = Path("web/src/components/render/BlockRenderer.tsx")
CANONICAL_ITEM_RENDERER = Path("web/src/components/render/ItemRenderer.tsx")

RENDERER_FILE_PATTERN = re.compile(r"^(BlockRenderer|ItemRenderer)\.(tsx|jsx|ts|js)$", re.IGNORECASE)


def check_canonical_renderers(repo_root: Path) -> int:
    web_dir = repo_root / "web"
    if not web_dir.exists():
        print(f"Web directory {web_dir} not found.")
        return 0

    canonical_block = repo_root / CANONICAL_BLOCK_RENDERER
    canonical_item = repo_root / CANONICAL_ITEM_RENDERER

    if not canonical_block.exists():
        print(f"ERROR: Canonical BlockRenderer missing at {CANONICAL_BLOCK_RENDERER}")
        return 1
    if not canonical_item.exists():
        print(f"ERROR: Canonical ItemRenderer missing at {CANONICAL_ITEM_RENDERER}")
        return 1

    violations = []

    for root, _, files in os.walk(web_dir):
        for file_name in files:
            if RENDERER_FILE_PATTERN.match(file_name):
                full_path = Path(root) / file_name
                rel_path = full_path.relative_to(repo_root)

                # Must match canonical paths exactly (normalizing separators)
                if rel_path != CANONICAL_BLOCK_RENDERER and rel_path != CANONICAL_ITEM_RENDERER:
                    violations.append(rel_path)

    if violations:
        print("=" * 70)
        print("ERROR: Duplicate/forked renderer implementations found!")
        print("docs/tasks.md §9.17 requires single-source canonical renderers:")
        print(f"  - {CANONICAL_BLOCK_RENDERER}")
        print(f"  - {CANONICAL_ITEM_RENDERER}")
        print("=" * 70)
        for v in violations:
            print(f"  Duplicate: {v}")
        print("=" * 70)
        return 1

    print("PASS: Exactly one canonical BlockRenderer and ItemRenderer found.")
    return 0


if __name__ == "__main__":
    current = Path(__file__).resolve().parent
    repo_root = current.parent.parent
    sys.exit(check_canonical_renderers(repo_root))
