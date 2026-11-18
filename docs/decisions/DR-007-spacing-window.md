# DR-007 — FSRS Spacing Window After 0.18 Simulation

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §8.1

## Context
FSRS-5 default parameters and stability intervals were benchmarked with a 0.18 target retrievability decay simulation. Production adjustments may be warranted based on empirical retention curves in pilot classrooms.

## Decision needed
Adopt default FSRS-5 weights for pilot, or adjust initial stability parameters based on the 0.18 retention analysis.

## Options
Option A: Adopt published FSRS-5 default weights (`w1..w4`) for initial pilot, refitting after >= 500k reviews.
Option B: Adjust stability multiplier `w4` for younger primary cohorts.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A. Adopt the published FSRS-5 default weights for the pilot; refit at 500k or more reviews. Option B (a younger-cohort `w4`) is rejected for now.

**Why.** There is no pilot retention data to justify a custom multiplier, and the pilot population is JSS2 (not younger primary). Doc 04 §8.1 already says weights are provisional.

**Consequences and follow-up.** No code change.

**Revisit.** Refit trigger: 500k reviews (a data-volume trigger, not a phase label; see DR-008).
