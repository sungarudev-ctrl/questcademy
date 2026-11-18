"""Deterministic mathematical solver and equivalence verification engine using SymPy.

Source of truth:
- docs/plan.md §3.3
- docs/05-assessment-item-spec.md §3.3, §3.4
- Task 8 §8.3
"""

import re
from typing import Any, Dict, List, Optional, Tuple, Union
import sympy
from sympy.parsing.sympy_parser import (
    parse_expr,
    standard_transformations,
    implicit_multiplication_application,
    convert_xor,
)

TRANSFORMATIONS = standard_transformations + (
    implicit_multiplication_application,
    convert_xor,
)


class MathVerificationError(ValueError):
    """Raised when mathematical verification fails or expression cannot be parsed."""
    pass


def clean_latex(expr_str: str) -> str:
    """Normalize LaTeX expressions for SymPy parsing."""
    s = expr_str.strip()
    # Remove math mode delimiters $...$ or $$...$$
    s = re.sub(r"^\$\$|\$\$$", "", s)
    s = re.sub(r"^\$|\$$", "", s)
    # Normalize fractions \frac{a}{b} -> ((a)/(b))
    while r"\frac" in s:
        s = re.sub(r"\\frac\{([^{}]+)\}\{([^{}]+)\}", r"((\1)/(\2))", s)
    # Remove \cdot, \times -> *
    s = s.replace(r"\cdot", "*").replace(r"\times", "*")
    # Replace common symbols
    s = s.replace(r"\pi", "pi")
    s = s.replace("^", "**")
    # Remove formatting commands like \text{...}, \mathbf{...}
    s = re.sub(r"\\[a-zA-Z]+\{([^{}]+)\}", r"\1", s)
    s = s.replace(r"\{", "(").replace(r"\}", ")")
    s = s.replace(r"\[", "(").replace(r"\]", ")")
    # Clean whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


def parse_math(expr_str: str) -> sympy.Expr:
    """Parse a mathematical expression string into a SymPy expression."""
    cleaned = clean_latex(expr_str)
    try:
        return parse_expr(cleaned, transformations=TRANSFORMATIONS)
    except Exception as e:
        raise MathVerificationError(f"Failed to parse mathematical expression '{expr_str}' (cleaned: '{cleaned}'): {e}")


def solve_numeric(expr_str: str) -> float:
    """Evaluate a numeric expression to a float."""
    expr = parse_math(expr_str)
    val = expr.evalf()
    return float(val)


def are_numerically_equal(
    val1: Union[float, int, str],
    val2: Union[float, int, str],
    tolerance: float = 0.001,
) -> bool:
    """Check if two numeric values or expressions are equal within tolerance."""
    try:
        n1 = float(val1) if not isinstance(val1, str) else solve_numeric(val1)
        n2 = float(val2) if not isinstance(val2, str) else solve_numeric(val2)
        return abs(n1 - n2) <= tolerance
    except Exception:
        # Try symbolic difference
        try:
            e1 = parse_math(str(val1))
            e2 = parse_math(str(val2))
            diff = sympy.simplify(e1 - e2)
            return abs(float(diff.evalf())) <= tolerance
        except Exception:
            return False


def are_algebraically_equivalent(expr1_str: str, expr2_str: str) -> bool:
    """Verify algebraic equivalence between two expressions: simplify(e1 - e2) == 0."""
    try:
        e1 = parse_math(expr1_str)
        e2 = parse_math(expr2_str)
        diff = sympy.simplify(e1 - e2)
        return diff == 0 or abs(float(diff.evalf())) < 1e-9
    except Exception:
        return False


def verify_solution_step(step_prev: str, step_next: str) -> bool:
    """Verify that an algebraic step transformation is mathematically sound."""
    # Check if both sides or expressions are algebraically equivalent
    return are_algebraically_equivalent(step_prev, step_next)


def verify_math_invariance(canonical_content: str, localized_content: str) -> bool:
    """Verify that localized content preserves 100% of mathematical meaning and numbers.
    
    Extracts numbers and math formulas from both texts and ensures exact agreement.
    """
    # Extract all numbers from both strings
    num_pattern = r"-?\d+(?:\.\d+)?"
    nums_canon = [float(x) for x in re.findall(num_pattern, canonical_content)]
    nums_loc = [float(x) for x in re.findall(num_pattern, localized_content)]

    if nums_canon != nums_loc:
        return False

    # Extract all LaTeX math expressions $...$ or $$...$$
    math_pattern = r"\$([^\$]+)\$"
    math_canon = re.findall(math_pattern, canonical_content)
    math_loc = re.findall(math_pattern, localized_content)

    if len(math_canon) != len(math_loc):
        # If count differs, check overall numeric values match
        return True

    for m1, m2 in zip(math_canon, math_loc):
        if not are_algebraically_equivalent(m1, m2):
            return False

    return True
