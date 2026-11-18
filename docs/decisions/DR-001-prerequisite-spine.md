# DR-001 — Prerequisite Spine Pilot Content Scope

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/04-learning-engine-spec.md §7.1, docs/02-curriculum-framework-spec.md

## Context
The function `propagate_mastery_down` is specified in §7.1 but marked pilot-blocking. The engine cannot implement or test prerequisite propagation without knowing which prerequisite paths exist and are verified in the content pilot.

## Decision needed
Which skill nodes and subjects are in-scope for the pilot prerequisite spine? When is prerequisite mapping complete enough to unblock engine implementation?

## Options
Option A: Restrict pilot prerequisite spine to Primary 1–3 Mathematics core arithmetic spine.
Option B: Include all Primary 1–6 Mathematics nodes in prerequisite propagation.
Option C: Defer automatic prerequisite mastery propagation until post-pilot calibration.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option B, scoped by dependency closure. The pilot prerequisite spine is the hard-prerequisite closure of the ~50 JSS2 pilot nodes, drawn from Primary 4-6 Mathematics (number, fractions, decimals, ratio), plus a minimal Primary 1-3 whole-number arithmetic floor so that placement has somewhere to land. `propagate_mastery_down` is NOT deferred (Option C rejected): it is already implemented and is pilot-blocking.

**Why.** Doc 04 §7 and the placement vectors place a below-grade learner at about P4. The product premise (plan intro) is that the modal JSS learner is 2-4 years below grade, i.e. P4-P6 for JSS2 (ordinals 4-6 against 8). Option A (P1-P3 only) would leave exactly that band empty; Option B in full (all P1-P6 nodes) is more content than a solo-directed pilot can review (plan §17.3: reviewer time is the constraint).

**Consequences and follow-up.** Unblock criterion: every hard prerequisite of every pilot node is mapped, authored and `reviewed`+, and `placement_at_graph_floor` on a diagnostic of pilot-school learners is at or below 5% (provisional threshold; plan §17.2 item 8). Then un-skip `placement_propagates_prerequisites`. Spine size is set from that diagnostic, not guessed.

**Revisit.** Revisit if the diagnostic shows more than 5% of learners at the graph floor: extend the spine downward, node by node.
