# DR-003 — Interleaving Gate (correct_total >= 2 Rule)

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §6 step 1, §9.1

## Context
Spec v2 §6 step 1 proposes gating review interleaving on `items_since_review >= 3 AND node.correct_total >= 2`. Currently, `correct_total` does not exist on NodeState, and the engine only gates on `items_since_review >= 3`. Related proposed features (`offer_tutor`, `mastery_blockers`) also depend on this decision.

## Decision needed
Accept or reject the `correct_total >= 2` gate for review interleaving, and decide whether to add `correct_total` to NodeState.

## Options
Option A: Accept proposed rule — add `correct_total` to NodeState and require `correct_total >= 2` before interleaving review items.
Option B: Reject proposal — keep current rule (interleave solely on `items_since_review >= 3`).
Option C: Gate on qualifying attempts in `recent_window` rather than adding a separate lifetime counter.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option C. Review interleaving requires at least 2 correct qualifying attempts in `recent_window`, in addition to `items_since_review >= 3`. No `correct_total` field is added to `NodeState`. Also accepted, as consequences: `Decision::offer_tutor` with the three reasons in plan §13.2 / doc 04 §9.1, and the read-only `mastery_blockers` explanation derived from `recent_window`.

**Why.** A lifetime `correct_total` would add persistent state that must be mirrored in `learner_node_state`, the sync snapshot and the parity hash for one gating rule. `recent_window` already holds the last 5 qualifying attempts and the same information is derivable from it (doc 04 §2.2 says to read the window, not a separate tally, for the same reason as the 2026-08-16 `misconception_hits` removal). Doc 03 §5's 'blocked until 2 correct' is satisfied.

**Consequences and follow-up.** Engine changes required, each with its vector in the same commit (doc 04 §12): gate in `selection.ts`; `offer_tutor` in `state.ts`/`escalation.ts`; `mastery_blockers`. Un-skip `interleave_cadence`, `tutor_offer_triggers`, `mastery_blockers` with the revised expected values. An offer never changes mastery, Elo or the review schedule (doc 04 §9.1).

**Revisit.** Revisit with the pilot's tutor open-rate metric (plan §13.3).
