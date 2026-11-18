# DR-015 — framework_type Field Addition to CurriculumFramework

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/02-curriculum-framework-spec.md §2

## Context
Spec v2 §2 proposes distinguishing between examination boards (e.g. WAEC, Cambridge) and standards-aligned ministries of education (e.g. Ghana NaCCA, Nigeria NERDC) using a `framework_type` enum (`exam_board` | `standards_aligned`).

## Decision needed
Confirm addition of `framework_type` column to `curriculum_frameworks` table and its constraint semantics.

## Options
Option A: Add `framework_type` as nullable column in migration 003, populate default, then set NOT NULL.
Option B: Add `framework_type` as mandatory column with default `'standards_aligned'`.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A's outcome, as already implemented: `framework_type` exists on `curriculum_frameworks` as NOT NULL with default `exam_board` (migration 003). `exam_structure` is required when `framework_type = exam_board` and optional for `standards_aligned`. Option B (default `standards_aligned`) is rejected.

**Why.** The only pilot framework is an exam board (WAEC BECE); a default of `standards_aligned` would silently exempt new frameworks from the exam-structure requirement.

**Consequences and follow-up.** Already in code. Doc 07 §4 records it.

**Revisit.** None.
