# DR-009 — Reconcile Weekly Session Target (80 vs 90 min/week)

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/00-product-plan.md §12, docs/03-learning-science-spec.md

## Context
Historical specifications have conflicting targets for student time-on-task: some sections state 80 minutes/week (4 x 20 min sessions), while others specify 90 minutes/week (3 x 30 min or 5 x 18 min).

## Decision needed
Confirm the canonical weekly engagement target for classroom and homework scheduling.

## Options
Option A: Standardize on 80 minutes/week (4 x 20 min).
Option B: Standardize on 90 minutes/week (3 x 30 min).
Option C: Tier by grade band: 60 min/week for P1–P3, 90 min/week for P4–JSS3.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option C, simplified: the weekly goal is 90 minutes for P4-JSS3 learners (the studied dose, 12 hours over 8 weeks) and 60 minutes for P1-P3. Goals are expressed in minutes only; the split into sessions is not fixed by the product and teacher-scheduled sessions are the primary delivery (doc 03 §11). The pilot population (JSS2) is at 90.

**Why.** 90 minutes equals the dose studied in the Sierra Leone trial (doc 03 §12), so the pilot is not under-dosed by design; 80 would fall below the studied dose. The 60-minute value for the youngest band is a provisional engineering choice, since no source studies that band.

**Consequences and follow-up.** Doc 01 §12 and doc 03 §12 updated in this pass. Code follow-up: the web progress page shows an '80 minutes target'; Task 14's `dose_shortfall` threshold becomes 80% of the learner's goal (72 min at 90).

**Revisit.** Revisit with the dose-response analysis (doc 03 §14 Q4).
