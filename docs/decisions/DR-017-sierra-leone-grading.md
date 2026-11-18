# DR-017 — Sierra Leone Grading Bands Confirmation

**Status:** ACCEPTED (provisional) (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/02-curriculum-framework-spec.md §5

## Context
The Sierra Leone Ministry of Basic and Senior Secondary Education (MBSSE) framework structure requires validation for NPSE (Primary), BECE (Junior Secondary), and WASSCE (Senior Secondary) grade bands.

## Decision needed
Confirm the exact grade band names and ordinal mappings for the Sierra Leone National Curriculum.

## Options
Option A: Confirm Class 1–6 (ordinals 1–6), JSS 1–3 (ordinals 7–9), SSS 1–3 (ordinals 10–12).
Option B: Request formal review from Sierra Leone in-country curriculum partner.

---

## Decision (2026-11-18)

**Status:** ACCEPTED (provisional)

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Split decision. ACCEPTED: the structural mapping in Option A (Class 1-6 = ordinals 1-6; JSS1-3 = 7-9; SSS1-3 = 10-12). OPEN: the numeric grade-band cut-offs of the grading scale. They are not in the sources and must be confirmed by the in-country curriculum partner (Option B) from MBSSE/WAEC documents. Rule: a Sierra Leone framework cannot be activated (doc 02 §9, coverage and review gate) while its `grading_scale` is unverified.

**Why.** The ordinal structure is a convention already shared with Ghana; the cut-offs are facts about an examination and must not be invented.

**Consequences and follow-up.** Add a `grading_scale_verified` note to the framework import checklist (doc 02 §6, Task 16).

**Revisit.** Closed when the partner's confirmation is attached to the framework record.
