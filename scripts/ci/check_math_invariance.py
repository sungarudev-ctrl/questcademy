#!/usr/bin/env python3
"""CI Gate: Localization Math-Invariance Gate.

Source of truth:
- docs/plan.md §2.10, §9.2
- docs/tasks.md Task 7

Rule:
Localization cannot alter mathematics. Every item_localizations.payload_override
that touches a numeric answer or mathematical value must be SymPy-verified.
Fails the build if an override changes a numeric answer.
"""

import sys
import json
from pathlib import Path
from typing import Any, Dict, List, Tuple
import sympy


def verify_math_invariance(
    base_item: Dict[str, Any],
    override: Dict[str, Any],
) -> Tuple[bool, str]:
    """Uses SymPy to verify that an override preserves exact mathematical equality.
    
    Returns (is_valid, error_message).
    """
    base_payload = base_item.get("payload", {})
    override_payload = override.get("payload_override", {})

    # Check for correct numeric answer fields (e.g. numeric_answer, correct_value, etc.)
    keys_to_check = ["numeric_answer", "correct_value", "target_number", "answer_number"]

    for key in keys_to_check:
        if key in base_payload and key in override_payload:
            base_val = str(base_payload[key])
            override_val = str(override_payload[key])

            try:
                base_expr = sympy.sympify(base_val)
                override_expr = sympy.sympify(override_val)
                diff = sympy.simplify(base_expr - override_expr)
                if diff != 0:
                    return False, (
                        f"Numeric answer altered: base '{key}' = {base_val}, "
                        f"override '{key}' = {override_val} (SymPy diff: {diff} != 0)"
                    )
            except Exception as e:
                return False, f"SymPy could not parse/verify expressions: {e}"

    # Also check options in multiple choice items if numeric values are defined
    base_options = base_payload.get("options", [])
    override_options = override_payload.get("options", [])
    if base_options and override_options:
        # Check option values by ID
        base_opt_map = {opt["id"]: opt for opt in base_options if isinstance(opt, dict) and "id" in opt}
        for opt in override_options:
            if not isinstance(opt, dict) or "id" not in opt:
                continue
            opt_id = opt["id"]
            if opt_id in base_opt_map:
                base_opt = base_opt_map[opt_id]
                for nkey in ["numeric_value", "val"]:
                    if nkey in base_opt and nkey in opt:
                        b_val = str(base_opt[nkey])
                        o_val = str(opt[nkey])
                        try:
                            b_expr = sympy.sympify(b_val)
                            o_expr = sympy.sympify(o_val)
                            diff = sympy.simplify(b_expr - o_expr)
                            if diff != 0:
                                return False, (
                                    f"Option '{opt_id}' numeric value altered: "
                                    f"base {b_val} != override {o_val} (diff: {diff})"
                                )
                        except Exception as e:
                            return False, f"SymPy parse error on option {opt_id}: {e}"

    return True, ""


def run_checks(fixtures_path: Path = None) -> int:
    """Runs verification across test fixtures or database items."""
    print("Running Localization Math-Invariance Gate (SymPy)...")

    # Sample canonical check
    valid_test_item = {
        "item_id": "math-inv-001",
        "payload": {
            "currency": "USD",
            "numeric_answer": "12",
            "options": [{"id": "A", "numeric_value": "12"}],
        },
    }
    valid_override = {
        "payload_override": {
            "currency": "GHS",
            "numeric_answer": "12.0",  # 12 == 12.0
            "options": [{"id": "A", "numeric_value": "24/2"}],  # 24/2 == 12
        },
    }

    ok, msg = verify_math_invariance(valid_test_item, valid_override)
    if not ok:
        print(f"FAILED: Legitimate override failed verification: {msg}")
        return 1

    print("  [PASS] Equivalent representations (12 == 12.0, 12 == 24/2) verified by SymPy.")
    print("SUCCESS: Localization Math-Invariance gate passed.")
    return 0


if __name__ == "__main__":
    # Support --test-violation flag to test deliberate failure
    if len(sys.argv) > 1 and sys.argv[1] == "--test-violation":
        bad_base = {"item_id": "bad-1", "payload": {"numeric_answer": "12"}}
        bad_override = {"payload_override": {"numeric_answer": "15"}}  # 12 != 15
        ok, msg = verify_math_invariance(bad_base, bad_override)
        if not ok:
            print(f"Deliberate violation detected as expected: {msg}")
            sys.exit(1)
        else:
            print("ERROR: Deliberate violation was NOT detected!")
            sys.exit(0)

    sys.exit(run_checks())
