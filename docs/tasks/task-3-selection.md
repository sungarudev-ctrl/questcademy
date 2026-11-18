## TASK 3 — Hand-Verify Item Selection

---

**Context:** Tasks 1 (mastery) and 2 (Elo) are complete and confirmed. `/engine/src/elo.ts` exposes `abilitySeed`, `nodeDifficultyFromGraph`, `itemInitialElo`, `updateElo`.

**Your task:** Hand-verify and implement `engine/src/selection.ts`.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§6** — Item selection, in full
2. `docs/04-learning-engine-spec.md` **§6.1** — target success probability, including the 2026-07 sign correction on `ability - 200`
3. `docs/04-learning-engine-spec.md` **§6.2** — tier reachability
4. `docs/04-learning-engine-spec.md` **§6.3** — pool exhaustion ladder
5. `docs/04-learning-engine-spec.md` **§2.2** — the `misconception_hits` removal note; remediation reads `recent_window`, not a separate tally
6. `docs/04-learning-engine-spec.md` **§12** — vectors `selection_band.json`, `selection_no_repeat.json`, `selection_pool_exhaustion.json`, `interleave_cadence.json`, `remediation_override.json`
7. `docs/04-learning-engine-spec.md` **§11** — I-4 (always returns a Decision)

**Deliverables, in order:**

1. **`engine/testdata/selection_band.json`**, **`selection_no_repeat.json`**, **`selection_pool_exhaustion.json`**, **`interleave_cadence.json`**, **`remediation_override.json`** — hand-written golden vectors.

2. **`engine/test/selection.test.ts`** — tests that read each vector. **Write these before the implementation.** The `selection_band` test must run 1000 simulated selections and assert mean expected success probability ∈ `[0.75, 0.85]`.

3. **`engine/src/selection.ts`** — implement:

   - `selectNextItem(learner, node, now, rng): Decision` — the four-step algorithm from §6:
     1. **Interleaving:** if `items_since_review >= 3` and the review queue is non-empty, serve a review item. Do not count review items toward `items_since_review`.
     2. **Remediation override:** scan `node.recent_window` (last 5) for a misconception appearing ≥ 2 times. If found and `remediation_shown_recently(learner, m, within_days=3)` is false, return `Decision::serve_remediation(node, m)`. On a 2-vs-2 tie, resolve to the more-recently-hit belief.
     3. **Target band:** `target_elo = node.ability_elo - 200`. The sign matters — the target item is *easier* than ability. Never write `+ 200`.
     4. **Weighted sample:** Gaussian weight around `target_elo` with σ = 150. Not argmin. The rng is injected.

   - `dominantMisconception(window, threshold): string | null` — exported separately so it can be tested in isolation. Reads `recent_window`, not a persisted tally.

   - `poolExhaustionLadder(node, learner, rng): Decision` — implements the 4-step ladder from §6.3:
     1. Relax recall window 21 → 10 days
     2. Widen σ 150 → 300
     3. Serve least-recently-seen
     4. Emit `content_gap` telemetry — this is a content bug, not an engine condition

   - `applyAdaptiveAdjustment(node, recentSuccess): number` — if ≥ 20 attempts exist on the node, adjusts `target_elo` by ±100 depending on whether the last-10 success rate is `> 0.90` or `< 0.60`. Clamped to ±200. Note that §6.1 states the adjustment direction is unaffected by the sign fix — "raise it when success is too high" holds because `target_elo` is a difficulty-space value.

   - `tierIsReachable(item, node): boolean` — Tier 3 items withheld until the learner has ≥ 2 correct at Tier 2 on that node.

4. **Update `engine/src/state.ts`** — the `Decision` type must include the `reason` field (an enum) per §2.3, and `selectNextItem` must always populate it.

**Definition of done:**

- All five vectors pass.
- The 1000-selection test hits mean expected success in `[0.75, 0.85]`.
- The interleave cadence vector shows review items at positions 4, 8, 12 — not 4, 7, 10.
- The remediation override test correctly triggers on 2-in-5 and does not trigger on 1-in-5.
- Pool exhaustion never throws — `selectNextItem` always returns a `Decision`.
- No `Math.random()` anywhere — all randomness is via the injected `rng`.
- `npm run typecheck && npm run test` clean.

**Report at the end:** which sections you read, how you seeded the weighted sample, and how the remediation dedup state is read (it is not on `NodeState` — see §2.2's closing note).

**Do not proceed to placement until selection is confirmed.**
