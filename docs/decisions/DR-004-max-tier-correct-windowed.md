# DR-004 — Whether max_tier_correct Should Be Windowed

**Status:** ACCEPTED (provisional) (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §2.1

## Context
Currently, `max_tier_correct` is an unwindowed lifetime maximum. A Tier-3 correct attempt from months ago permanently satisfies the Tier-3 mastery requirement. §2.1 raises the question of whether this should be windowed.

## Decision needed
Should `max_tier_correct` be windowed (reset if not demonstrated recently) or remain a persistent lifetime maximum?

## Options
Option A: Retain lifetime maximum (unwindowed) — simpler, prevents learner frustration from regressing tier status.
Option B: Window over the last 30 calendar days.
Option C: Derive tier qualification dynamically from `recent_window` attempts.

---

## Decision (2026-11-18)

**Status:** ACCEPTED (provisional)

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option A for the pilot. `max_tier_correct` stays a lifetime maximum, updated only by qualifying, unhinted, correct attempts (already implemented).

**Why.** Mastery already requires 4 of the last 5 unhinted correct on 2 non-consecutive days, and FSRS review re-tests mastered nodes; a window on the tier flag adds a second, interacting decay rule with no data showing it is needed. Option C (derive from `recent_window`) would make Tier-3 evidence expire within 5 attempts and change the mastery predicate's difficulty, which the simulation has not examined.

**Consequences and follow-up.** No code change. Add one pilot metric: for each mastery event, the age of the Tier-3 correct attempt that satisfied `max_tier_correct >= 3`.

**Revisit.** Revisit (Option B, 30 days) if more than 20% of pilot masteries rely on a Tier-3 attempt older than 30 days. The 20% figure is provisional.
