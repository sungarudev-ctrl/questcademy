## TASK 4 — Hand-Verify Placement

---

**Context:** Tasks 1–3 complete and confirmed. Selection is stable and returns `Decision` objects with `reason`.

**Your task:** Hand-verify and implement `engine/src/placement.ts`.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§7** — Placement algorithm, in full, **including the 2026-07-29 implementation note** about the resumable step API shape
2. `docs/04-learning-engine-spec.md` **§7.1** — rules (Tier 2 only, provisional mastery, `mastered_at = null`, re-verify within 14 days)
3. `docs/04-learning-engine-spec.md` **§7.2** — presentation constraints (no score, no grade, resumable)
4. `docs/04-learning-engine-spec.md` **§12** — vectors `placement_low_ability.json`, `placement_high_ability.json`, `placement_resume.json`, `availability_provisional_mastery.json`
5. `docs/04-learning-engine-spec.md` **§3** — node state machine (for `propagate_mastery_down` interaction)
6. `docs/04-learning-engine-spec.md` **§11** — I-1, I-7

**Deliverables, in order:**

1. **`engine/testdata/placement_low_ability.json`**, **`placement_high_ability.json`**, **`placement_resume.json`**, **`availability_provisional_mastery.json`** — hand-written golden vectors. The resume vector must specify the exact state after item 9 and the exact final state, and assert they match.

2. **`engine/test/placement.test.ts`** — tests that read each vector. The resume test must run the sequence twice — once to completion, once interrupted at item 9 and resumed — and assert identical final state hashes. **Write these before the implementation.**

3. **`engine/src/placement.ts`** — implement the **resumable step API**, per §7's 2026-07-29 note:

   - `initPlacementState(learnerId, subject, entryGradeHint, graph): PlacementState` — seeds `lo = max(graphMin, hintDepth - 10)`, `hi = min(graphMax, hintDepth + 10)`. **Do not** seed to full graph range — the 2026-07 correction explains why.

   - `nextProbeDepth(state): number | null` — returns the next depth to probe, or `null` if the search has converged. Returns `null` when `itemsUsed >= 20` or `hi - lo <= 1`.

   - `recordProbeResult(state, nodeId, correct): PlacementState` — records the result and, if the depth's probes are complete, advances `lo` (on ≥ 2/3 correct) or `hi` (on ≤ 1/3 correct). Uses `>= 2.0/3.0` and `<= 1.0/3.0` — not `> 0.5`. The middle case (exactly 2/3 correct) advances `lo`; a strict majority is not enough, this is a floor.

   - `finalizePlacement(state, graph): PlacementResult` — computes the frontier as the **last confirmed successful depth** (`state.lo`), not `probeDepth` on the final iteration. The 2026-07 correction explains why: `probeDepth` on the last iteration may have just failed, and using it would place the frontier one level above what the learner demonstrated.

   - `backfillPrerequisites(state, frontier, graph): PlacementState` — verifies unverified prerequisites of the frontier with Tier 1 items, within the remaining budget (up to 25 items total).

   - `seedStateFromEvidence(evidence, frontier, graph): LearnerStateUpdate` — for each node:
     - If `evidence.rate >= 0.75`, mark provisionally mastered with `mastered_at = null`
     - Set initial `ability_elo` via `elo_from_evidence(ev)`
     - Run `propagateMasteryDown(frontier)` to mark unverified prerequisites of mastered nodes as provisionally mastered

   - `place(learner, subject, entryGradeHint, rng): PlacementResult` — a **convenience wrapper** that drives the four steps in sequence. It exists for the uninterrupted case. The step API is the real contract.

4. **`engine/src/state.ts`** — add `PlacementState`, `PlacementResult`, `ProbeResult` types per §7.

**Definition of done:**

- All four vectors pass.
- The resume vector produces byte-identical final state whether run to completion or interrupted at item 9.
- The `placement_low_ability` vector places a simulated P4-level learner in JSS2 context at P4, within the 20-item budget.
- The `placement_high_ability` vector places an above-grade learner at a frontier above the entry hint.
- Provisional mastery carries `mastered_at = null` in the resulting state.
- `nextProbeDepth` returns `null` exactly when the search has converged — no off-by-one.
- `npm run typecheck && npm run test` clean.

**Report at the end:** which sections you read, how you seeded the initial bracket, and how you handled the "exactly 2/3 correct" boundary case.

**Do not proceed to FSRS until placement is confirmed.**
