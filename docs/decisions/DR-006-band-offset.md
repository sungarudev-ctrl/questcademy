# DR-006 — Selection Band Offset (-200 Derivation)

**Status:** ACCEPTED (provisional) (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §6 step 3

## Context
Item selection targets a difficulty band centered at `learner.ability_elo - 200`. The −200 offset was derived from early simulations to maintain ~75% success rate for optimal flow, but has not been re-verified against live curriculum item calibrations.

## Decision needed
Confirm −200 Elo as the normative band offset, or re-derive the target offset using calibrated pilot response items.

## Options
Option A: Confirm −200 Elo offset for pilot launch.
Option B: Re-derive target offset via simulation once first 100 calibrated items per node are collected.

---

## Decision (2026-11-18)

**Status:** ACCEPTED (provisional)

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A for the pilot: the normative band offset is -200 Elo (target = ability - 200).

**Why.** The doc 04 §6 arithmetic check and the 0.75-0.85 band test pass; nothing in hand contradicts it. Re-derivation needs calibrated items, which a 2-school pilot will not provide at 100 responses per node (plan §17.2 item 9).

**Consequences and follow-up.** No code change.

**Revisit.** The existing pilot exit criterion is the trigger: if the observed success rate leaves 0.72-0.86 (doc 10 §7 halt rule), re-derive the offset by simulation (Option B).
