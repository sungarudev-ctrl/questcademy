## TASK 6 — Implement Escalation, Invariants, and the Simulation Harness

---

**Context:** Tasks 1–5 complete and confirmed. The engine can master nodes, schedule reviews, and select items. It has not yet been run as a system.

**Your task:** Implement the remaining engine modules and stand up the simulation harness that guards all future changes.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§9** — Escalation to tutor
2. `docs/04-learning-engine-spec.md` **§11** — Invariants I-1 through I-10, in full
3. `docs/04-learning-engine-spec.md` **§12** — all remaining vectors
4. `docs/04-learning-engine-spec.md` **§13** — performance budget
5. `docs/04-learning-engine-spec.md` **§14** — telemetry the engine must emit
6. `docs/10-engineering-standards.md` **§4** — the simulation harness contract
7. `docs/10-engineering-standards.md` **§5** — CI gates

**Deliverables, in order:**

1. **`engine/src/escalation.ts`** — implement `shouldEscalate(node, now): { escalate: boolean, misconceptionId?: string }` per §9. Must not escalate twice within 24 hours on the same node. Emits `Decision::escalate_to_tutor` with `node_id` and `misconception_id`.

2. **`engine/src/statemachine.ts`** — implement the transitions per §3. Every transition is a pure function of `NodeState` and the triggering event. The `locked → available` transition must assert I-1: all hard prerequisites are in the secured set (mastered, needs_review, relearning). Do not gate on the literal `'mastered'` string — see doc 04 §5.1's 2026-08-14 correction, which applies here as well.

3. **`engine/src/invariants.ts`** — complete I-1 through I-10 as exportable check functions. Each returns a list of violations; the test harness throws on any non-empty list. `assertInvariants` runs all ten and reports all violations, not just the first.

4. **`engine/src/telemetry.ts`** — define the event types the engine emits per §14. Do not implement transport — just the typed events. The engine returns them; the caller dispatches.

5. **`engine/testdata/` — remaining vectors**, hand-written:
   - `availability_hard_prerequisite_gates.json`
   - `availability_chain_unlocks.json`
   - `availability_soft_never_gates.json`
   - `availability_review_states_satisfy.json`
   - `escalation_trigger.json`
   - `determinism_cross_platform.json`
   - `idempotency_replay.json`

6. **`engine/test/statemachine.test.ts`**, **`engine/test/escalation.test.ts`**, **`engine/test/invariants.test.ts`** — one test file per module, tests reading the vectors.

7. **`simulation/harness.ts`** — the synthetic learner harness per doc 10 §4:
   - 10,000 synthetic learners
   - 12 simulated weeks
   - Learners drawn from a specified ability distribution (document the distribution in a comment)
   - Each learner takes placement, then runs sessions using `selectNextItem`, `evaluateAttempt`, and `buildReviewQueue`
   - Assertions to run at the end:
     - Mean 30-day retention ≥ 0.75
     - Mean success band across all selections ∈ `[0.75, 0.85]`
     - Escalation rate < 10% of node attempts
     - No invariant violations
     - The `content_gap` event fires for nodes with < 8 usable items

8. **`simulation/baseline.json`** — a checked-in baseline produced by the first full run. The baseline must include at minimum: mean retention, mean success band, escalation rate, distribution of days-to-mastery, and the count of `content_gap` events.

9. **`simulation/assertions.ts`** — the diff logic. Given a baseline and a new run, produce a structured report of every metric that moved. **The harness must fail if any metric shifts without a corresponding entry in `simulation/CHANGELOG.md`.**

10. **`.github/workflows/engine-ci.yml`** — the CI gate for `/engine`:
    - `npm run typecheck`
    - `npm run test` (100% branch coverage enforced)
    - `npm run simulation:diff` — runs the harness and diffs against baseline
    - Lint rule: `/engine` imports nothing outside `/engine`
    - Grep gate: no `Math.random`, no `Date.now`, no `new Date()`, no `fetch`, no `require()` outside the engine package

**Definition of done:**

- All remaining vectors pass.
- The simulation harness runs to completion with all assertions passing.
- The baseline is checked in.
- `simulation:diff` correctly fails a deliberately-introduced metric drift and passes when `CHANGELOG.md` is updated.
- CI runs on every push and fails on: typecheck errors, coverage below 100%, invariant violations, imports from `/engine` to the outside, forbidden global calls, and simulation drift without a CHANGELOG entry.
- `determinism_cross_platform.json` passes — build the engine twice, in two different environments (e.g., Node 18 and Node 20, or Node and a WASM build), and assert identical state hashes.
- `idempotency_replay.json` passes — replaying the full attempt log from empty state produces byte-identical final state.
- `npm run typecheck && npm run test && npm run simulation` all clean.

**Report at the end:** which sections you read, the ability distribution you chose for the simulation, the exact CI gates you wired, and the first baseline metrics.

**After this task, the engine is considered stable.** Any change to `/engine` from this point requires a second reviewer and a simulation diff per doc 10 §6.
