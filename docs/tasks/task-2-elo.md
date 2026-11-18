## TASK 2 — Hand-Verify the Elo Rating System

---

**Context:** Task 1 (mastery predicate) is complete and confirmed. The five mastery vectors pass. `/engine/src/state.ts` defines `Attempt`, `NodeState`, `Decision`, `EngineContext`. `/engine/src/invariants.ts` exports I-1 through I-10 as assertions.

**Your task:** Hand-verify and implement `engine/src/elo.ts`.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§5** — Elo rating system, in full
2. `docs/04-learning-engine-spec.md` **§5.1** — node difficulty derivation, tier offsets, the 2026-08-09 cold-start correction
3. `docs/04-learning-engine-spec.md` **§5.2** — the update rule and the 2026-07-29 transcendental-determinism note
4. `docs/04-learning-engine-spec.md` **§5.3** — K-factors
5. `docs/04-learning-engine-spec.md` **§5.4** — guards
6. `docs/04-learning-engine-spec.md` **§12** — vectors `elo_convergence.json`, `elo_cold_start.json`, `item_difficulty_node_relative.json`, `node_difficulty_topological.json`, `ability_seed_from_prerequisites.json`, `ability_seed_secured_by_i1.json`
7. `docs/04-learning-engine-spec.md` **§11** — invariants I-5, I-9

**Deliverables, in order:**

1. **`engine/testdata/elo_convergence.json`**, **`elo_cold_start.json`**, **`item_difficulty_node_relative.json`**, **`node_difficulty_topological.json`**, **`ability_seed_from_prerequisites.json`**, **`ability_seed_secured_by_i1.json`** — hand-written golden vectors, one per file, in the shape your test harness consumes.

2. **`engine/test/elo.test.ts`** — tests that read each vector and assert the expected outcome. **Write these before the implementation.**

3. **`engine/src/elo.ts`** — implement these exported functions:

   - `nodeDifficultyFromGraph(nodeId, graph): number` — `1200 + 25 * topologicalLevel(nodeId)`. Topological level is the longest chain from a root; a cycle is an error, not a case to level around. Soft prerequisites count. Base is 1200 — equal to the cold-start ability fallback.

   - `tierOffset(tier: 1 | 2 | 3): number` — returns `-285`, `-115`, `+20` respectively. **Baked as module constants, not computed.** The doc 04 §5.2 note explains why: `log10` is transcendental, and V8 and Hermes may differ in its last bits, which breaks byte-identical determinism. Do not compute these at runtime.

   - `itemInitialElo(nodeElo, tier): number` — returns `nodeElo + tierOffset(tier)`.

   - `abilitySeed(learnerId, nodeId, state, graph): number` — returns the mean `ability_elo` of the node's hard prerequisites **that the learner has secured under I-1** (status ∈ {mastered, needs_review, relearning}). Do **not** filter on the literal string `'mastered'`. If no prerequisites are secured, return 1200.

   - `updateElo(state: NodeState, attempt: Attempt, nodeElo: number, itemResponseCount: number): NodeState` — the update rule from §5.2, with:
     - Expected score: `1 / (1 + 10^((difficulty - ability) / 400))`
     - Score: `1.0` if correct and unhinted, `0.5` if correct and hinted, `0.0` otherwise
     - K-factors per §5.3 (learner K by attempt count, item K by response count)
     - Review attempts at half K, exam attempts at half K and no item difficulty update
     - Latency guard: `latency_ms < 1500` on Tier 3 flagged `suspicious_fast`, excluded from item difficulty update
     - **Round both `ability_elo` and `difficulty_elo` to 4 decimal places immediately after the update, before returning.** Doc 04 §5.2 explains this is required for byte-identical state across V8 and Hermes.
     - Clamp both to `[400, 2800]`.

4. **Update `engine/src/invariants.ts`** — add `checkEloBounds(state): void` (I-5) and integrate the round-then-persist rule into the state-returning paths.

**Definition of done:**

- All six vectors pass.
- `updateElo` returns `NodeState` with `ability_elo` and `difficulty_elo` rounded to 4 decimals, never more.
- No `Math.log10`, `Math.log`, `Math.pow(10, x)`, or equivalent is called at module load or inside `tierOffset`. Grep for these before declaring done.
- The cold-start vector demonstrates that the first 10 attempts move ability by ≥ 150 points.
- The `ability_seed_secured_by_i1` vector passes with a prerequisite in `relearning` status.
- `npm run typecheck && npm run test` clean.

**Report at the end:** which spec sections you read, which constants you baked, the exact rounding you applied, and any place you found the spec ambiguous.

**Do not proceed to selection until Elo is confirmed.**
