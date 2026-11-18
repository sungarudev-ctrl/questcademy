# DR-002 — Review Attempt ability_elo Update Rule

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §5.1, §5.4

## Context
Spec v1 stated that review attempts update ability_elo with a half-K factor. Spec v2 §5.4 explicitly states: 'Review attempts do NOT update ability_elo' because ability is frozen at first mastery, and only item difficulty_elo is updated during reviews. Engine code currently applies a half-K update (Finding 1 in FINDINGS.md).

## Decision needed
Confirm whether review attempts should leave ability_elo unchanged (as in v2 §5.4) or update ability_elo at half-K (as in v1).

## Options
Option A (Recommended): Freeze ability_elo on review attempts; review attempts only update item difficulty_elo (v2 §5.4).
Option B: Retain half-K update for learner ability_elo during review attempts (v1 legacy).

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A. Review attempts do not change the learner's `ability_elo`. They update item `difficulty_elo` only (subject to the existing latency guard and K rules).

**Why.** Doc 04 §5.1's 2026-08-14 correction treats ability on a secured node as evidence frozen at mastery; letting reviews move it re-opens a settled bug class and makes FSRS lapses distort ability seeds for downstream nodes (`abilitySeed` reads secured prerequisites).

**Consequences and follow-up.** Engine change required: `engine/src/elo.ts` currently halves K for review attempts and still updates ability. Change it, remove the `skip` from `elo_review_no_ability_update.json`, update the simulation baseline with a CHANGELOG entry (doc 10 §4). Doc 04 §5.4 is already worded this way.

**Revisit.** Revisit only if pilot data shows ability seeds for new nodes are systematically stale.
