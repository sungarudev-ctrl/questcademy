#!/usr/bin/env python3
"""Generate canonical renderer fixtures in shared/renderer-fixtures/ per §11.9."""

import json
from pathlib import Path

FIXTURES_DIR = Path("shared/renderer-fixtures")
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

FIXTURES = {
    # Blocks
    "block_heading_h1.json": {
        "fixture_id": "block_heading_h1",
        "kind": "block",
        "blocks": [
            {"block_id": "b-h1", "type": "heading", "payload": {"level": 1, "text": "Linear Equations and Inequalities"}}
        ]
    },
    "block_heading_h2.json": {
        "fixture_id": "block_heading_h2",
        "kind": "block",
        "blocks": [
            {"block_id": "b-h2", "type": "heading", "payload": {"level": 2, "text": "Solving for Unknown Variables"}}
        ]
    },
    "block_paragraph_basic.json": {
        "fixture_id": "block_paragraph_basic",
        "kind": "block",
        "blocks": [
            {"block_id": "b-p1", "type": "text", "payload": {"text": "A linear equation represents a straight line on the Cartesian coordinate plane."}}
        ]
    },
    "block_math_formula.json": {
        "fixture_id": "block_math_formula",
        "kind": "block",
        "blocks": [
            {"block_id": "b-m1", "type": "math", "payload": {"latex": "ax + b = c \\implies x = \\frac{c - b}{a}"}}
        ]
    },
    "block_callout_note.json": {
        "fixture_id": "block_callout_note",
        "kind": "block",
        "blocks": [
            {"block_id": "b-c1", "type": "callout", "payload": {"title": "Key Rule", "text": "Whatever operation is performed on one side of the equation must be performed on the other."}}
        ]
    },
    "block_callout_tip.json": {
        "fixture_id": "block_callout_tip",
        "kind": "block",
        "blocks": [
            {"block_id": "b-tip", "type": "tip", "payload": {"title": "Exam Tip", "text": "Double check signs when distributing negative factors across parentheses."}}
        ]
    },
    "block_callout_warning.json": {
        "fixture_id": "block_callout_warning",
        "kind": "block",
        "blocks": [
            {"block_id": "b-warn", "type": "warning", "payload": {"title": "Common Error", "text": "Do not divide both sides by zero."}}
        ]
    },
    "block_worked_example.json": {
        "fixture_id": "block_worked_example",
        "kind": "block",
        "blocks": [
            {
                "block_id": "b-we1",
                "type": "worked_example",
                "payload": {
                    "title": "Worked Example: Solving 2x + 6 = 14",
                    "steps": [
                        "Subtract 6 from both sides: 2x = 8",
                        "Divide both sides by 2: x = 4",
                        "Verify in original equation: 2(4) + 6 = 14 (true)"
                    ],
                    "final_answer": "x = 4"
                }
            }
        ]
    },
    "block_table_summary.json": {
        "fixture_id": "block_table_summary",
        "kind": "block",
        "blocks": [
            {
                "block_id": "b-t1",
                "type": "table",
                "payload": {
                    "headers": ["Term", "Definition", "Example"],
                    "rows": [
                        ["Coefficient", "Number multiplied by variable", "3 in 3x"],
                        ["Constant", "Number with fixed value", "7 in x + 7"]
                    ]
                }
            }
        ]
    },
    "block_interactive_reveal.json": {
        "fixture_id": "block_interactive_reveal",
        "kind": "block",
        "blocks": [
            {
                "block_id": "b-ir1",
                "type": "interactive",
                "payload": {
                    "prompt": "Tap to reveal the derivation of the quadratic formula.",
                    "revealed_text": "Completed square form yields x = (-b +- sqrt(b^2 - 4ac)) / (2a)"
                }
            }
        ]
    },
    # Items
    "item_mcq_single_basic.json": {
        "fixture_id": "item_mcq_single_basic",
        "kind": "item",
        "item": {
            "item_id": "ITEM-MCQ-01",
            "node_id": "MATH.ALG.LINEAR",
            "type": "mcq_single",
            "difficulty_tier": 1,
            "difficulty_elo": 1100,
            "stem": "What is the value of x in 2x = 10?",
            "hints": [
                {"level": 1, "tier": 1, "content": "Divide both sides by the coefficient of x."},
                {"level": 2, "tier": 2, "content": "Calculate 10 divided by 2."}
            ],
            "payload": {
                "options": [
                    {"id": "A", "option_id": "A", "content": "5", "correct": True, "is_correct": True},
                    {"id": "B", "option_id": "B", "content": "8", "correct": False, "is_correct": False},
                    {"id": "C", "option_id": "C", "content": "12", "correct": False, "is_correct": False},
                    {"id": "D", "option_id": "D", "content": "20", "correct": False, "is_correct": False}
                ]
            }
        }
    },
    "item_mcq_misconception_distractor.json": {
        "fixture_id": "item_mcq_misconception_distractor",
        "kind": "item",
        "item": {
            "item_id": "ITEM-MCQ-02",
            "node_id": "MATH.FRAC.ADD",
            "type": "mcq_single",
            "difficulty_tier": 2,
            "difficulty_elo": 1220,
            "stem": "Calculate 1/3 + 1/4 in lowest terms.",
            "hints": [
                {"level": 1, "tier": 1, "content": "Find the lowest common denominator."},
                {"level": 2, "tier": 2, "content": "LCM of 3 and 4 is 12."}
            ],
            "payload": {
                "options": [
                    {"id": "A", "option_id": "A", "content": "7/12", "correct": True, "is_correct": True},
                    {
                        "id": "B",
                        "option_id": "B",
                        "content": "2/7",
                        "correct": False,
                        "is_correct": False,
                        "misconception_id": "MISC.FRAC.ADD_DENOM",
                        "learner_facing_name": "Adding denominators directly",
                        "explanation": "Adding denominators directly ignores partition sizes."
                    }
                ]
            }
        }
    },
    "item_multi_select.json": {
        "fixture_id": "item_multi_select",
        "kind": "item",
        "item": {
            "item_id": "ITEM-MS-01",
            "node_id": "MATH.NUM.PRIMES",
            "type": "multi_select",
            "difficulty_tier": 2,
            "difficulty_elo": 1180,
            "stem": "Select all prime numbers from the list below.",
            "payload": {
                "options": [
                    {"id": "A", "content": "2", "correct": True},
                    {"id": "B", "content": "3", "correct": True},
                    {"id": "C", "content": "4", "correct": False},
                    {"id": "D", "content": "5", "correct": True},
                    {"id": "E", "content": "9", "correct": False}
                ]
            }
        }
    },
    "item_numeric_input.json": {
        "fixture_id": "item_numeric_input",
        "kind": "item",
        "item": {
            "item_id": "ITEM-NUM-01",
            "node_id": "MATH.GEO.PYTH",
            "type": "numeric_input",
            "difficulty_tier": 2,
            "difficulty_elo": 1250,
            "stem": "Calculate the hypotenuse of a right-angled triangle with sides 3 cm and 4 cm.",
            "payload": {
                "correct_value": 5,
                "tolerance": 0.01,
                "unit": "cm"
            }
        }
    },
    "item_fraction_entry.json": {
        "fixture_id": "item_fraction_entry",
        "kind": "item",
        "item": {
            "item_id": "ITEM-FRAC-01",
            "node_id": "MATH.FRAC.SIMPLIFY",
            "type": "fraction_input",
            "difficulty_tier": 1,
            "difficulty_elo": 1120,
            "stem": "Simplify the fraction 6/8 to simplest terms.",
            "payload": {
                "correct_numerator": 3,
                "correct_denominator": 4
            }
        }
    }
}

for name, content in FIXTURES.items():
    file_path = FIXTURES_DIR / name
    file_path.write_text(json.dumps(content, indent=2), encoding="utf-8")

print(f"Generated {len(FIXTURES)} canonical renderer fixtures in {FIXTURES_DIR}")
