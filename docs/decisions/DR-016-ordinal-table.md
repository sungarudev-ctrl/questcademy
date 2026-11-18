# DR-016 — Normative Ordinal Table (Pre-K and Kindergarten Slots)

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/02-curriculum-framework-spec.md §3

## Context
Grade band ordinals currently range from 1 to 13. To accommodate early childhood development (Pre-K and Kindergarten), spec v2 §3 expands the ordinal range to -1..12 (where -1 = Pre-K, 0 = Kindergarten, 1 = Grade 1).

## Decision needed
Adopt the normative ordinal range of -1..12 and update database check constraints accordingly.

## Options
Option A: Update `framework_grade_bands.ordinal` check constraint to `ordinal BETWEEN -1 AND 12`.
Option B: Keep ordinals positive (e.g. 0 = Pre-K, 1 = K, 2 = G1) and adjust grade numbering.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A, as already implemented: `framework_grade_bands.ordinal BETWEEN -1 AND 12` (-1 Pre-K, 0 Kindergarten, 1-12 Grade 1-12 equivalents; Ghana and Sierra Leone: Primary 1-6 = 1-6, JSS1-3 = 7-9, SHS/SSS1-3 = 10-12).

**Why.** Keeps ordinal equal to the grade number for the markets that matter (Ghana JSS2 = 8 is used throughout), and leaves room for early years without renumbering.

**Consequences and follow-up.** Migration 003 already sets the constraint. Doc 02 §3.2's table is normative.

**Revisit.** None.
