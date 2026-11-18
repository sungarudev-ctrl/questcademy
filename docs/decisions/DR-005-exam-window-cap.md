# DR-005 — Exam Window Daily Review Cap

**Status:** ACCEPTED (provisional) (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §8.2, Invariant I-6

## Context
Invariant I-6 enforces a hard daily review cap of 8 items. During compressed pre-exam review periods, overdue backlogs can exceed 40 nodes, leading to review queues that cannot clear before the exam date.

## Decision needed
Should the daily review cap remain strictly capped at 8 (emitting backlog telemetry), or should it dynamically expand during exam windows?

## Options
Option A: Strictly preserve cap = 8 (Invariant I-6) and emit `review_backlog_in_exam_window` telemetry.
Option B: Allow cap to expand up to 16 items/day during active exam windows (days_until_exam <= 30).
Option C: Give teachers/schools configurable review cap overrides.

---

## Decision (2026-11-18)

**Status:** ACCEPTED (provisional)

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A for the pilot. The daily review cap stays 8 (I-6) and `review_backlog_in_exam_window` telemetry is emitted. Options B and C are deferred.

**Why.** I-6 is a hard invariant protecting session length and dose; the pilot has about 50 nodes, so a backlog above 40 cannot arise in Phase 0. Expanding the cap needs the simulation the DR calls for, not an opinion.

**Consequences and follow-up.** No engine change (telemetry exists).

**Revisit.** Revisit with a simulation run before any exam-window deployment, or earlier if pilot telemetry shows a backlog above 24 for more than a week (provisional trigger).
