# DR-010 — Pending Attempt Contract for Deferred Items

**Status:** ACCEPTED (provisional) (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §2.3, §9.1, docs/05-assessment-item-spec.md

## Context
Deferred-marking item types (e.g., student-recorded audio, essay, teacher-graded open response) cannot be synchronously evaluated in the engine loop. A formal pending attempt state and resolution contract is required.

## Decision needed
Define storage, timeout, expiry, and state reconciliation rules for pending attempts before deferred-marking items ship.

## Options
Option A: Store pending attempts in a separate queue; engine ignores pending attempts until graded event arrives.
Option B: Treat pending attempt as provisional neutral attempt without updating Elo until graded.

---

## Decision (2026-11-18)

**Status:** ACCEPTED (provisional)

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A. A deferred-marking response is stored as a `pending_attempt` in its own table; the engine never sees it until a graded result arrives, as a normal `Attempt` carrying the same `attempt_id`. Pending attempts do not count for mastery, Elo, FSRS or interleaving. A pending attempt expires after 14 days unmarked (provisional): it is voided, never counted, and the learner is served a fresh item. Deferred types and Paper 2 mock papers stay blocked until this is built.

**Why.** Option B (a neutral provisional attempt) puts a placeholder into the canonical attempt log and the `recent_window`, so a later grading would have to rewrite history, breaking append-only attempts and I-8. A separate queue keeps the engine pure and the log append-only.

**Consequences and follow-up.** New table `pending_attempts` (doc 07, DD-07-4). `attempt_id` idempotency applies at grading time. Marking service and teacher-grading UI are specified in doc 08 §4 (specified only).

**Revisit.** The 14-day expiry is provisional; tune from marking latency in the pilot.
