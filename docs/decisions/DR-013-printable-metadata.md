# DR-013 — printable Field: Author-Set vs Derived

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/05-assessment-item-spec.md §2

## Context
Assessment items include a `printable: boolean` attribute to determine eligibility for paper worksheet generation. It is undecided whether content authors must toggle this manually or if it should be derived from item type.

## Decision needed
Determine whether `printable` is an explicit author-specified field or an automatically derived attribute based on renderer type.

## Options
Option A: Author-specified boolean field, defaulting to `true` for standard types.
Option B: Derived automatically: `true` for MCQ/Numeric/FillBlank, `false` for drag-drop/audio/interactive.
Option C: Derived by default with explicit author override flag.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option C. `printable` is derived from item type by default (true for MCQ, numeric, fill-blank, short response; false for drag-and-drop, audio, interactive and graphing types). An author may set it to false but may not set it to true for a type the derivation marks non-printable. The validator rejects a missing value; it no longer defaults to printable.

**Why.** Pure authoring (Option A) invites wrong 'true' values that then reach teacher quizzes (A-9); pure derivation (Option B) cannot express an item that is technically printable but depends on colour or a diagram that fails on a photocopier.

**Consequences and follow-up.** Validator change: derive, allow only the downgrade, fail on absent. Teacher quiz builder reads only `printable = true` and `reviewed`+ items.

**Revisit.** None.
