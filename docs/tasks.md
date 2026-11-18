

## THE MASTER PROMPT

---

You are the **lead engineering agent** for **Questcademy** — a canonical-curriculum exam preparation platform. You will work substantially through multi-turn development, and your success is measured not by speed but by **fidelity to the specification** and by **preserving the properties that make this system different from every other edtech project**.

Before you write a single line of code, read this entire prompt. Then read the specification documents in the order given. Do not skim. Do not summarize. Do not proceed to implementation until you can state, from memory, the four core commitments of the system and why each one cannot be relaxed.

---

### 1. What Questcademy Is

Questcademy is a learning system built on three layers:

1. **A canonical skill graph** — a global, grade-agnostic set of atomic skills (`SkillNode`s) with prerequisites. Mathematics is the same everywhere; `MATH.FRAC.ADD_UNLIKE` is one node across every market.
2. **Curriculum frameworks** — per-board, versioned mappings from syllabus objectives to canonical nodes. This is where grade bands, weightings, and grading scales live.
3. **Academic calendars** — terms, holidays, exam windows, year rollover.

The system serves **learners** (who need to know what to study, practice at the right level, and prove mastery) and **educators** (who need to author, review, and deploy curriculum at scale without forking the codebase per market).

The platform is **not** a chatbot wrapper. It is **not** a video course. It is **not** a question bank with a search bar. It is a deterministic learning engine that decides what every learner sees next, runs identically on client and server, and never calls a model inside the loop that determines progression.

---

### 2. The Four Non-Negotiable Commitments

Every design decision you make must preserve these. If you find yourself proposing a shortcut that violates one, stop and escalate.

**Commitment 1 — Teach at the right level, not the enrolled grade.**
Learners are placed by a diagnostic that finds their actual frontier. The UI never displays grade level, rank, percentile, or "behind/ahead" language. Copy is forward-looking.

**Commitment 2 — Mastery is the spacing effect, made concrete.**
Mastery requires ≥ 4 of last 5 correct (unhinted), ≥ 1 correct at Tier 3, and ≥ 2 distinct correct days that are **non-consecutive**. This is not an engagement gate. It is what separates demonstrated *performance* from demonstrated *learning*. It must never be relaxed for engagement metrics.

**Commitment 3 — One canonical graph, many curricula.**
Content is authored once against the skill graph and mapped to as many frameworks as needed. Adding a new exam board is a **content project, not an engineering project.** If it requires a schema change, the abstraction has failed.

**Commitment 4 — The engine is pure, deterministic, and shared.**
The learning engine makes no network calls, reads no clock, generates no randomness except through an injected seeded PRNG, and produces byte-identical outputs on every platform. This is what makes offline-first delivery, client-server parity, and auditable progression possible.

---

### 3. Read These Specifications — In This Order

Before writing code, read these documents. They are the normative source of truth. Where this prompt and a spec disagree, **the spec wins.**

| Order | Document | What it owns |
|---|---|---|
| 1 | `docs/00-product-plan.md` | The aligned working plan — architecture, schema, pipelines, UI |
| 2 | `docs/02-curriculum-framework-spec.md` | Three-layer model, atomicity test, governance |
| 3 | `docs/03-learning-science-spec.md` | Pedagogical commitments, explicit rejections |
| 4 | `docs/04-learning-engine-spec.md` | **The engine contract — hand-verified, testable** |
| 5 | `docs/05-assessment-item-spec.md` | 18 item types, 17-block content model, item lifecycle |
| 6 | `docs/10-engineering-standards.md` | CI gates, review tiers, definition of done |

**Critical reading order detail:** Doc 04 (the engine spec) is the single most important document in the set. It is also the one most likely to be *implemented wrong* by an agent that reads quickly. Read it twice. Read §4 (mastery predicate), §5 (Elo), §6 (selection), §7 (placement), and §8 (FSRS) line by line.

---

### 4. The Engine Is Hand-Verified — You Do Not Generate It First

**This is the most important rule in this prompt.**

The engine's core predicates — mastery, Elo, selection, placement — are **hand-verified against worked examples**. They are not to be generated from a prose description and then trusted.

For these four modules and only these:

- `engine/src/mastery.ts`
- `engine/src/elo.ts`
- `engine/src/selection.ts`
- `engine/src/placement.ts`

Your workflow is:

1. **Read the corresponding section in doc 04** (§4, §5, §6, §7 respectively).
2. **Read the conformance test vectors** in doc 04 §12 that apply.
3. **Write the tests first**, from the vectors, before any implementation.
4. **Write the implementation** to pass the tests.
5. **Hand-verify every conditional branch** against the spec, one at a time. Do not rely on the tests alone — the spec contains corrections marked with dates (2026-07-29, 2026-08-09, 2026-08-14, 2026-08-16) that encode real bugs found in earlier implementations. Read them. They are the reason these modules are hand-verified.
6. **Do not proceed to the next engine module** until the current one is verified and its vectors pass.

Everything else in the codebase — CRUD, admin screens, sync, payment, auth, content pipelines, UI — follows a normal review-and-test workflow. See doc 10 §1 for the full trust-tier table.

---

### 5. The Trust Tiers — Apply Them Everywhere

From doc 10 §1:

| Tier | Scope | Your review depth |
|---|---|---|
| **Hand-verified** | Engine: mastery, Elo, selection, placement | Line by line, against doc 04 §12 vectors. You do not skip this. |
| **Reviewed** | Sync, content pipeline, payments, auth, RBAC | Full read, tests checked |
| **Generated + tested** | CRUD, dashboards, forms, admin screens | Behaviour verified, code skimmed |

When in doubt about which tier applies, **assume the higher tier**.

---

### 6. Working Contract

**Rules of engagement:**

1. **One document per task.** When you are asked to implement a component, request the specification section that owns its contract. Do not proceed from a prose description if a spec section exists.
2. **Specify the contract, not the implementation.** If you are generating code for a well-specified component, cite the spec section you are implementing in every commit message and PR description.
3. **Tests before implementation** for anything in the engine. Hand-write the tests from the doc 04 §12 vectors.
4. **No `any` in `/engine`.** TypeScript strict mode everywhere. No exceptions.
5. **No clock reads or randomness inside `/engine`.** Both injected via `EngineContext`. `now` is a parameter.
6. **No model calls in any Tier 0 path.** The engine decides *when* to escalate to a tutor; the model is called by the escalator, not by the engine.
7. **Every change that affects the engine re-runs the simulation harness.** A change that shifts the baseline without an explanation does not merge. (See doc 10 §4.)
8. **Every change that affects mastery, Elo, selection, or scheduling requires an updated or added conformance vector in the same commit.** Enforced in CI.
9. **Comments explain *why*, never *what*.** If the what needs explaining, rewrite it.
10. **You do not generate `/engine` core predicates from scratch.** You write them, hand-verify them, and prove them against the vectors.

**What you must ask before starting any task:**

- Which spec document and section owns this contract?
- Which trust tier does this fall under?
- What are the acceptance criteria — does a conformance vector exist?
- Does this touch `/engine`? If yes, are the tests written first?

If you cannot answer all four, **stop and ask**.

---

### 7. The Repository Structure

The structure is fixed. Do not invent folders.

```
examgpt/
├── engine/                        # Pure TypeScript. Zero deps. Shared client/server.
│   ├── src/
│   │   ├── state.ts               # NodeState, Attempt, Decision types
│   │   ├── statemachine.ts        # Transitions, I-1 through I-12
│   │   ├── mastery.ts             # HAND-VERIFIED
│   │   ├── elo.ts                 # HAND-VERIFIED
│   │   ├── selection.ts           # HAND-VERIFIED
│   │   ├── placement.ts           # HAND-VERIFIED
│   │   ├── srs.ts                 # FSRS scheduler
│   │   ├── escalation.ts          # should_escalate()
│   │   └── invariants.ts          # I-1 through I-12
│   ├── testdata/                  # Golden vectors, JSON
│   ├── test/                      # Conformance + simulation
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                       # FastAPI (Python). Calls /engine via WASM.
├── content-tools/                 # Authoring, bundle build, CI gates
├── web/                           # Next.js 14 (App Router)
├── mobile/                        # Flutter
├── shared/                        # OpenAPI, JSON schemas, prompt library
├── simulation/                    # 10k synthetic learners, 12 weeks
├── infra/                         # Docker Compose, k8s
├── docs/                          # Spec documents (source of truth)
└── .github/workflows/             # CI gates (fail the build, do not warn)
```

**Invariant:** `/engine` may import from nowhere else in the repo. Enforced by lint rule, not by convention.

---

### 8. The First Task

Your first task is **not to build the whole system.** It is to lay the foundation that makes every subsequent task safe.

**Task 1 — Bootstrap `/engine` and hand-verify the mastery predicate.**

Deliverables, in order:

1. **`engine/package.json` and `tsconfig.json`** — strict mode, zero runtime dependencies.
2. **`engine/src/state.ts`** — the types from doc 04 §2: `Attempt`, `NodeState`, `Decision`, `EngineContext`. Every field, every comment, exactly as specified. `NodeState` carries the fields listed in doc 04 §2.2, with the corrected comments reflecting the §4 rules — do not reproduce the stale comments that doc 04 §2.2 explicitly flags as wrong.
3. **`engine/testdata/mastery_*.json`** — hand-write the four mastery vectors from doc 04 §12:
   - `mastery_same_day_grind.json`
   - `mastery_two_day_clean.json`
   - `mastery_hint_farm.json`
   - `mastery_boundary_consecutive.json`
   - `mastery_hinted_day_bridge.json`
4. **`engine/test/mastery.test.ts`** — tests that read the vectors and assert the expected outcome. **Write these before the implementation.**
5. **`engine/src/mastery.ts`** — implement `is_mastered(s: NodeState): boolean` per doc 04 §4. The predicate must:
   - Require `|recent_window| ≥ 4`
   - Count as correct only attempts where `a.correct AND a.hints_used === 0`
   - Require `max_tier_correct ≥ 3`
   - Require ≥ 2 distinct correct days from the *same filtered set* (not from `distinct_days`)
   - Require span `(max - min).days ≥ 2` — **not** `gap < 1`
6. **`engine/src/invariants.ts`** — declare I-1 through I-10 as exported functions. `assertInvariants(state)` returns a list of violated invariant IDs; it does not throw in production, but it must throw in the test harness.
7. **A short `engine/README.md`** — states the purity rules, the injected context shape, and how to run the conformance test suite.

**Definition of done for Task 1:**

- All five mastery vectors pass.
- No file in `/engine` reads a clock, calls the network, or uses `Math.random()`.
- `npm run typecheck` and `npm run test` pass with zero warnings.
- A short written confirmation in your final message: which spec sections you read, which invariants are enforced, and what you would do next.

**Do not proceed to Elo, selection, or placement until Task 1 is complete and confirmed.**

---

### 9. What You Must Never Do

- Do not generate `/engine` core predicates from a prose description and trust them.
- Do not relax the two-session mastery gate for engagement reasons.
- Do not show grade level, percentile, or comparison-to-peers to a learner.
- Do not call a model inside a Tier 0 path.
- Do not add a `grade_level` column to `skill_nodes`.
- Do not `bulk approve` framework mappings. Ever.
- Do not merge an engine change without a simulation diff.
- Do not merge a mastery/Elo/selection change without updating the conformance vectors in the same commit.
- Do not add a dependency to `/engine` that is not already there.
- Do not skip the reference device verification for anything user-facing.
- Do not add a feature from the doc 03 §13 rejection list without escalating.

---

### 10. When You Are Uncertain

Escalate. Do not guess.

- If the spec is ambiguous, ask which reading is intended and propose both.
- If a change would touch `/engine` in a way not covered by a vector, propose the vector first.
- If the spec and the code disagree, the spec wins; open a note explaining the divergence.
- If a feature proposal comes from outside the spec set, check doc 03 §13 (rejections) before considering it.

---

### 11. Final Framing

You are not building a chatbot that helps students. You are building a **curriculum engine with a deterministic learning kernel** — a system whose progression logic is provable, whose content scales across markets without forking, and whose measure of success is **30-day retrieval retention**, not minutes watched.

Every commitment above exists to make that provability real. Every rule in this prompt exists because a previous project, or a previous version of this one, got it wrong and paid for it.

Read the specs. Write the tests first. Hand-verify the engine. Then build.

**Begin with Task 1.**

---

## END OF MASTER PROMPT




# 🎯 Questcademy — Task Hand-offs (Tasks 2–6)

Each task is a self-contained prompt to hand to the agent after the previous one is confirmed complete. Paste the task in full. Do not summarize. Do not combine tasks — the sequencing is deliberate.

---

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

---

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

---

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

---

## TASK 5 — Implement the FSRS Review Scheduler

---

**Context:** Tasks 1–4 complete and confirmed. The engine can place a learner and select items. Nothing yet schedules reviews.

**Your task:** Implement `engine/src/srs.ts`. This module is **not** in the hand-verified tier — the spec is fully specified and the equations are standard FSRS-5. It falls under the **Reviewed** tier (doc 10 §1). Full read of your code, tests checked, but you may generate the implementation from the spec.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§8** — Review scheduler, in full
2. `docs/04-learning-engine-spec.md` **§8.1** — scheduling on mastery and on review
3. `docs/04-learning-engine-spec.md` **§8.2** — queue construction, daily cap, priority order, overdue decay
4. `docs/04-learning-engine-spec.md` **§8.3** — exam-aware compression
5. `docs/04-learning-engine-spec.md` **§12** — vectors `fsrs_lapse_recovery.json`, `fsrs_exam_compression.json`, `review_queue_daily_cap.json`, `review_queue_priority.json`, `review_queue_overdue_decay.json`, `review_queue_relearning_not_due.json`
6. `docs/04-learning-engine-spec.md` **§3** — the `mastered → needs_review → relearning → mastered` transitions
7. `docs/04-learning-engine-spec.md` **§11** — I-6 (daily cap of 8)

**Deliverables, in order:**

1. **`engine/testdata/fsrs_lapse_recovery.json`**, **`fsrs_exam_compression.json`**, **`review_queue_daily_cap.json`**, **`review_queue_priority.json`**, **`review_queue_overdue_decay.json`**, **`review_queue_relearning_not_due.json`** — hand-written golden vectors.

2. **`engine/test/srs.test.ts`** — tests that read each vector.

3. **`engine/src/srs.ts`** — implement:

   - `onMastery(node, now): NodeState` — sets `stability = 3.0`, `difficulty_fsrs = clamp(5.0 - 0.8 * (ability_elo - 1200) / 200, 1.0, 10.0)`, `due_at = now + stability`.

   - `onReview(node, correct, now): NodeState` — computes `retrievability = exp(ln(0.9) * elapsed_days / stability)`. On correct, updates stability with the FSRS-5 formula (weights w1–w4 as module constants, seeded with published FSRS-5 defaults — the spec says to refit from real data at Phase 3, not now). On incorrect, `lapses += 1`, `stability = max(1.0, stability * 0.3)`, `difficulty_fsrs += 0.6`, `status = 'relearning'`. Then `due_at = now + stability * examCompression(now)`.

   - `buildReviewQueue(learner, now, graph): ReviewQueue` — constructs the daily queue:
     - Priority: `relearning` > overdue (largest `now - due_at` first) > exam-critical > due today
     - Daily cap of 8, hard (I-6)
     - Overdue decay: nodes overdue by > 60 days are admitted at a maximum of 3/day; today's normal reviews are not crowded out
     - Relearning nodes not yet due are excluded, even if there are empty slots

   - `examCompression(now, examWindow): number` — returns `1.0` if no exam or `> 90` days, `0.75` if `> 30`, `0.5` if `> 14`, `0.35` otherwise.

4. **Handle the doc 04 §3 implementation note.** A review attempt can legitimately arrive while `status` still reads `mastered` — the `mastered → needs_review` transition is time-triggered, not attempt-triggered, so no eager write exists to hang it on. **Treat this case identically to `needs_review` receiving a review attempt** — same correct/incorrect branching. Do not require a due-date sweep to run first. Add this explicitly as a test case.

**Definition of done:**

- All six vectors pass.
- The daily cap vector shows 20 due nodes producing exactly 8 queued, and running the builder twice produces the same 8 (deterministic).
- The overdue decay vector shows 10 overdue nodes producing at most 3 admitted, and today's 5 reviews are still served.
- The relearning-not-due vector correctly excludes not-yet-due relearning nodes even when there is room in the queue.
- The lapse recovery vector shows the stability drop, the transition to `relearning`, and recovery after 2 consecutive correct.
- A review attempt arriving while `status === 'mastered'` behaves identically to `needs_review` — add and pass this test case explicitly.
- `npm run typecheck && npm run test` clean.

**Report at the end:** which sections you read, the FSRS-5 weights you seeded, and any place the spec left a free parameter.

**Do not proceed to escalation until SRS is confirmed.**

---

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

---

## How to Chain These Tasks

Hand them one at a time. After each task:

1. **Read the agent's report.**
2. **Run the tests yourself** on your own machine — do not trust the report alone for Tasks 1–4.
3. **Verify the specific items in "Definition of done"** — every one.
4. **Only then** paste the next task.

If the agent reports the task complete but any definition-of-done item is not met, **do not proceed**. Re-paste the task with a specific note about what failed. The sequencing is deliberate; skipping a step in the engine will surface later as a progression bug that is invisible until it corrupts a learner's history.

Save all six tasks to `docs/tasks/` in the repo, so the sequence is reproducible for any new agent or contributor:

```
docs/tasks/
├── task-1-mastery.md
├── task-2-elo.md
├── task-3-selection.md
├── task-4-placement.md
├── task-5-srs.md
└── task-6-escalation-simulation.md
```

---

## After Task 6 — What Comes Next

Once the engine is stable, the remaining work is downstream and follows normal review workflow:

- **Backend** — FastAPI app, schema migrations, `engine_bridge` (WASM or parallel), API endpoints, Celery workers
- **Content pipelines** — A1 (skill authoring), A2 (content authoring), B (item generation), C (framework expansion)
- **Content Studio** — Next.js admin app for review queues, coverage dashboards, generation job monitoring
- **Student app** — Web (Next.js) and Mobile (Flutter) node readers, practice screens, tutor, progress
- **Infrastructure** — Docker Compose, Weaviate schema, CI/CD pipelines

Each of those tasks should be handed off with the same shape: **read these sections, write these tests first, deliver these files, this is the definition of done.** The engine tasks are the only ones where hand-verification is required; everything downstream follows the trust tiers in doc 10 §1.

## TASK 7 — Country and Framework Layer

(Hand-off prompt for the agent.)
Paste this to the agent after Task 6 is confirmed complete.

Context: Tasks 1–6 complete and confirmed. The engine is stable. The backend, content pipelines, and Content Studio are not yet built.

Your task: Implement the country and framework layer end-to-end — schema, service, API, and the framework-scoped content resolver. This is the last piece of foundational work before the content pipelines are built.

Read first, in this order:

docs/00-product-plan.md §2 (updated) — the full schema, including §2.9 through §2.13

docs/00-product-plan.md §3 (updated) — the pipelines with framework-aware modes

docs/00-product-plan.md §5 (updated) — the API surface

docs/00-product-plan.md §6 — governance, especially the framework activation gate

docs/00-product-plan.md §7 — the engine (verify I-12 is specified but does not yet exist)

docs/02-curriculum-framework-spec.md — the three-layer model, in full

docs/02-curriculum-framework-spec.md §5 — versioning and cohort pinning

docs/02-curriculum-framework-spec.md §9 — governance

Deliverables, in order:

Alembic migrations for every new table in §2.9 through §2.13. Every table has an upgrade and a matching downgrade. Every FK is explicit. Every CHECK constraint matches the spec.

backend/app/db/models/framework.py — SQLAlchemy models for Country, CurriculumFramework (extended), FrameworkGradeBand, SyllabusObjective, ObjectiveNodeMap, LearnerFrameworkPin, FrameworkVersionDiff, FrameworkRollout, LocalizationBrief, ItemLocalization, ContentLocalization, LocalizationToken, FrameworkCohortStats, LearnerPinMigration.

backend/app/services/framework_service.py — service-layer functions:

create_framework(country, board, subject, version, ...) → draft framework

import_objectives(framework_id, pdf_or_text) → calls the extractor, stages drafts

map_objective(objective_id, node_id, actor) → creates a single mapping; fails if called in bulk (the service enforces the no-bulk-approve rule from doc 02 §9)

compute_coverage(framework_id) → coverage_pct per §6

activate_framework(framework_id, actor) → fails unless coverage_pct >= 80

supersede_framework(framework_id, new_framework_id, actor) → generates a version diff, does not mutate learner pins

migrate_learner_pin(learner_id, to_framework_id, reason, actor) → creates a LearnerPinMigration row; does not touch learner_node_state

refresh_localization(framework_id, actor) → stages drafts from the updated brief

backend/app/services/content_resolver.py — the framework-aware content resolver:

resolve_item(item_id, framework_id, learner_pin) → Item — applies item_localizations overrides on top of the base item

resolve_content(content_id, framework_id, learner_pin) → SkillNodeContent — applies content_localizations overrides

The resolver never mutates the base item. It returns a view.

If the learner's pin does not match framework_id, the resolver raises a typed error. Callers must pass the learner's actual pin.

backend/app/api/frameworks.py — the API endpoints in §5. Every endpoint enforced with the appropriate RBAC scope (curriculum lead for write operations, anyone for read on active frameworks).

backend/app/api/learners.py — add endpoints for POST /learners/:id/change-framework and GET /learners/:id/framework-history.

backend/app/api/analytics.py — add GET /analytics/frameworks/compare. Reads from framework_cohort_stats only. Does not join to skill_nodes or items.

backend/tests/unit/test_framework_service.py — tests for every service function. In particular:

activate_framework raises when coverage is 79.9%

map_objective cannot be called with a list (type-level and runtime)

migrate_learner_pin leaves learner_node_state byte-identical

compute_coverage correctly counts objectives with ≥ 15 published items

backend/tests/unit/test_content_resolver.py — tests for the resolver:

With no localization row, base item is returned unchanged

With a localization row, overrides are applied and the base row is unchanged after the call

With a mismatched pin, the resolver raises

engine/src/invariants.ts — add I-11 (pin migration never mutates node state) and I-12 (engine output is framework-agnostic). I-12's check is implemented as a test in engine/test/determinism.test.ts, not as a runtime assertion.

engine/testdata/determinism_across_frameworks.json — the vector asserting that the same attempt sequence with two different frameworkId values produces byte-identical state.

.github/workflows/content-ci.yml — the country-isolation lint rule and the localization math-invariance gate from §9.

docs/runbooks/framework-expansion.md — the step-by-step process a curriculum lead follows to add a country. Copy the eleven steps from §3.4 of the plan, with the exact commands and API calls.

Definition of done:

All migrations apply cleanly and downgrade cleanly.

Every service function has a passing unit test.

activate_framework raises below 80% coverage — tested.

map_objective cannot be called in bulk — tested.

migrate_learner_pin leaves node state byte-identical — tested with a checksum.

The content resolver returns the base item when no localization exists, and returns the localized view without mutating the base when one exists — both tested.

determinism_across_frameworks.json passes.

The country-isolation lint rule fails the build if country_code appears in any forbidden file — test it with a deliberate violation.

The math-invariance gate fails the build if an override changes a numeric answer without SymPy verification — test it with a deliberate violation.

npm run typecheck && npm run test && npm run simulation clean.

pytest clean.

Report at the end: which sections you read, the exact SQL of the country-isolation lint rule, how you verified the pin migration does not touch node state, and any place the spec was ambiguous.

Do not proceed to content pipelines until framework service is confirmed.

## After Task 7 — What This Guarantees
After Task 7 lands, the following are true and enforced by CI:

Adding a country is a content project. The codebase does not change.

Mastery is preserved across country changes, board changes, and framework supersessions. Enforced by I-11.

The engine's decisions are byte-identical across frameworks. Enforced by I-12 and the determinism vector.

A framework cannot go live below 80% coverage. Enforced at the service layer.

Mappings cannot be bulk-approved. Enforced at the service layer.

Localization cannot alter mathematics. Enforced at the CI gate.

Cross-country analytics never touch content tables. Enforced by the query path.

Every one of those is a data-level property, not a convention. That is what makes the abstraction real.




# 🎯 Questcademy — Tasks 8 & 9 Hand-offs

Two self-contained prompts. Paste one at a time, after Task 7 is confirmed complete and the framework layer is stable.

---

## TASK 8 — Framework-Aware Content Pipelines

---

**Context:** Tasks 1–7 complete and confirmed. The engine is stable. The framework layer is live: `Country`, `CurriculumFramework`, `FrameworkGradeBand`, `SyllabusObjective`, `ObjectiveNodeMap`, `LocalizationBrief`, `ItemLocalization`, `ContentLocalization`, `LocalizationToken`, `LearnerFrameworkPin`, `FrameworkRollout` exist. The content resolver returns a framework-scoped view without mutating base content. CI is enforcing the country-isolation lint rule.

**Your task:** Implement the four framework-aware content pipelines (A1, A2, B, C, D) end-to-end — prompt library, services, Celery workers, and the coverage reporting that gates framework activation.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§3** — the four pipelines in full, including their framework-aware modes
2. `docs/00-product-plan.md` **§2.4, §2.5, §2.9–§2.13** — schema for `skill_node_content`, `items`, and the country layer
3. `docs/02-curriculum-framework-spec.md` **§2** — atomicity test, prerequisite semantics, naming
4. `docs/02-curriculum-framework-spec.md` **§3** — objective-to-node mapping rules M-1 through M-5
5. `docs/02-curriculum-framework-spec.md` **§6** — curriculum import pipeline, the ten stages
6. `docs/02-curriculum-framework-spec.md` **§9** — governance (no bulk approve, coverage ≥ 80)
7. `docs/05-assessment-item-spec.md` **§1** — Item contract, 17-block model
8. `docs/05-assessment-item-spec.md` **§3** — item types, tier mix, bank composition
9. `docs/05-assessment-item-spec.md` **§7** — item lifecycle
10. `docs/05-assessment-item-spec.md` **§9** — misconception taxonomy
11. `docs/10-engineering-standards.md` **§5** — content CI gates
12. `docs/10-engineering-standards.md` **§9** — definition of done

**Deliverables, in order:**

### 8.1 Prompt library

Create `shared/prompts/v1/` with one file per prompt, each with a `PROMPT_VERSION` header, the system prompt, the user-template, and a `RULES` block. **No prompt text lives in code.**

- `shared/prompts/v1/node_authoring.md` — Pipeline A1
- `shared/prompts/v1/content_canonical.md` — Pipeline A2 Mode 1
- `shared/prompts/v1/content_localized.md` — Pipeline A2 Mode 2
- `shared/prompts/v1/item_generation.md` — Pipeline B step 1
- `shared/prompts/v1/item_localization.md` — Pipeline B step 10
- `shared/prompts/v1/framework_extraction.md` — Pipeline C step 1
- `shared/prompts/v1/framework_mapping.md` — Pipeline C step 3
- `shared/prompts/v1/self_evaluation.md` — the Gemini self-score used in A2 and B
- `shared/prompts/v1/localization_refresh.md` — Pipeline D
- `shared/prompts/CHANGELOG.md` — every change to a prompt records version, author, reason

Every prompt that emits JSON **must** declare `"response_mime_type": "application/json"` and a strict schema. The schema is a JSON file under `shared/prompts/v1/schemas/`.

### 8.2 Gemini client

`backend/app/ai/gemini.py`:

- Wraps `google-generativeai`
- Reads prompt from `shared/prompts/v1/` at load time, caches in memory
- Enforces `response_mime_type=application/json` and JSON schema
- Retries on transient errors with exponential backoff, max 3 attempts
- Emits `gemini_call` telemetry with model, prompt version, token counts, latency
- Uses `gemini-2.5-pro` for A1 and A2 canonical and C, `gemini-2.5-flash` for B and D
- **Never** runs inside `/engine`, never inside a request path that a learner is waiting on

### 8.3 Validation tools

`backend/app/ai/tools/`:

- `sympy_solver.py` — the deterministic math engine. Already specified in Task 1's plan but not yet implemented; implement it fully now.
- `validator.py` — validates a candidate item: SymPy agreement on every numeric answer, every distractor carrying a `misconception_id`, reading level (Flesch-Kincaid) ≥ 2 years below grade band, all media ≤ 40 KB, hints exactly 3.
- `chunker.py` — splits `skill_node_content.sections` (Block[]) into ~500-token chunks, preserving block boundaries.
- `dedup.py` — Weaviate cosine check against the node's existing items and content; reject if any distance < 0.15.
- `objective_extractor.py` — reads a syllabus PDF (or text), returns verbatim objectives with codes and grade bands. Uses `framework_extraction.md`.
- `objective_mapper.py` — proposes objective→node mappings with confidence scores. Uses `framework_mapping.md`. **Never** writes to the DB; returns proposals.

### 8.4 Pipelines

`backend/app/ai/pipelines/`:

**`node_pipeline.py`** — Pipeline A1:
```
author_nodes(subject: str, topic: str, actor_id: UUID) -> list[SkillNode]
  1. Load the node_authoring prompt
  2. Call Gemini
  3. Reject nodes failing the atomicity test (doc 02 §2.1):
     - est_minutes not in [8, 15]
     - fewer than 2 named misconceptions
     - fewer than 20 candidate items' worth of content
  4. Persist as skill_nodes.status = 'draft'
  5. Enqueue a human review task; do not auto-publish
```

**`content_pipeline.py`** — Pipeline A2:
```
generate_content_canonical(node_id: str, actor_id: UUID) -> SkillNodeContent
  1. Load the node and its prerequisites
  2. Load content_canonical prompt
  3. Call Gemini → Block[] sections, worked_examples, formulas, analogies, common_mistakes
  4. Validate: reading level, worked examples ≥ 3, all math in KaTeX
  5. Persist skill_node_content.status = 'draft', version = 1
  6. Chunk → embed → Weaviate SkillNodeContentChunk
  7. Enqueue review

generate_content_localized(content_id: UUID, framework_id: str, actor_id: UUID)
  1. Load the base content, the localization brief, and the localization tokens
  2. Load content_localized prompt
  3. Call Gemini → sparse section_overrides (only sections that reference context)
  4. Validate: SymPy confirms no mathematical content changed
  5. Persist content_localizations row with status implicit (via a staging table or a
     review_status column — use a review_status column, migration in this task)
  6. Re-embed → LocalizedContentChunk
  7. Enqueue review
```

**`item_pipeline.py`** — Pipeline B:
```
generate_items(node_id: str, count: int = 20, actor_id: UUID) -> list[Item]
  1. Load published content + chunks from Weaviate
  2. Load item_generation prompt
  3. Call Gemini → items in the 18-type contract, with the tier mix from doc 05 §8
  4. Validate every item with validator.py:
     - SymPy agrees with every numeric answer
     - Every distractor carries a misconception_id (HARD GATE)
     - Reading level ≥ 2 years below grade band
     - Hints exactly 3
  5. Self-evaluate with self_evaluation prompt; reject if score < 0.7
  6. Dedup via dedup.py; drop if cosine < 0.15
  7. Persist items.status = 'generated' → 'tagged'
  8. For each active framework in the node's affected frameworks:
     - Generate item_localizations overrides via item_localization prompt
     - Re-validate with SymPy
     - Persist item_localizations row
  9. Embed stems → Weaviate ItemChunk and LocalizedContentChunk
  10. Enqueue review
```

**`framework_pipeline.py`** — Pipeline C (extension of the framework layer's import flow):
```
extract_objectives(framework_id: str, source: bytes) -> list[SyllabusObjective]
  1. objective_extractor on the source
  2. Persist as syllabus_objectives.status = 'draft'
  3. Signal the curriculum lead for correction — do not proceed

map_objectives(framework_id: str) -> list[ObjectiveNodeMapProposal]
  1. objective_mapper proposes mappings for every corrected objective
  2. Persist proposals (not mappings) in a staging table
  3. The lead reviews each mapping individually; the mapper service
     (from Task 7) is the only way to create an ObjectiveNodeMap row
  4. Bulk approve remains prohibited at the service layer

compute_coverage(framework_id: str) -> CoverageReport
  1. For each syllabus_objective in the framework, count nodes with ≥ 15
     published items and ≥ 5 tier-3 items
  2. coverage_pct = (# fully covered objectives) / (# objectives)
  3. Persist to framework_rollouts.coverage_pct
  4. Return the report; the framework cannot activate below 80%
```

**`localization_pipeline.py`** — Pipeline D:
```
refresh_localization(framework_id: str, actor_id: UUID)
  1. Load the updated localization brief
  2. Load every item_localizations and content_localizations row for this framework
  3. Regenerate each override via the localization_refresh prompt
  4. SymPy-validate every math-bearing override
  5. Stage as drafts (review_status = 'pending')
  6. Enqueue review; do not auto-replace
```

### 8.5 Celery tasks

`backend/app/workers/tasks/`:

- `node_tasks.py` — `task_author_nodes(subject, topic, actor_id)`
- `content_tasks.py` — `task_generate_content_canonical(node_id, actor_id)`, `task_generate_content_localized(content_id, framework_id, actor_id)`
- `item_tasks.py` — `task_generate_items(node_id, count, actor_id)`
- `framework_tasks.py` — `task_extract_objectives(framework_id, source_key, actor_id)`, `task_map_objectives(framework_id)`, `task_compute_coverage(framework_id)`
- `localization_tasks.py` — `task_refresh_localization(framework_id, actor_id)`
- `embed_tasks.py` — `task_embed_content(content_id)`, `task_embed_item(item_id)`, `task_embed_localized_content(content_id, framework_id)`

Every task:

- Uses `bind=True, max_retries=3`, retries with exponential backoff
- Records `generation_jobs` rows with `job_type`, `target_id`, `status`, `error`
- Writes structured telemetry: model, prompt version, token counts, latency, outcome
- Is idempotent — running the same task twice with the same inputs produces no duplicate rows

Queue priorities (Celery routing):

| Task group | Queue | Rate limit |
|---|---|---|
| Node authoring | `authoring` | 1/min |
| Content canonical | `authoring` | 1/min |
| Content localized | `localization` | 3/min |
| Item generation | `items` | 5/min |
| Framework extraction | `framework` | 1/5min |
| Framework mapping | `framework` | 1/5min |
| Localization refresh | `localization` | 2/min |
| Embedding | `embed` | 20/min |

Gemini rate limiting is enforced **per queue**, using `aiolimiter.AsyncLimiter`. The limiter is shared across workers via Redis. If the shared limiter is unavailable, workers **fail closed** — they do not exceed quota.

### 8.6 Review staging

Add a migration introducing a `review_status` column to `content_localizations`, `item_localizations`, and a staging table `objective_node_map_proposals`:

```sql
ALTER TABLE content_localizations
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected'));

ALTER TABLE item_localizations
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected'));

CREATE TABLE objective_node_map_proposals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id   TEXT NOT NULL REFERENCES curriculum_frameworks(framework_id),
  objective_id   TEXT NOT NULL REFERENCES syllabus_objectives(objective_id),
  proposed_node  TEXT NOT NULL REFERENCES skill_nodes(node_id),
  confidence     NUMERIC(3,2) NOT NULL,
  rationale      TEXT,
  review_status  TEXT NOT NULL DEFAULT 'pending'
                 CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by    UUID REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (framework_id, objective_id, proposed_node)
);
```

Content resolution (Task 7) must **only** apply `review_status = 'approved'` overrides. Pending or rejected overrides are invisible to learners.

### 8.7 Coverage reporting

`backend/app/services/coverage_service.py`:

- `compute_coverage(framework_id)` implements doc 02 §3 and doc 05 §8.
- Coverage counts an objective as covered only if **every node it maps to** has ≥ 15 published items and ≥ 5 tier-3 items. Partial coverage is reported but does not count.
- Writes to `framework_rollouts.coverage_pct` on every invocation.
- **Never** activates a framework. Activation is a separate service (Task 7), gated on the value this service writes.

### 8.8 Cost tracking

`backend/app/services/cost_service.py`:

- Every Gemini call records an entry in a new `gemini_calls` table (migration in this task): model, prompt version, input tokens, output tokens, cost estimate, framework_id if applicable, job_id.
- The service exposes `cost_by_framework(framework_id)` and `cost_by_pipeline(pipeline_name)`.
- Admin API endpoint `GET /analytics/costs` returns a breakdown.
- The framework expansion UI shows the running cost of each country's generation.

### 8.9 Tests

`backend/tests/unit/pipelines/`:

- `test_node_pipeline.py` — atomicity test rejection cases; a valid node passes; an `est_minutes = 5` node is rejected; a node with 1 named misconception is rejected.
- `test_content_canonical.py` — worked examples ≥ 3; reading level passes; KaTeX validates; a longer-than-allowed content is rejected.
- `test_content_localized.py` — a section with no localizable context is **not** overridden; a section with currency is overridden with the framework's currency; SymPy confirms the mathematical content is unchanged; a localization that changes the answer is rejected.
- `test_item_pipeline.py` — every numeric answer is SymPy-verified; a distractor without a `misconception_id` is rejected; reading level is enforced; a hint set with fewer than 3 hints is rejected; dedup drops a cosine < 0.15 item.
- `test_framework_pipeline.py` — extraction returns verbatim objectives; mapping returns proposals, never direct mappings; coverage computed correctly at the 80% boundary; a proposal cannot be bulk-approved.
- `test_localization_pipeline.py` — refresh regenerates overrides; math-invariance is enforced; approved overrides replace, rejected overrides do not.
- `test_shared_prompt_library.py` — every prompt file has a version header; every JSON-emitting prompt declares the JSON mime type; the CHANGELOG has an entry per version.

`backend/tests/integration/`:

- `test_pipeline_end_to_end.py` — a fake Gemini that returns canned responses drives A1 → A2 → B → C on a small fixture, asserts the resulting rows, and asserts the coverage gate and the review staging.

### 8.10 CI gates

Extend `.github/workflows/content-ci.yml`:

- **Every pipeline writes to `generation_jobs`** — a lint rule that checks each Celery task imports and calls the job recorder.
- **Every Gemini call is cost-recorded** — a lint rule that checks each call site goes through the cost service.
- **Every prompt is loaded from `shared/prompts/v1/`** — a grep gate: no inline prompt strings containing `"You are"` or `"Return JSON"` in `backend/app/ai/pipelines/`.
- **Every localization override has `review_status`** — a query gate run against the test fixture: zero rows without the column populated.
- **No pipeline task ever writes directly to `objective_node_map`** — grep gate on the pipelines folder.

**Definition of done:**

- Every pipeline is implemented, tested, and idempotent.
- Every prompt lives in `shared/prompts/v1/` with a version and a CHANGELOG entry.
- Every Gemini call is cost-tracked.
- Every override passes through a review staging row; unapproved overrides are invisible to learners (asserted in integration test).
- Coverage service computes the correct value at the 80% boundary; a framework at 79.9% cannot activate.
- Bulk approve remains impossible at the service layer and in the proposal staging table.
- The math-invariance gate fails a deliberately-introduced override that changes a numeric answer.
- The country-isolation lint rule still passes.
- `pytest` clean. `npm run test` clean (engine untouched). `npm run simulation` unchanged.
- All new CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact JSON schemas the prompts enforce, the shared rate limiter approach, and any place the spec was ambiguous.

**Do not proceed to Task 9 until the pipelines are confirmed.**

---

## TASK 9 — Content Studio (Country Tab, Review Queue, Coverage Dashboard)

---

**Context:** Tasks 1–8 complete and confirmed. The framework layer is stable. Content pipelines are live and staging every generated artifact behind a review status. Coverage is computed. The engine is stable and never called by the admin UI.

**Your task:** Build the Content Studio — the Next.js admin app that lets a curriculum lead run the entire content lifecycle for a country, review everything the AI generated, and gate framework activation on coverage.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§5** — UI screens, especially §5.4
2. `docs/00-product-plan.md` **§6** — governance rules the UI must enforce
3. `docs/00-product-plan.md` **§11** — task 9 acceptance criteria
4. `docs/02-curriculum-framework-spec.md` **§6** — the ten-stage import pipeline
5. `docs/02-curriculum-framework-spec.md` **§9** — governance, no bulk approve
6. `docs/05-assessment-item-spec.md` **§7** — item lifecycle, which statuses can be approved
7. `docs/10-engineering-standards.md` **§5** — the "reviewed" status is the publish floor
8. `docs/10-engineering-standards.md` **§6** — review checklist

**Deliverables, in order:**

### 9.1 Studio shell

`web/src/app/(admin)/layout.tsx`:

- Requires an admin role (`curriculum_lead`, `reviewer`, `content_admin`).
- RBAC enforced **server-side**; the layout only hides UI for defense in depth.
- Left rail: Country selector (persists to URL), framework selector, then the sections below.
- Top bar: user, role, "framework status" pill (`draft | importing | mapping | authoring | reviewing | piloting | active | superseded`), coverage percentage.

### 9.2 Dashboard — `(admin)/studio/page.tsx`

For the selected framework:

- Coverage gauge with the 80% gate marked.
- Review queue summary: count of pending nodes, contents, items, mappings, localizations.
- Latest generation jobs with status and elapsed time.
- Cost to date for this framework (from `cost_service`), broken down by pipeline.
- Blockers list from `framework_rollouts.blockers` (e.g., "3 mappings awaiting confirmation", "Coverage 78% < 80%").
- Primary CTA: `Activate Framework` — disabled unless `coverage_pct >= 80` and `blockers` is empty; a hover tooltip states the reason when disabled.

### 9.3 Skill Graph — `(admin)/studio/skill-graph/page.tsx`

- Prerequisite graph for the current subject, filtered by topic.
- Search by `node_id`, `title`, or `learner_title`.
- Each node shows status, `est_minutes`, hard/soft prerequisite count, and a `Generate content` action.
- Duplicate detection: highlight pairs with title similarity > 0.8 — the lead can merge or deprecate.
- **Node IDs are never editable in the UI.** A rename is impossible; a deprecation is a separate action with a reason field.

### 9.4 Framework Importer — `(admin)/studio/frameworks/[id]/import/page.tsx`

Five-step wizard, matching doc 02 §6:

1. **Upload** — the syllabus PDF (or paste the text). Records provenance.
2. **Extract** — triggers `task_extract_objectives`. Shows verbatim objectives as they arrive.
3. **Correct** — the lead edits the extracted list. Every objective is editable; the objective code is editable; the grade band is a dropdown populated from `framework_grade_bands`. The lead cannot proceed until every objective has been reviewed.
4. **Map** — for each objective, the lead sees the proposed node(s) with confidence scores from `objective_node_map_proposals`. **Each mapping is confirmed or corrected individually.** There is no "Approve all" button, and the API rejects bulk operations. The lead may accept, replace with a different node, or mark as unmapped.
5. **Coverage** — after mapping, the coverage report renders. Below 80%, the wizard shows the gap list and the CTA to generate missing nodes or items.

The wizard state persists per step; a page refresh does not lose progress.

### 9.5 Content Review — `(admin)/studio/content/page.tsx` and `.../content/[id]/page.tsx`

- List view: filter by node, status, reviewer, framework applicability. Sort by `created_at`, `estimated_minutes`, and content length.
- Detail view:
  - Block[] renderer (shared with the student reader) with a side-by-side JSON view.
  - Quality check panel: reading-level result, SymPy verification of every worked example, dedup result, KaTeX validity, worked-example count.
  - **Side-by-side approval flow:** base content (canonical) on the left; localized overrides for the currently-selected framework on the right, when any exist.
  - Approve / Reject with a mandatory reason on reject.
  - Reject re-queues generation with the reason appended to the prompt's `context` block; the reason is stored in the job row.
- **Per-framework visibility:** an approval of base content does not imply approval of any localization. Each is approved independently.

### 9.6 Item Review — `(admin)/studio/items/page.tsx` and `.../items/[id]/page.tsx`

- List with the same filters, plus: type, tier, discrimination band, distractor-tagging status.
- Detail view:
  - Full item rendered with the production item component (same as the student practice screen).
  - Distractor table: each wrong option, its `misconception_id`, and the misconception's `learner_facing_name`.
  - Hints accordion, all three levels, in order.
  - Worked solution.
  - Quality panel: SymPy verification result per numeric answer, reading level, media sizes, hint count.
  - **Tagging review:** the lead can accept the distractor tags or reassign each one. The UI refuses to approve an item with an untagged distractor.
  - Approve / Reject with mandatory reason on reject.
- Bulk actions are limited to **filtering and sorting only**. Approving in bulk is impossible at the API layer and the UI has no path to attempt it.

### 9.7 Mapping Review — `(admin)/studio/frameworks/[id]/mappings/page.tsx`

- Table of every objective in the framework with its current mapping (or unmapped state) and the coverage status.
- Each row expands to show the mapped nodes, the coverage of each node, and a per-row `Confirm`, `Edit`, or `Mark unmapped` action.
- **No "Confirm all" button. No keyboard shortcut to approve a row without opening it.** Every action records the actor and time.
- Below the table, a live coverage figure and the same gate indicator as the dashboard.

### 9.8 Localization Review — `(admin)/studio/localization/page.tsx`

- Per framework, list every `content_localizations` and `item_localizations` row with `review_status = 'pending'`.
- Detail view shows the base artifact and the proposed override side by side.
- The math-invariance check result is shown prominently. If SymPy found a change to a numeric answer, the override is **blocked from approval** and the reason is displayed.
- Approve / Reject with reason.
- Bulk approve is prohibited at the API layer.

### 9.9 Jobs Monitor — `(admin)/studio/jobs/page.tsx`

- Live view of `generation_jobs` for the selected framework.
- Columns: type, target, status, attempts, elapsed, error (truncated, expandable), cost.
- Retry button per failed job, capped at 3 total attempts.
- Live updates via Server-Sent Events from a `/api/admin/jobs/stream` endpoint.

### 9.10 Coverage Dashboard — `(admin)/studio/frameworks/[id]/coverage/page.tsx`

- Objectives grouped by grade band.
- For each objective: mapped nodes, node coverage, item count, tier-3 count, and a status pill (`full`, `partial`, `unmapped`).
- The overall coverage gauge with the 80% gate.
- A gap list sorted by grade band. Clicking a gap jumps to the node's `Generate content` action.

### 9.11 Cross-country view — `(admin)/studio/countries/page.tsx`

- One row per country with each active framework.
- Coverage, active learners, mean 30-day retention, mean success band, item error rate.
- **Reads only from `framework_cohort_stats`.** No query joins `skill_nodes` or `items`.
- A country card can be expanded to show its framework's rollout phase.

### 9.12 Activation flow

- The `Activate Framework` action is a modal, not a one-click button.
- The modal shows the coverage figure, the blocker list, and the last diff report (if any).
- The lead types the framework ID to confirm, then confirms again with a checkbox accepting the coverage-gate implications.
- The API rejects the call if `coverage_pct < 80` or `blockers` is non-empty. The UI cannot circumvent this — it is enforced server-side.

### 9.13 Component architecture

New components under `web/src/components/admin/`:

- `CoverageGauge.tsx`
- `ReviewQueueTable.tsx`
- `QualityCheckPanel.tsx` (shared across content, items, and localizations)
- `BlockRenderer.tsx` — **already exists in the student app**; the admin reuses it, does not fork it
- `ItemRenderer.tsx` — same; shared with the practice screen
- `DistractorTable.tsx`
- `HintAccordion.tsx`
- `FrameworkStatusPill.tsx`
- `BlockerList.tsx`
- `GenerationJobRow.tsx`
- `SkillGraphTree.tsx` (extension of the existing component, not a fork)
- `MappingReviewRow.tsx`
- `LocalizationDiff.tsx`
- `ActivateFrameworkModal.tsx`

**Rule:** the admin UI renders items and content through the same components the student app uses. There is one `BlockRenderer`, one `ItemRenderer`. Any rendering bug fixed in one is fixed in both.

### 9.14 Hooks

New hooks under `web/src/lib/hooks/admin/`:

- `useFramework(id)`
- `useCoverage(frameworkId)`
- `useReviewQueue(frameworkId, kind)`
- `useJobStream(frameworkId)`
- `useCostReport(frameworkId)`
- `useMappingProposals(frameworkId)`
- `useLocalizationQueue(frameworkId)`

All hooks use the shared Axios client with auth and RBAC headers. Server-Sent Events reconnect on drop with exponential backoff.

### 9.15 API additions on the backend

Add these endpoints, all admin-scoped:

```
GET    /api/admin/frameworks/:id/rollout
PATCH  /api/admin/frameworks/:id/blockers
POST   /api/admin/frameworks/:id/objectives/extract
PATCH  /api/admin/objectives/:id
POST   /api/admin/objectives/:id/mappings       # single objective, single node
DELETE /api/admin/objectives/:id/mappings/:node
POST   /api/admin/mappings/:proposal_id/confirm
POST   /api/admin/mappings/:proposal_id/reject
GET    /api/admin/content/:id/quality
POST   /api/admin/content/:id/approve
POST   /api/admin/content/:id/reject
GET    /api/admin/items/:id/quality
POST   /api/admin/items/:id/approve
POST   /api/admin/items/:id/reject
GET    /api/admin/localizations?framework_id=…
POST   /api/admin/localizations/:id/approve
POST   /api/admin/localizations/:id/reject
POST   /api/admin/jobs/:id/retry
GET    /api/admin/jobs/stream?framework_id=…    # SSE
GET    /api/admin/costs?framework_id=…
GET    /api/admin/coverage/:framework_id
GET    /api/admin/countries/compare
```

**No bulk endpoint exists.** Add a 405 handler on `/api/admin/*/bulk` returning a documentation link, so a future contributor cannot accidentally add one and have clients depend on it.

### 9.16 Tests

`web/src/app/(admin)/**/__tests__/`:

- Component tests for the coverage gauge, quality check panel, item renderer, distractor table.
- Interaction tests for the framework importer wizard, each step persisting correctly.
- An integration test that walks the entire flow against a local backend fixture: import a syllabus → correct objectives → map one at a time → generate content → review content → generate items → review items → generate localizations → review localizations → compute coverage → attempt activation at 79% (fails) → add items to cross 80% → attempt activation (succeeds).

`backend/tests/integration/test_admin_api.py`:

- Every admin endpoint enforces RBAC.
- The bulk approve endpoint returns 405.
- Approve and reject record actor and time.
- A rejected content item's reason appears in the subsequent generation job's `params`.

### 9.17 CI gates (Studio)

- **No bulk approve endpoints** — grep gate on the API routes folder.
- **No admin UI imports `/engine`** — lint rule. The admin UI never runs engine code.
- **Only one `BlockRenderer` and one `ItemRenderer`** — lint rule: these components are imported from a single canonical location.
- **Every review action records an actor** — a test that walks each approve/reject and asserts the audit row.

**Definition of done:**

- The Content Studio runs locally against a backend fixture and can complete an end-to-end framework import, review, and activation cycle.
- Activation is impossible below 80% coverage at the API layer, not just the UI.
- Bulk approve has no path in the UI and no endpoint on the API.
- Every review action is audited.
- The admin UI renders items and content through the shared renderers, verified by an import-check test.
- The SSE jobs stream reconnects after a dropped connection.
- The `BlockRenderer` and `ItemRenderer` are the same files used by the student app.
- `npm run typecheck && npm run test` clean in both `web/` and `backend/`.
- All new CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact RBAC scopes on each endpoint, how you verified bulk approve has no path, and any place the spec was ambiguous.

---

## Task Chaining Notes

Save both tasks to `docs/tasks/`:

```
docs/tasks/
├── task-1-mastery.md
├── task-2-elo.md
├── task-3-selection.md
├── task-4-placement.md
├── task-5-srs.md
├── task-6-escalation-simulation.md
├── task-7-framework-layer.md
├── task-8-content-pipelines.md
└── task-9-content-studio.md
```

Hand them one at a time. After each:

1. Read the agent's report.
2. Run the tests yourself.
3. Verify every item in "Definition of done."
4. Only then paste the next task.

If the agent reports complete but any definition-of-done item is not met, **do not proceed.** Re-paste the task with a specific note about what failed. The sequencing is deliberate — a broken content pipeline surfaces as incorrect items, and a broken review flow surfaces as unapproved content reaching learners. Both are silent until they corrupt the framework.




# 🎯 Questcademy — Tasks 10, 11 & 12 Hand-offs

Three self-contained prompts for the student-facing clients. Web is TypeScript (Next.js). Mobile is a **single Flutter codebase** that ships both **Android and iOS** — no separate native codebases, no platform-specific forks beyond what the framework requires. Offline and sync are shared contract-level concerns, addressed in Task 12.

Hand them one at a time, after Task 9 is confirmed complete and Content Studio is stable.

---

## TASK 10 — Student App: Web (Next.js 14, App Router)

---

**Context:** Tasks 1–9 complete and confirmed. The engine is stable and shipped as a WASM build of `/engine` for the web bundle. The framework layer is live. Content pipelines have published approved content. The Content Studio exists and shares rendering components with the student app — specifically `BlockRenderer` and `ItemRenderer`, which are the **only** sanctioned renderers.

**Your task:** Build the student-facing web application — onboarding, placement, learning path, node reader, practice, tutor, mock tests, progress, profile — and make it fully functional offline-capable with the sync contract from Task 12.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§4** — student-facing flow
2. `docs/00-product-plan.md` **§5** — UI screens
3. `docs/00-product-plan.md` **§7** — engine API surface the web client consumes
4. `docs/00-product-plan.md` **§10** — brand and design system
5. `docs/03-learning-science-spec.md` **§2** — dignity constraint (no grade shown, no comparison)
6. `docs/03-learning-science-spec.md` **§6** — desirable difficulty band
7. `docs/04-learning-engine-spec.md` **§2** — `NodeState`, `Attempt`, `Decision` types the client mirrors
8. `docs/04-learning-engine-spec.md` **§7.2** — placement presentation constraints
9. `docs/05-assessment-item-spec.md` **§3** — item types the client must render
10. `docs/05-assessment-item-spec.md` **§5** — hints, three levels
11. `docs/05-assessment-item-spec.md` **§6** — accessibility
12. `docs/10-engineering-standards.md` **§8** — reference device profile

**Deliverables, in order:**

### 10.1 Client foundation

- Next.js 14 App Router, TypeScript strict.
- Zustand stores for `auth`, `learner`, `nodeState`, `session`, `sync`.
- The engine is loaded from `@examgpt/engine` (WASM build). **The web client never re-implements engine logic.** If a predicate is needed, it is called through the engine package.
- HTTP client with auth interceptor, retry policy, and offline detection.
- A **service worker** (`next-pwa` or a hand-written SW) that caches:
  - The app shell
  - The active node's content (Block[])
  - The active node's item pool (all items ≤ 40 KB media)
  - The engine WASM binary
  - KaTeX fonts
- **Bundle budget:** app shell ≤ 2 MB gzipped excluding media. CI gate.

### 10.2 Onboarding

Route: `/onboarding`.

Three steps, matching doc 02 §3.2 framework selection and doc 04 §7 placement:

1. **Pick framework.** Country → board → framework list, filtered by `status = 'active'`. A learner may not select a framework in any other state.
2. **Placement.** Resumable (doc 04 §7.2). Full-screen, one item at a time, no progress percentage (only "we're finding your starting point"). Abandonment and resumption preserve state.
3. **Confirm target.** Optional exam date → sets the exam window for FSRS compression.

**Hard rule:** no score, no grade, no comparison shown to the learner at any point in onboarding. Copy is forward-looking.

### 10.3 Learning Path

Route: `/learn`.

- Lists nodes grouped by **topic** (navigation only, not dependency).
- Each node shows: `learner_title`, state pill (locked/available/in_progress/mastered/needs_review/relearning), estimated minutes.
- Locked nodes are dimmed and non-clickable; a hover or tap explains "complete X first" using `learner_title` of the blocking prerequisite — never the raw `node_id`.
- No grade band is shown anywhere.
- Available nodes sort by: review-due first, then prerequisite depth ascending, then FSRS urgency.

### 10.4 Node Reader

Route: `/learn/node/[node_id]`.

- Renders `skill_node_content` via the **shared** `BlockRenderer` — the same component the Content Studio uses.
- Uses `content_localizations` overrides resolved server-side by the content resolver. The client receives the resolved view and never sees localization logic.
- KaTeX rendering for every `MathBlock`, inline and block.
- Worked examples render as `WorkedExampleBlock` with progressive step reveal.
- The "Ask AI" side panel is docked right on desktop, bottom sheet on mobile-width viewports.
- A floating "Start practice" button always visible; scroll position is tracked for resumption.
- **No "Mark Complete" button.** Progression is a function of the mastery predicate, not user assertion.

### 10.5 Practice

Route: `/practice/[node_id]`.

- The client calls `selectNextItem` through the engine WASM package on each turn.
- Renders the item via the **shared** `ItemRenderer` — same as Content Studio.
- Implements **all 18 item types** (see doc 05 §3). Phase gating:
  - Phase 1 types (MCQ, multi-select, numeric, expression, cloze, ordering, matching, table) — full implementation.
  - Phase 2 types (number line, diagram labelling, hotspot, categorization) — full implementation.
  - Phase 3–4 types (short response, structured multi-part, graph, geometry, working-photo, audio) — stubs behind a feature flag that renders "coming soon" and disables selection. The engine is instructed not to serve these types until the flag is on.
- Hints: a three-level progressive disclosure. Level 3 **never** reveals the final answer.
- Feedback: immediate, misconception-specific, worded per doc 03 §9. Copy comes from `misconceptions.learner_facing_name`.
- No negative marking. Ever. Partial credit renders as a "partly right" badge but does not count toward the mastery gate.
- Interleaving: every 4th item comes from the review queue (the engine decides this; the client just renders what it receives).
- Latency: the client records `latency_ms` per item, from first paint to answer submission.

### 10.6 Tutor

Route: `/tutor`.

- Standard chat UI. Input supports text and image upload (OCR runs server-side).
- Every response is rendered through `BlockRenderer`, so math renders as KaTeX.
- The engine decides when to escalate — the client only sees a tutor entry point when the engine returns `Decision::escalate_to_tutor`.
- The tutor's RAG is scoped server-side to the learner's currently-pinned framework and the affected node. The client never passes a framework ID explicitly; the server uses the learner's pin.
- Suggested prompts render when the conversation is empty, drawn from the current node's `key_formulas` and `common_mistakes`.

### 10.7 Mock Tests

Route: `/tests`.

- The mock exam reads from `ExamStructure` in the learner's framework, so papers, durations, item types, and mark schemes match the real exam.
- Timer is client-side but validated server-side on submission.
- Mock exam attempts set `is_exam = true` and never count toward the mastery window (doc 04 §4).
- Error carried forward (doc 05 §3.12) is implemented for structured multi-part papers.
- On submission, the client shows a paper-by-paper breakdown, per-node performance, and a comparison to the learner's predicted score band — never a rank or percentile.

### 10.8 Progress

Route: `/progress`.

- Node-level mastery heatmap by topic.
- FSRS schedule preview: upcoming reviews in the next 7 days.
- Predicted exam score band (not a single number — a band, per doc 03 §11).
- Weekly minutes vs the ≥ 80 min dose goal, expressed as "your goal" not "target".
- **No grade level. No rank. No percentile. No comparison to peers.**

### 10.9 Profile

Route: `/profile`.

- Learner details, framework pin (with a "change framework" flow that creates a pin migration and shows mastery is preserved).
- Exam date setting.
- Notification preferences (parent/teacher digest opt-in).
- Accessibility settings: dyslexia-friendly font, reduced motion override, text size.
- Sign out, delete account (with confirmation).

### 10.10 Accessibility (doc 05 §6)

- All images carry alt text; KaTeX emits MathML for screen readers.
- A "read aloud" button on every stem; TTS reads `speech_text` when present, else the sanitized stem.
- Touch targets ≥ 44 dp.
- Keyboard operability on every interactive element.
- Colour is never the sole carrier of meaning — always paired with icon or text.
- `prefers-reduced-motion` respected globally; overridable per-learner in Profile.

### 10.11 Offline behaviour

The web app must function offline for the active node and its review queue. On reconnect:

- `attempts` records that were captured offline are replayed to the server **in order**.
- The client re-runs `apply_attempt` locally through the WASM engine to maintain a consistent local state, then reconciles against the server's authoritative state on reconnect.
- Reconciliation follows the sync contract in Task 12.

### 10.12 Tests

- Unit tests for every store, hook, and shared component.
- Interaction tests for onboarding, learning path, node reader, practice (one per item type), tutor, mock tests, progress.
- A golden-path end-to-end test: onboard → placement → first node → practice → mastery → review.
- An offline test: go offline after placement, complete a practice session, reconnect, verify attempts are replayed and server state matches the local prediction.
- Accessibility audit: axe-core on every route; zero serious violations.

### 10.13 CI gates

- Bundle budget ≤ 2 MB gzipped (excluding media). Fail hard.
- No direct import of `/engine` types — the client imports from `@examgpt/engine` only.
- Every route renders with a stubbed API returning empty state without crashing.
- Accessibility gate: axe-core on the CI build, fail on serious violations.
- No `dangerouslySetInnerHTML` outside the shared `Katex.tsx` component.

**Definition of done:**

- All routes implemented, tested, and accessible.
- All 18 item types implemented at their phase-appropriate depth.
- The shared `BlockRenderer` and `ItemRenderer` are the same files used by Content Studio — verified by a build test that asserts the import path.
- Offline capture, replay, and reconciliation match the Task 12 sync contract.
- The bundle stays within budget on the reference device profile.
- Every screen passes the dignity constraint check: no grade level, no rank, no comparison.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, how the WASM engine is loaded and cached, the exact offline-replay algorithm, and any place the spec was ambiguous.

**Do not proceed to Task 11 until the web client is confirmed.**

---

## TASK 11 — Student App: Mobile (Flutter, iOS + Android)

---

**Context:** Tasks 1–10 complete and confirmed. The web client is stable. The Flutter app ships both **Android and iOS from a single codebase**. Any divergence between platforms is a bug, not a design choice, except where the OS itself requires it (e.g., permissions, background behaviour).

**Your task:** Build the Flutter student app — feature parity with the web client, offline-first, and honouring the same engine contract via a Dart binding to the shared `/engine` build.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§4** — student-facing flow
2. `docs/00-product-plan.md` **§5** — UI screens
3. `docs/00-product-plan.md` **§10** — brand and design system (design tokens are the single source of truth for both web and mobile)
4. `docs/03-learning-science-spec.md` **§2** — dignity constraint
5. `docs/04-learning-engine-spec.md` **§2** — `NodeState`, `Attempt`, `Decision` types the Dart binding mirrors
6. `docs/04-learning-engine-spec.md` **§7.2** — placement presentation
7. `docs/05-assessment-item-spec.md` **§3** — item types
8. `docs/05-assessment-item-spec.md` **§5** — hints
9. `docs/05-assessment-item-spec.md` **§6** — accessibility
10. `docs/10-engineering-standards.md` **§8** — reference device: 2GB RAM Android, Android 8

**Deliverables, in order:**

### 11.1 Flutter foundation

- Single Flutter codebase targeting `android` and `ios` (also `web` if trivial, but not required).
- State management: **Riverpod** (consistent, testable, no InheritedWidget surprises).
- Navigation: `go_router` with deep-link support for `examgpt://node/{node_id}` and universal links on iOS.
- HTTP client: `dio`, with auth interceptor, retry policy, and offline detection via `connectivity_plus`.
- Secure storage: `flutter_secure_storage` for tokens; `isar` or `drift` for local state.
- The engine is bound via `flutter_rust_bridge` or a Dart **FFI** to the shared engine — whichever path the team selects, **there is exactly one binding and it is the same engine source**. No parallel Dart implementation of engine predicates. If a predicate is needed, it is called through the binding.
- Bundle size: cold start < 2.5 s and memory < 180 MB on the reference device (2 GB RAM, Android 8). CI gate.

### 11.2 Platform parity rules

- **One Flutter codebase.** No `android/` and `ios/` diverging beyond permission manifests, launch screens, and signing.
- Every screen renders identically unless an OS convention requires otherwise (e.g., iOS swipe-back, Android predictive back).
- The same `BlockRenderer` and `ItemRenderer` design is implemented once in Flutter, **not** ported from the React versions. The two implementations are conformance-checked against a shared renderer fixture (see §11.9).
- Design tokens come from `shared/design/tokens.json` via a generator (`dart run design_tokens`) — no hardcoded colors or sizes.

### 11.3 Onboarding

Same flow as web. Placement is resumable; state is stored in the local DB and synced on reconnect. Copy and dignity constraints are identical.

### 11.4 Learning Path

Same structure. Uses `SliverList` for smooth scrolling on low-end devices. Locked nodes are dimmed. No grade band rendered.

### 11.5 Node Reader

- Renders `Block[]` via the Flutter `BlockRenderer` (see §11.9).
- KaTeX rendering via `flutter_katex` with an **offline bundle** shipped in assets. No network fetch for math fonts.
- Worked examples reveal one step at a time.
- Ask AI panel opens as a bottom sheet on phone, docked right panel on tablet (≥ 768 px width).
- Scroll position is persisted per node.

### 11.6 Practice

- Same as web: the client calls `selectNextItem` through the engine binding each turn.
- All 18 item types implemented at their phase-appropriate depth (matching web).
- **Custom numeric keypad** — never the system keyboard for numeric entry. The system keyboard on Android Go devices is unusable for fractions and scientific notation.
- Expression entry uses a MathLive-equivalent Flutter widget, or a native math input that produces the same normalized LaTeX the web client produces. If no equivalent exists, expression entry is deferred to a later phase — it is **not** replaced with a text input.
- Hints and feedback as web.
- Latency recorded the same way.

### 11.7 Tutor

- Chat UI with text and image input. Image capture uses the OS-native camera permission flow.
- Responses render through the Flutter `BlockRenderer`.
- The engine's `escalate_to_tutor` decision surfaces the same entry point as web.

### 11.8 Mock Tests, Progress, Profile

Same as web. Progress renders the mastery heatmap using the Flutter chart library already in the app; no third-party analytics SDK.

### 11.9 Shared renderer fixtures

The single biggest risk is web and mobile renderers drifting. Mitigate with a fixture-driven conformance suite:

- `shared/renderer-fixtures/` contains ~40 JSON fixtures, each a `Block[]` or `Item` payload covering every block type and every item type.
- The web renderer tests render each fixture to a snapshot.
- The Flutter renderer tests render each fixture and produce a semantic-tree description.
- A CI job diffs the two semantic descriptions for known-equivalent output (e.g., text order, math presence, ordering of steps). Visual styling may differ; **structure must not**.

### 11.10 Offline

- The active node's content, its item pool, the engine binding, and the KaTeX bundle are all available offline.
- The local DB is the source of truth for the client's offline state; the server is the source of truth for the learner's canonical state.
- Attempts are captured with the local clock and queued for replay.
- Reconnect reconciliation follows Task 12's sync contract. The Flutter client and the web client use **the same** sync algorithm; only the transport differs.

### 11.11 Accessibility

- Flutter `Semantics` on every interactive widget.
- TalkBack (Android) and VoiceOver (iOS) verified on the reference device.
- Reduced motion override respected per OS setting and per learner setting.
- Dynamic type / font scale supported; layouts must not break at 200%.

### 11.12 Platform-specific

- **Android:** `minSdkVersion 26` (Android 8). Target the latest stable. Use `android:requestLegacyExternalStorage` never. App Bundle shipping, Play Store internal testing tracks for staged rollout.
- **iOS:** `iOS 14` minimum. Universal links for deep linking. App Store Connect TestFlight for staged rollout.
- Both platforms: crash reporting via a self-hosted Sentry **only** if the privacy policy permits; otherwise no crash reporting, and instead a local-only error log that the learner can opt to share.

### 11.13 Tests

- Widget tests for every screen and every item type.
- Golden tests for the shared renderer fixtures.
- A full offline test: airplane mode → practice session → reconnect → attempts replayed, server state matches.
- Conformance test against `shared/renderer-fixtures/` — semantic-tree diff against the web client.
- Accessibility audit on both platforms with the OS's screen reader.

### 11.14 CI gates

- Bundle size gate on the reference device profile.
- Golden test gate — renderer output must match the committed goldens.
- Conformance gate — semantic diff against web must pass.
- No `dart:io` usage outside the storage and network layers.
- No hardcoded colors or sizes outside the generated tokens file.

**Definition of done:**

- Feature parity with the web client across every screen and every item type.
- All 18 item types render and score identically to web (verified via the conformance suite).
- Cold start < 2.5 s and memory < 180 MB on the reference device.
- Offline capture, replay, and reconciliation match Task 12.
- Both platforms pass accessibility audit with the OS screen reader.
- The engine binding is the **only** engine implementation used on mobile.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact engine binding approach, how the renderer conformance suite works, and any place the spec was ambiguous.

**Do not proceed to Task 12 until the Flutter client is confirmed.**

---

## TASK 12 — Sync, Offline, and Reconciliation (Shared Contract)

---

**Context:** Tasks 1–11 complete and confirmed. Web and mobile clients exist with feature parity. Both capture attempts locally. Neither is yet reconciled against the server under adversarial conditions (duplicate delivery, out-of-order arrival, partial failure, clock skew, profile switch mid-session).

**Your task:** Design and implement the sync contract that keeps the local engine state and the server's canonical state consistent, and integrate it into both clients.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§2** — Attempt shape, idempotency
2. `docs/04-learning-engine-spec.md` **§5.4** — latency guard, half-K review/exam attempts
3. `docs/04-learning-engine-spec.md` **§11** — I-8 (attempt idempotency), I-9 (engine purity)
4. `docs/10-engineering-standards.md` **§4** — sync test requirements
5. `docs/10-engineering-standards.md` **§5** — parity CI gate

**Deliverables, in order:**

### 12.1 The sync contract

Formalise the contract in `docs/sync-contract.md`:

**Client owns:**

- Attempt capture with client clock
- Local engine state derived from the local attempt log
- Optimistic UI updates

**Server owns:**

- The canonical attempt log
- The canonical learner state (derived server-side by the same engine)
- Framework pins, item pools, content

**Reconciliation rule:**

- The server's state is authoritative on reconnect.
- Every attempt has a client-generated `attempt_id` (UUID v4). The server accepts an attempt only if the `attempt_id` is new; duplicates are idempotently ignored (I-8).
- Attempts are ordered by `(occurred_at, attempt_id)` on both sides. On conflict, the server's ordering wins.
- After the server replays the client's offline attempts, the client replaces its local state with the server's returned state. If the local prediction and the server state disagree, the disagreement is logged as a sync anomaly and reported for investigation — the client does **not** try to force its prediction.

### 12.2 Sync API

Add these endpoints:

```
POST /api/sync/attempts
  Body: { attempts: Attempt[] }
  Returns: { applied: string[], duplicates: string[], state: LearnerStateSnapshot }

POST /api/sync/state
  Body: { since: timestamp }
  Returns: { state: LearnerStateSnapshot, latest_attempt_at: timestamp }

GET  /api/sync/cursor
  Returns: { server_time: timestamp, cursor_version: int }
```

`LearnerStateSnapshot` is the same shape the engine consumes. The server computes it by replaying the canonical attempt log through the engine. **The snapshot is byte-identical to what the client would compute** if it had the same log — this is the parity contract.

### 12.3 Clock skew handling

Client clocks drift. The server records `received_at` separately from `occurred_at`.

- Attempts are ordered server-side by `occurred_at`, but a monotonic `server_sequence` is assigned on receipt.
- If `occurred_at` is more than 5 minutes in the future relative to `server_time`, the server rewrites `occurred_at` to `server_time - 5s` and logs the anomaly. The rewrite is reflected in the returned snapshot so the client can correct its local state.
- If `occurred_at` is more than 30 days in the past, the attempt is stored as `flagged: true` and **excluded from mastery evaluation** unless a curriculum lead explicitly includes it.

### 12.4 Duplicate and out-of-order delivery

- `attempt_id` idempotency is enforced at the DB level with a unique index.
- The server accepts attempts in any order within a sync batch; it reorders by `(occurred_at, attempt_id)` before replaying through the engine.
- If a batch contains an attempt that references an item no longer in the item pool (retired), the attempt is stored but excluded from Elo and mastery updates; a `content_gap` telemetry event fires.

### 12.5 Profile switch mid-session

A learner may switch profiles (e.g., a sibling's device) mid-session. The sync contract must handle this:

- Every attempt carries the `learner_id` under which it was captured.
- A batch may contain attempts from multiple learners; the server groups and processes each learner's attempts separately.
- The local DB is partitioned per `learner_id`. No cross-contamination is possible at the storage layer.

### 12.6 Partial failure

- The sync endpoint returns per-attempt status: `applied`, `duplicate`, or `rejected` (with reason).
- The client removes `applied` and `duplicate` attempts from the local queue and re-queues only `rejected` attempts with a manual-retry flag. Rejected attempts surface in a diagnostic screen for the learner ("3 attempts need review — tap to retry").
- If the batch itself fails (network, auth), no attempts are removed from the queue.

### 12.7 Conflict between local and server state

If, after reconciliation, the local state's `(status, ability_elo, mastery)` disagrees with the server's for any node:

- The server state is written to the local DB.
- A sync anomaly is logged with both states and the attempt IDs involved.
- The anomaly is visible in an admin diagnostic view; the learner never sees it unless it changes their visible path (rare).
- If the anomaly recurs for the same learner and node in 3 consecutive syncs, the platform raises an incident — this is always a bug, never normal.

### 12.8 Framework pin reconciliation

- The learner's framework pin is server-authoritative. A pin migration performed on another device is picked up on the next sync.
- Content resolved under an old pin is invalidated locally on pin change; the client re-fetches the active node's content.
- Attempts captured under an old pin are **not** discarded — they are stored against the learner's account and re-evaluated under the new pin's framework. If an item is not present in the new framework's scope, the attempt still counts toward Elo and mastery because mastery lives on nodes, not on frameworks (doc 02 §5.1, V-4).

### 12.9 The parity test

The single most important CI gate in the whole project.

- A fixed attempt log (1000 attempts, spanning placement, practice, reviews, lapses) is stored at `shared/testdata/attempt_log.json`.
- The server replays it through the engine and hashes the resulting state.
- The web client replays it through the WASM engine and hashes the resulting state.
- The Flutter client replays it through the engine binding and hashes the resulting state.
- All three hashes must match. Fail hard on mismatch.
- This gate runs on every commit to `/engine`, `backend/`, `web/`, or `mobile/`.

### 12.10 Tests

Backend:

- `test_sync_idempotency.py` — sending the same batch twice produces the same state.
- `test_sync_out_of_order.py` — a batch in shuffled order produces the same state as an ordered batch.
- `test_sync_clock_skew.py` — an attempt dated 1 hour in the future is rewritten; dated 60 days in the past is flagged.
- `test_sync_partial_failure.py` — a batch with 3 valid and 1 rejected attempt removes only the valid ones from the queue.
- `test_sync_retired_item.py` — an attempt against a retired item is stored but does not affect mastery.
- `test_sync_profile_switch.py` — a mixed batch is processed per learner without cross-contamination.
- `test_sync_pin_migration.py` — an attempt captured under an old pin is re-evaluated under the new pin without changing mastery.

Web and mobile:

- Equivalent test suites on each client, using the same fixtures.
- Offline capture → reconnect → reconcile → state matches server, per platform.

### 12.11 Diagnostics

Add an admin view: `(admin)/studio/sync-anomalies`.

- Lists anomalies with learner, node, both states, and the attempt IDs.
- Filters by recency, learner, node.
- Actions: mark as resolved (with reason), mark as false-positive, escalate to engineering (opens an issue with the payload attached).

### 12.12 CI gates

- Parity test (the hashed state match) — **fail hard**, blocks merge.
- Sync idempotency test — fail hard.
- Out-of-order test — fail hard.
- Clock skew test — fail hard.
- No client may implement engine predicates in Dart or TypeScript directly — grep gate across `web/` and `mobile/`.

**Definition of done:**

- The sync contract is formalised in `docs/sync-contract.md`.
- All sync endpoints implemented and tested.
- All client-side sync logic implemented on both web and mobile, using the same contract and the same fixtures.
- The parity test passes across server, web, and mobile.
- Clock skew, duplicate delivery, out-of-order arrival, partial failure, profile switch, and pin migration all have passing tests.
- Sync anomalies are visible to admins and never surfaced to learners except as a rare and clearly-explained retry prompt.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact ordering algorithm, how the parity test hashes state, and any place the spec was ambiguous.

---

## Task Chaining Notes

Save the three tasks to `docs/tasks/`:

```
docs/tasks/
├── task-10-web.md
├── task-11-mobile.md
└── task-12-sync-offline.md
```

Hand them one at a time. After each, verify the definition-of-done list item by item. The parity gate in Task 12 is the single highest-value gate in the entire project — a failure there means either the engine was re-implemented, or a client is running stale logic, and both would corrupt learner history silently. Do not merge Task 12 until the parity test has run green on three consecutive commits.




# 🎯 Questcademy — Tasks 13, 14 & 15 Hand-offs

Three self-contained prompts. Hand them one at a time, after Task 12 is confirmed complete and the parity gate has run green on three consecutive commits.

---

## TASK 13 — Backend API Surface (Student-Facing, Learner-Scoped)

---

**Context:** Tasks 1–12 complete and confirmed. The engine is stable. The framework layer is live. Content pipelines are live. The Content Studio is live. Web and mobile clients exist with offline-first sync. What is missing is the **coherent student-facing API surface** — the endpoints the two clients call for onboarding, learning path, node reader, practice, tutor, mock tests, progress, and profile.

Several endpoints already exist as stubs from earlier tasks. This task completes them, formalises their contracts, and makes the OpenAPI document the single source of truth that both clients consume.

**Your task:** Complete the student-facing API surface, generate the OpenAPI spec, wire the client SDK generation, and enforce the contract in CI.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§4** — student-facing flow
2. `docs/00-product-plan.md` **§5** — UI screens
3. `docs/00-product-plan.md` **§7** — engine interface the API exposes
4. `docs/00-product-plan.md` **§11** — Task 7's framework API (already built)
5. `docs/04-learning-engine-spec.md` **§2** — `NodeState`, `Attempt`, `Decision` shapes
6. `docs/04-learning-engine-spec.md` **§6** — selection
7. `docs/04-learning-engine-spec.md` **§7** — placement (resumable step API)
8. `docs/04-learning-engine-spec.md` **§8** — FSRS scheduling
9. `docs/04-learning-engine-spec.md` **§9** — escalation
10. `docs/05-assessment-item-spec.md` **§1** — Item contract
11. `docs/10-engineering-standards.md` **§5** — CI gates
12. `docs/10-engineering-standards.md` **§7** — release / backward compatibility

**Deliverables, in order:**

### 13.1 API surface

Endpoints, all under `/api/v1/` (versioned per doc 10 §7 — 12-month backward compatibility minimum):

**Learner profile:**

```
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/framework-pin
POST   /api/v1/me/framework-pin/migrate
GET    /api/v1/me/accessibility
PATCH  /api/v1/me/accessibility
GET    /api/v1/me/notifications
PATCH  /api/v1/me/notifications
DELETE /api/v1/me
```

**Onboarding:**

```
GET    /api/v1/onboarding/frameworks               # active frameworks only
POST   /api/v1/onboarding/placement/init
GET    /api/v1/onboarding/placement/state          # resumable
POST   /api/v1/onboarding/placement/probe
POST   /api/v1/onboarding/placement/finalize
GET    /api/v1/onboarding/placement/result
PATCH  /api/v1/onboarding/exam-date
```

Placement endpoints mirror the resumable step API from doc 04 §7. Each step is idempotent and takes the `placement_state_id` returned by `init`.

**Learning path:**

```
GET    /api/v1/learning-path                       # returns ordered list of node states
GET    /api/v1/learning-path/topics                # topic groupings (navigation only)
GET    /api/v1/learning-path/next                  # the engine's next Decision
```

Each node in the response is a resolved view: `learner_title`, `state`, `est_minutes`, blocking prerequisite's `learner_title` if locked. **No grade band. No `node_id` exposure unless needed for a deep link.**

**Node reader:**

```
GET    /api/v1/nodes/{node_id}                     # metadata + prerequisite info
GET    /api/v1/nodes/{node_id}/content             # resolved via content resolver
GET    /api/v1/nodes/{node_id}/progress            # scroll position, time spent
PATCH  /api/v1/nodes/{node_id}/progress
```

Content is resolved server-side through the learner's framework pin. The client never sees localization logic.

**Practice:**

```
POST   /api/v1/practice/sessions                   # start session, get session_id
GET    /api/v1/practice/sessions/{id}/next         # engine-selected next item (Decision)
POST   /api/v1/practice/sessions/{id}/attempts     # submit attempt
POST   /api/v1/practice/sessions/{id}/hints        # record hint usage
POST   /api/v1/practice/sessions/{id}/pause
POST   /api/v1/practice/sessions/{id}/resume
POST   /api/v1/practice/sessions/{id}/end
```

Attempts are the shape from doc 04 §2.1. Hint recording is separate from the attempt because a hint may be consumed without submitting.

**Tutor:**

```
POST   /api/v1/tutor/sessions
POST   /api/v1/tutor/sessions/{id}/messages
GET    /api/v1/tutor/sessions/{id}/messages
POST   /api/v1/tutor/sessions/{id}/image            # OCR input
DELETE /api/v1/tutor/sessions/{id}
```

The tutor never runs inside `/engine`. The engine returns `escalate_to_tutor`; the client opens a session; the server resolves RAG context from the learner's framework pin and calls Gemini.

**Mock tests:**

```
GET    /api/v1/tests/available                     # from ExamStructure of the learner's framework
POST   /api/v1/tests/sessions
GET    /api/v1/tests/sessions/{id}/next
POST   /api/v1/tests/sessions/{id}/attempts
POST   /api/v1/tests/sessions/{id}/submit          # validates timer, returns full report
GET    /api/v1/tests/sessions/{id}/report
```

Mock attempts set `is_exam = true` and never count toward mastery. Error carried forward is applied server-side for structured multi-part papers.

**Progress:**

```
GET    /api/v1/progress/summary
GET    /api/v1/progress/mastery                    # node-level heatmap data
GET    /api/v1/progress/fsrs-preview               # next 7 days of reviews
GET    /api/v1/progress/predicted-score            # band, not point
GET    /api/v1/progress/dose                       # weekly minutes vs goal
```

All response shapes are documented with the dignity constraint in comments: no grade, no percentile, no rank.

**Sync:** already exists from Task 12 under `/api/sync/`. Move under `/api/v1/sync/` with a redirect from the old path. Backward compat window applies.

**Review queue:** exposed via the practice session's `next` endpoint when the engine decides. No standalone endpoint for the client to fetch reviews directly — the engine is the selector.

### 13.2 Response shapes

Every response is a Pydantic v2 model with:

- Field-level `description` used to generate OpenAPI docs.
- `examples` on every non-trivial field for the OpenAPI document.
- Explicit `Optional[...]` typing; no `Any`.

A shared `LearnerSnapshot` model that both the learning path and sync endpoints use, so the client has one shape to reason about.

### 13.3 Authentication and RBAC

- JWT in the `Authorization: Bearer` header.
- Refresh tokens with rotation, sliding window.
- Every endpoint under `/api/v1/me/*` is self-scoped. Attempting to access another learner's data returns 403 with a stable error code — **not** 404, which would leak existence.
- Admin endpoints remain under `/api/admin/` and enforce the `curriculum_lead`, `reviewer`, `content_admin` scopes from Task 7/9.
- Rate limits per learner: 60 req/min for read endpoints, 20 req/min for write endpoints, 10 req/min for tutor messages.

### 13.4 Error contract

Standard error envelope:

```json
{
  "error": {
    "code": "PLACEMENT_STATE_EXPIRED",
    "message": "The placement session expired. Start a new one.",
    "details": { "placement_state_id": "..." }
  }
}
```

Every error code has a stable string and is documented in `docs/api-reference.md`. Codes are never reused for different conditions.

### 13.5 OpenAPI document

- Generated by FastAPI at `/api/v1/openapi.json`.
- Committed to `shared/schema/openapi.json` on every merge to `main`.
- The committed spec is the SDK source of truth. Clients do not hand-write API calls.

### 13.6 Client SDK generation

- **Web:** `openapi-typescript` produces `web/src/lib/api/generated/schema.d.ts`. The hand-written client wrapper imports types from this file; it does not define types itself.
- **Flutter:** `openapi-generator` produces `mobile/lib/api/generated/` with typed models and a client. Hand-written wrappers layer auth and retries on top.
- **CI gate:** a client-side type mismatch with the committed OpenAPI spec fails the build.

### 13.7 Consent and PII

- Every response that includes a field with learner PII is marked in the OpenAPI document with `x-pii: true`.
- A CI check ensures no PII field appears in an unauthenticated endpoint.
- The `DELETE /api/v1/me` endpoint performs a soft delete by default and a hard delete after a 30-day grace period, in line with the platform's privacy policy. The audit trail of the deletion is preserved; the learner data is not.

### 13.8 Tests

- `backend/tests/unit/api/` — one test file per router. Each endpoint tested for:
  - Success with valid input.
  - 401 with no token.
  - 403 with another learner's resource.
  - 422 with malformed input.
  - Rate limit header correctness.
- `backend/tests/integration/api/` — full journeys:
  - Onboard → placement → first node → first practice session → mastery → review.
  - Tutor session with RAG context scoped to the learner's pin.
  - Mock test with error carried forward.
  - Framework pin migration mid-session.
- OpenAPI snapshot test — the committed spec matches the runtime spec after generation.

### 13.9 CI gates

- **OpenAPI committed:** the committed `shared/schema/openapi.json` matches the runtime generation. Fail hard on mismatch.
- **No PII in unauthenticated endpoints** — grep gate on the OpenAPI document.
- **Every endpoint has a stable error code** — a test that walks the routes and asserts each declared error has a code.
- **Client type generation:** running the SDK generators on the committed spec produces no diff. Fail hard on drift.
- **Backward compatibility:** the previous released OpenAPI spec and the current one are diffed. Any breaking change requires a new `/api/vN/` prefix; a breaking change on an existing version fails the build.

### 13.10 Documentation

`docs/api-reference.md` is generated from the OpenAPI document, plus hand-written narrative sections for:

- Authentication flow.
- Rate limits.
- Sync contract (links to `docs/sync-contract.md`).
- Framework pin migration.
- Error code catalogue.

**Definition of done:**

- Every endpoint implemented, tested, and documented.
- The OpenAPI document is generated, committed, and stable.
- Client SDKs generate cleanly from the spec; no hand-written types in either client.
- Backward compatibility gate passes.
- PII audit passes.
- Rate limits enforced and tested.
- Every error has a stable code and a documented reason.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact OpenAPI generation pipeline, the RBAC enforcement pattern, and any place the spec was ambiguous.

**Do not proceed to Task 14 until the API surface is confirmed.**

---

## TASK 14 — Notifications, Parent and Teacher Digests, and Dose Accountability

---

**Context:** Tasks 1–13 complete and confirmed. The API surface is stable. Every learner has a well-defined dose goal from doc 03 §12 (≥ 80 minutes/week). Dose is the single metric that kills the project if missed. The platform must nudge without becoming noise.

**Your task:** Build the notification subsystem — in-app, push, and the parent/teacher digest — with the same discipline the rest of the platform applies to learning science.

**Read first, in this order:**

1. `docs/03-learning-science-spec.md` **§11** — self-determination, rejections
2. `docs/03-learning-science-spec.md` **§12** — dosage
3. `docs/03-learning-science-spec.md` **§13** — rejected practices (leaderboards, streak-only motivation, personality typing)
4. `docs/00-product-plan.md` **§4** — the flow (exam window suppression)
5. `docs/02-curriculum-framework-spec.md` **§4** — academic calendar, exam windows
6. `docs/10-engineering-standards.md` **§5** — CI gates
7. Local privacy law where the learner resides — the platform does not assume one jurisdiction

**Deliverables, in order:**

### 14.1 Notification taxonomy

Every notification is typed and registered. No ad-hoc strings.

| Type | Trigger | Channel | Recipient | Suppression rules |
|---|---|---|---|---|
| `review_due` | FSRS due queue non-empty and no session today | Push | Learner | Suppressed inside exam window's final 24h before a mock |
| `dose_shortfall` | Weekly minutes below 80% of goal, sent Thursday evening | Push + in-app | Learner | Suppressed during holidays and school breaks |
| `streak_at_risk` | Streak active and no session by 19:00 local | Push | Learner | Grace days apply; never on consecutive days |
| `milestone_mastered` | First mastery of a node in a topic | In-app only | Learner | Never pushes |
| `framework_updated` | Framework superseded; learner pin older than new version | In-app banner | Learner | Never pushes; dismissible |
| `parent_weekly_digest` | Weekly, Sunday evening local | WhatsApp + email | Parent (opt-in) | Suppressed during holidays and breaks |
| `teacher_dose_report` | Weekly, Monday morning local | Email | Teacher | Suppressed during holidays and breaks |
| `teacher_gap_report` | Weekly, Monday morning local | Email | Teacher | Only if the class has a mastery gap > 20% between top and bottom quartiles |
| `consent_reminder` | Voice recording enabled, consent not confirmed within 7 days | In-app | Parent | Only once |

**Rule:** a notification type not in this table must not fire. There is no generic "send" API.

### 14.2 Suppression rules

Every notification is filtered by:

- **Quiet hours:** no push between 21:00 and 07:00 local, no exceptions.
- **Exam window:** no push of any type in the 24 hours before a registered mock or real exam, except `review_due` for a node whose FSRS interval has elapsed by ≥ 2 days.
- **Calendar:** all non-essential notifications suppressed during holidays and school breaks (from `academic_calendars.holidays`).
- **Frequency cap:** no more than 3 push notifications per learner per day, no more than 10 per learner per week, regardless of trigger.
- **Automatic opt-out after 4 ignored weeks:** if the learner has not opened a push in 4 consecutive weeks, push pauses for 2 weeks and resumes only on a mastery event.

### 14.3 Delivery infrastructure

- **Push:** Firebase Cloud Messaging (FCM) for Android, APNs for iOS, Web Push (VAPID) for web. Single `PushService` abstraction; providers are pluggable.
- **WhatsApp:** Meta Cloud API, with a template message for the parent digest. Template reviewed and approved per locale.
- **Email:** transactional provider (e.g., Postmark or equivalent). Templates rendered from `shared/design/tokens.json` for consistency with brand.
- **In-app:** a `notifications` table per learner with read/unread state.

### 14.4 Digest content (parent)

The digest is a single message. It contains:

- Learner first name.
- Weekly minutes (as a bar vs goal, not a number alone).
- Nodes mastered this week (count, no names).
- One forward-looking sentence: "Next up: [topic from the current frontier]."
- One optional note if a mastery anomaly was detected: "Rivers is spending a lot of time on fractions — this is normal at this stage."
- Never: a rank, a percentile, a comparison to another child, a grade level, or any diagnostic label.

The digest is drafted by an LLM **only from a fixed template with slots**, never free-form. Every sentence is authored by the curriculum team, filled by numbers. The LLM's only role is translation into the learner's local language, and even that is validated against a human-authored reference.

### 14.5 Teacher reports

- One page per class, one row per learner.
- Columns: minutes this week, nodes mastered, nodes in review, one word for "moving forward / stuck / needs attention."
- **No individual leaderboard.** Classes are shown as aggregates plus a per-learner strip that teachers can sort privately.
- The "needs attention" flag is triggered only by a persistent gap (no mastery in 3 weeks despite ≥ 60 min/week), not by a single bad week.

### 14.6 Consent and opt-in

- Parent digest is opt-in. No digest sends until the parent confirms via a one-tap link.
- Voice recording features (Phase 4) require explicit written consent from a parent or guardian, with the exact wording stored alongside the timestamp.
- Consent can be withdrawn at any time from within the app; withdrawal triggers immediate cessation of the affected notification type.

### 14.7 Provider abstractions

```
PushProvider           — FCM | APNs | WebPush | Null
MessagingProvider      — WhatsApp Cloud | Email | Null
DigestRenderer         — template + slots
NotificationScheduler  — reads triggers, applies suppression, enqueues
```

`Null` providers are required so the platform can run in a local or test environment with zero external calls.

### 14.8 Data model

```sql
CREATE TABLE notification_preferences (
  learner_id        UUID REFERENCES users(id),
  channel           TEXT NOT NULL,           -- 'push' | 'whatsapp' | 'email'
  notification_type TEXT NOT NULL,
  enabled           BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (learner_id, channel, notification_type)
);

CREATE TABLE notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id        UUID REFERENCES users(id),
  notification_type TEXT NOT NULL,
  payload           JSONB NOT NULL,
  delivered_at      TIMESTAMPTZ,
  opened_at         TIMESTAMPTZ,
  suppressed        BOOLEAN NOT NULL DEFAULT FALSE,
  suppression_reason TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE parent_contacts (
  learner_id        UUID REFERENCES users(id),
  contact_kind      TEXT NOT NULL,           -- 'whatsapp' | 'email'
  contact_value     TEXT NOT NULL,
  consent_given_at  TIMESTAMPTZ,
  consent_withdrawn_at TIMESTAMPTZ,
  locale            TEXT NOT NULL,
  PRIMARY KEY (learner_id, contact_kind)
);

CREATE TABLE teacher_classrooms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id        UUID REFERENCES users(id),
  name              TEXT NOT NULL,
  framework_id      TEXT REFERENCES curriculum_frameworks(framework_id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE teacher_classroom_members (
  classroom_id      UUID REFERENCES teacher_classrooms(id),
  learner_id        UUID REFERENCES users(id),
  joined_at         TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (classroom_id, learner_id)
);
```

### 14.9 Scheduler

A Celery beat task runs every 5 minutes and evaluates the trigger table. It:

1. Loads all active learners with any enabled notification type.
2. Computes the trigger state per learner.
3. Applies suppression rules.
4. Enqueues deliveries with a per-provider rate limit.

The scheduler is idempotent: running it twice within the same 5-minute window produces no duplicates.

### 14.10 Tests

- `test_suppression.py` — quiet hours, exam window, holidays, frequency cap, auto opt-out.
- `test_digest_rendering.py` — the digest renders from a template with slots; no free-form LLM text reaches the wire.
- `test_opt_in.py` — no digest sends before consent; withdrawal stops it immediately.
- `test_idempotent_scheduler.py` — running twice in one window produces no duplicates.
- `test_teacher_report.py` — no leaderboard, per-learner strip sortable, "needs attention" only on persistent gap.
- `test_providers.py` — every provider has a Null implementation that records intent without sending.

### 14.11 CI gates

- **No free-form LLM text in digests** — a test that asserts every outbound digest body matches a template + numeric slot.
- **No notification without a registered type** — a lint rule.
- **Quiet hours respected** — a test that verifies no push enqueues between 21:00 and 07:00 local under any trigger.
- **Frequency cap respected** — a test that floods triggers and asserts the cap.
- **Consent gate** — a test that sends a digest trigger before consent and asserts no delivery.

**Definition of done:**

- Every notification type in the taxonomy implemented with its suppression rules.
- Scheduler idempotent and rate-limited.
- Digest content is template-driven, not LLM-authored.
- No leaderboard exists anywhere in the teacher or parent surface.
- Consent flows complete with withdrawal support.
- All CI gates fail when deliberately violated.
- Local test environment runs with `Null` providers and passes every test.

**Report at the end:** which sections you read, the exact suppression algorithm, how the digest templates are versioned, and any place the spec was ambiguous.

**Do not proceed to Task 15 until notifications are confirmed.**

---

## TASK 15 — Infrastructure, Deployment, and Release Pipeline

---

**Context:** Tasks 1–14 complete and confirmed. The engine, backend, Content Studio, web, mobile, and sync are stable in development. Nothing is deployed. There is no production environment, no release pipeline, no observability. The reference device exists on a desk but is not part of any automated flow.

**Your task:** Stand up production infrastructure, the release pipeline, observability, and the runbooks that make operating the platform a known process rather than a heroic one.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§8** — repository structure
2. `docs/00-product-plan.md` **§9** — engineering standards, especially §9.5 (CI gates), §9.6 (review), §9.7 (release), §9.8 (reference device), §9.9 (definition of done)
3. `docs/10-engineering-standards.md` **§5** — CI gates
4. `docs/10-engineering-standards.md` **§7** — release and staged rollout
5. `docs/10-engineering-standards.md` **§8** — reference device

**Deliverables, in order:**

### 15.1 Environments

Three environments, all reproducible from code:

- **`dev`** — local Docker Compose; Null providers; SQLite optional for ultra-fast iteration but Postgres is required for anything touching JSONB or migrations.
- **`staging`** — production-shaped, single-region, synthetic data only. Every PR merges to staging automatically.
- **`prod`** — multi-region, real data, restricted access, every deploy requires a two-person approval.

No environment may use a shared secret with another. Secrets are managed in a dedicated secrets store (Infisical, Vault, or cloud-native equivalent).

### 15.2 Infrastructure as code

- Terraform (or Pulumi) for all cloud resources.
- Docker Compose for local. Kubernetes manifests (or a managed equivalent — ECS, Cloud Run) for staging and prod.
- The IaC is in `infra/`, versioned with the code, reviewed like code.
- Every infrastructure change goes through a PR. No console changes to prod.

### 15.3 Container builds

- Multi-stage Dockerfiles for `backend`, `web`, `content-tools`.
- Builds are deterministic: pinned base images, pinned dependencies, no `latest` tags.
- Images are signed (cosign or equivalent) and scanned (Trivy or equivalent) in CI. A critical vulnerability blocks the release.
- Flutter builds are not containerised — they run on a macOS runner for iOS and a Linux runner for Android. Signing keys are in the secrets store, rotated quarterly.

### 15.4 Database operations

- Alembic migrations run automatically on deploy to staging; on prod they run in a **separate** job, with an explicit approval step.
- Every migration is tested against a production-shaped snapshot before merge. The test asserts both `upgrade` and `downgrade`.
- Long-running migrations use the expand-contract pattern: add new column → backfill → dual write → cutover → drop old column. Never a single migration that rewrites a large table.
- Nightly snapshots to object storage, retained 30 days; weekly to cold storage, retained 1 year.
- A restore drill runs monthly against staging. A runbook documents it.

### 15.5 Redis and Weaviate operations

- Redis is used for cache and Celery broker. Cache and broker are separate logical databases with separate eviction policies (cache: `allkeys-lru`, broker: `noeviction`).
- Weaviate runs with a persistent volume, daily backups to object storage, and a restore drill on the same monthly cadence as Postgres.
- A Weaviate reindex job exists and is tested. If the vector store is lost, the pipeline that repopulates it is a single command.

### 15.6 Release pipeline

Per doc 10 §7:

- **Server (backend + web):** continuous deploy to staging on merge. Prod deploy behind a manual approval, in a canary window.
- **Mobile:** fortnightly releases. Android via Play Store internal → closed → production tracks. iOS via TestFlight → App Store phased release.
- **Content (frameworks, items, content):** content changes deploy through the Content Studio review queue, not through the code pipeline. A content deploy is a promotion of an approved framework version, with the same canary logic as code (2 pilot schools → 10% → 100%).
- **Engine changes:** require a second reviewer, a simulation diff, and a parity test run. Deploy server first, then web, then mobile — in that order, verifying state parity after each step. Mobile has a longer tail because users update slowly; the parity contract is what makes this safe.

### 15.7 Feature flags

- A flags service (Unleash, Flagsmith, or home-built) is required. No flags in environment variables.
- Every learner-facing feature is behind a flag on first release.
- Flags are documented with an owner and a removal date. Stale flags are removed quarterly — enforced by a CI job that fails after the removal date.
- Flags are evaluated per learner, per framework, and per cohort.

### 15.8 Observability

- **Metrics:** Prometheus-compatible. The platform emits metrics for the engine (per doc 04 §14), the API (per endpoint, latency, error rate), the pipelines (per prompt, per model, per framework), the sync path (parity matches, anomalies), and the notification scheduler (deliveries, suppressions).
- **Traces:** OpenTelemetry across backend, Celery workers, and the SDK clients. Sampling rate is high on error paths, low on success paths.
- **Logs:** structured JSON, correlated by trace ID. PII is never logged; a lint rule enforces this.
- **Dashboards:** a single operational dashboard lists:
  - Engine invariants currently violated (must be zero — paged).
  - Simulation drift since last merge.
  - Sync parity mismatches.
  - Cost per framework per day.
  - Notification delivery rate and suppression breakdown.
- **Alerts:** paging on invariant violation, parity mismatch, sync anomaly recurrence (3 in a row), pipeline failure rate > 5% over 15 minutes, cost per framework exceeding 2× its running average.

### 15.9 The reference device in CI

Per doc 10 §8, the reference device is not a suggestion. It is wired into the pipeline:

- A physical device (2GB RAM, Android 8) is connected to a self-hosted runner.
- On every PR touching `web/` or `mobile/`, an automated suite installs the build, runs the golden-path flow, measures cold start and memory, and reports.
- Fails the PR if cold start > 2.5 s or memory > 180 MB.
- A weekly manual pass by a human is still required, documented as a checklist in `docs/runbooks/reference-device-weekly.md`.

### 15.10 Runbooks

`docs/runbooks/`:

- `incident-response.md` — severity levels, on-call rotation, escalation.
- `database-restore.md` — Postgres restore from snapshot, verified quarterly.
- `weaviate-restore.md` — vector store rebuild from Postgres, verified quarterly.
- `framework-rollback.md` — reverting a framework to a superseded version, forcing affected learners onto it, and notifying them.
- `content-quarantine.md` — withdrawing an item or content from serving without losing historical attempts.
- `engine-rollback.md` — the exact procedure for rolling back the engine across server, web, and mobile, including the parity verification at each step.
- `reference-device-weekly.md` — the checklist from doc 10 §8.
- `cost-spike.md` — what to do if a framework's generation cost exceeds budget.

### 15.11 Access and secrets

- No engineer has standing access to prod. Access is granted per incident, expires in 24 hours, and is logged.
- All secrets are rotated quarterly, or immediately on any suspected exposure. Rotation is tested — the platform remains available through a rotation.
- The signing keys for mobile releases are held in a hardware token, not in the cloud. Documented in `docs/runbooks/mobile-signing.md`.

### 15.12 Tests

- Infrastructure tests: `terraform plan` runs on every PR; the plan is reviewed for unexpected changes.
- Deploy tests: a staging deploy runs a smoke suite (auth, onboarding, placement, one practice item, one sync).
- Rollback tests: every runbook has a corresponding automated test that performs the action in staging and verifies the platform remains available.
- Cost gate: daily cost report for each framework is compared to the running average; an alert fires on 2× drift.

### 15.13 CI gates

- All existing gates (Tasks 1–14) still pass.
- Container image scan — fail on critical vulnerability.
- Terraform plan — fail on unexpected resource creation or destruction.
- Deploy smoke suite — fail if any critical path is not green within 5 minutes of staging deploy.
- Reference device suite — fail on cold start or memory budget exceedance.
- Migration `downgrade` test — fail if any migration's downgrade does not restore the previous schema.
- PII logging lint — fail if any log statement includes a field marked `x-pii`.

**Definition of done:**

- All three environments reproducible from code.
- CI runs the full gate suite; every gate fails when deliberately violated.
- Every runbook exists and has a passing automated test in staging.
- The reference device is wired into CI on both web and mobile pipelines.
- Observability dashboards and alerts are live in staging.
- Feature flag service is live; every learner-facing flag has an owner and a removal date.
- Secrets rotation is tested and passes.
- The first production deploy has run end-to-end with two-person approval.
- A post-deploy verification checklist has been executed and signed off.

**Report at the end:** which sections you read, the exact release sequence for engine changes (server → web → mobile), how the reference device is wired into CI, and any place the spec was ambiguous.

---

## Task Chaining Notes

Save the three tasks to `docs/tasks/`:

```
docs/tasks/
├── task-13-api-surface.md
├── task-14-notifications.md
└── task-15-infrastructure.md
```

Hand them one at a time. After each:

1. Read the agent's report.
2. Run the tests yourself on staging.
3. Verify every item in "Definition of done."
4. Only then paste the next task.

Task 15 is the last foundational task. After it, the platform is production-ready and the remaining work is content: importing frameworks, authoring nodes, generating and reviewing items. That work is not a coding task — it is the curriculum team's ongoing program, and every country expansion from here is a **content project, not an engineering project**. If any expansion requires a code change outside the framework models and the localization overlays, the abstraction has failed and the plan needs revisiting before proceeding.



# 🎯 Questcademy — Tasks 16 & 17 Hand-offs

Two final foundational tasks. Task 16 hands the platform to the curriculum team and proves the country-expansion abstraction holds in practice. Task 17 pre-registers the RCT and builds the instrumentation that makes its questions answerable.

Hand them one at a time, after Task 15 is confirmed complete and the platform is production-ready.

---

## TASK 16 — Curriculum Team Onboarding and the First Country Import

---

**Context:** Tasks 1–15 complete and confirmed. The platform is production-ready. The engine is stable, the content pipelines are live, the Content Studio is live, and the infrastructure is deployed to `staging` and `prod` with the reference device wired into CI.

What does not yet exist is a **curriculum team** with a defined workflow — and, critically, one proven case of a **first country import** performed end-to-end by that team, on real syllabus content, with a real framework going active in `prod`.

This task is not a coding task. It is a **handover task**: produce the documentation, tooling, and rehearsal that turns "the platform can support multi-country curriculum" from a claim into a demonstrated fact.

**Your task:** Write the curriculum-team runbooks, prepare the authoring workspace, and execute the first country import — from blank database to `framework.status = 'active'` in staging — as a rehearsal that the curriculum lead then repeats in production. Document every friction point found. Fix any friction that requires code. **If a code change is required to complete this task, the abstraction has failed; document it as a finding and fix the root cause before proceeding.**

**Read first, in this order:**

1. `docs/00-product-plan.md` **§1** — the three-layer model, in full
2. `docs/00-product-plan.md` **§2** — schema, especially the country layer (§2.9–§2.13)
3. `docs/00-product-plan.md` **§3** — the four pipelines and their framework-aware modes
4. `docs/00-product-plan.md` **§6** — governance, especially the no-bulk-approve rule and the 80% coverage gate
5. `docs/00-product-plan.md` **§11** — Task 7's framework layer reference
6. `docs/02-curriculum-framework-spec.md` — the full framework spec
7. `docs/02-curriculum-framework-spec.md` **§6** — the ten-stage import pipeline
8. `docs/02-curriculum-framework-spec.md` **§9** — governance
9. `docs/05-assessment-item-spec.md` **§8** — bank composition targets
10. `docs/09-authoring-rules.md` **if it exists** — authoring rules (if not yet written, this task includes a first draft)

**Deliverables, in order:**

### 16.1 Curriculum team roles and scopes

Formalise the roles that exist in the system (some already exist as RBAC scopes from Tasks 7, 9, and 13; this task publishes them):

| Role | Owns | Cannot |
|---|---|---|
| Curriculum Lead | Skill graph authoring, framework import, objective mapping, coverage decisions, activation | Author items without review; bypass the no-bulk-approve rule |
| Reviewer | Review nodes, content, items, localizations, mapping proposals | Activate a framework; change the skill graph |
| Localizer | Localization briefs, overrides for a specific framework | Touch canonical content or base items |
| Authoring Assistant | Author hand-written content outside the AI pipeline | Approve their own work |
| Content Admin | Operational tasks: jobs, retries, cost reports | Approve anything |

Every role is documented with its RBAC scope. No role has "admin" as a catch-all.

### 16.2 Onboarding pack for the curriculum team

`docs/curriculum-team/`:

- `00-start-here.md` — what the platform is, what it is not, and the reading order (links to docs 02, 03, 05).
- `01-roles-and-scopes.md` — the table above.
- `02-skill-graph-authoring.md` — how to author a node: the atomicity test, the naming convention, the misconception requirement, the atomicity checklist.
- `03-framework-import.md` — the ten-stage pipeline as a step-by-step operational runbook with screenshots of the Content Studio.
- `04-objective-mapping.md` — how to map an objective to nodes, how to handle ambiguous objectives, why bulk approve is prohibited, what to do when an objective has no good node.
- `05-content-review.md` — how to review AI-generated content against the quality panel, when to reject, how to write a rejection reason that improves the next generation.
- `06-item-review.md` — how to review an item, distractor tagging, when a distractor's misconception is wrong, when to retire an item.
- `07-localization.md` — how to build a localization brief, how to review a localization override, why math-invariance matters.
- `08-coverage-and-activation.md` — how coverage is computed, what the 80% gate means, what to do when coverage stalls.
- `09-governance.md` — the change-approval matrix, with a note that some changes require sign-off from more than one role.
- `10-faq.md` — the questions that come up in practice, with answers that link to the specs.

Every document is written for a **non-engineer** — no code, no schema, no SQL. The Content Studio is the only interface the curriculum team uses.

### 16.3 The first country import — rehearsal

Execute, on `staging`, a full end-to-end import of one country's framework. This is not a hypothetical — it is the real syllabus, real objectives, real review.

**Prepare:** pull the official syllabus PDF for the target framework. If a public syllabus is not available, use a genuine internal draft and record its provenance.

**Execute, in order, following the ten-stage pipeline from doc 02 §6:**

1. Create the country row (if not already present).
2. Create the framework row in `draft`.
3. Add the grade bands and their ordinals.
4. Import the syllabus:
   - Upload the PDF.
   - Run extraction.
   - Correct every objective (this is not a spot check — every objective is read).
   - Record the time spent.
5. Propose mappings:
   - Run the mapper.
   - Review every proposal — accept, replace, or mark unmapped.
   - Record every objective that required human replacement, with the reason.
6. Author missing nodes:
   - Run Pipeline A1 for the residuals.
   - Review and approve each node.
   - If any node fails the atomicity test, note the pattern — this is a signal the extractor or the atomicity heuristic may need revision.
7. Generate content:
   - Run Pipeline A2 for every newly authored node.
   - Review and approve.
8. Generate items:
   - Run Pipeline B.
   - Review every item.
   - Record the rejection rate — if > 30%, the item prompt needs revision.
9. Localize:
   - Write the localization brief.
   - Run Pipeline D over the framework's items and content.
   - Review and approve.
10. Compute coverage:
    - Run the coverage service.
    - If < 80%, generate the residuals and iterate.
    - Activate only when ≥ 80%.

**Record, at each stage:**

- Wall-clock time spent.
- Where the pipeline produced unusable output.
- Where the Content Studio UI was confusing.
- Where the process required a workaround.
- Any place the spec and reality disagreed.

### 16.4 The findings document

`docs/curriculum-team/first-import-findings.md`:

- Every friction point, in the order encountered.
- For each: was the root cause content, UX, pipeline, or spec?
- For content: no code change; document the pattern for the next import.
- For UX: a GitHub issue with a screenshot; the fix is scheduled.
- For pipeline: a prompt version bump or a validator change; documented and versioned.
- For spec: a written finding. If the spec was wrong, the spec is amended with a dated correction note (matching the style of the corrections already present in docs 02 and 04). **Do not silently change the spec.**

### 16.5 The second country's dry-run

Before declaring the abstraction sound, dry-run a **second** country's import using the process from the first, without touching code. The second country is deliberately chosen to be similar enough that overlap is meaningful (a shared administering body or a shared curriculum tradition) but different enough that the abstraction is tested (different grading scale, different grade-band naming, different localization context).

The dry-run does **not** complete the second country's import — it verifies only that the process transfers. Every step that required re-explanation is a documentation failure.

If any step required a code change, the abstraction has failed. **Document the failure, fix the root cause, and repeat the dry-run before proceeding.**

### 16.6 The curriculum team's workspace

Verify the Content Studio is fully usable by the curriculum team without engineer support:

- Every role's default landing page is correct.
- Every action the curriculum lead needs is reachable from the dashboard.
- The review queue shows the right things in the right order.
- The coverage dashboard shows gaps in a form that leads to the next action.
- The localization brief is editable from the UI, not from a database console.
- The generation job monitor is usable without reading logs.

If any of the above is not true, it is a UX finding and a fix is scheduled before this task is closed.

### 16.7 The curriculum team's training

Run a two-session training with the curriculum lead:

- **Session 1 — 90 min.** Walk through the skill graph, the framework import, and the mapping review. End with a live exercise: import a small supplementary syllabus fragment and map three objectives.
- **Session 2 — 60 min.** Walk through content review, item review, localization, and coverage. End with a live exercise: review and approve five items from the first country's import.

Record the sessions. Publish the recordings to `docs/curriculum-team/recordings.md` with timestamps for each topic.

### 16.8 Acceptance criteria for the abstraction

The task is complete only when all of the following are true:

- The first country's framework is `active` on `staging`, at ≥ 80% coverage, with every mapping human-confirmed.
- The second country's dry-run completed with **zero code changes** required.
- Every finding from the first import is documented, classified, and either resolved or scheduled.
- The curriculum team can operate the platform without engineer assistance for the entire import flow, verified by observation during training.
- No finding resulted in a schema change, a new endpoint, or a new admin UI screen.
- Any finding that *did* require a code change is treated as an abstraction failure and the root cause is fixed before the task is closed.

### 16.9 The report

`docs/curriculum-team/first-import-report.md`:

- Which country, which framework, which syllabus version.
- The coverage figure at activation.
- The total wall-clock hours spent by the curriculum team.
- The total AI cost of the import (from the cost service).
- The rejection rate at each review stage.
- The dry-run result for the second country.
- The list of findings, with links to their resolutions.
- A one-paragraph verdict on whether the abstraction held.

**Definition of done:**

- The curriculum team onboarding pack is published.
- The first country's framework is active on staging.
- The second country's dry-run completed with zero code changes.
- The findings document exists, with every finding classified and every code-required finding resolved.
- Training was delivered and recorded.
- The curriculum team can operate the platform without engineer assistance.
- The abstraction verdict is written down and honest. If it failed, that is documented, not papered over.

**Report at the end:** which sections you read, the coverage figure at activation, the number of mappings corrected by the human reviewer, the second country's dry-run result, and the abstraction verdict.

**Do not proceed to Task 17 until the abstraction verdict is "held" or until any failure has been resolved and a re-run has been performed.**

---

## TASK 17 — RCT Pre-Registration and Instrumentation

---

**Context:** Tasks 1–16 complete and confirmed. The first country's framework is live. The platform is producing learning outcomes. The Phase 3 RCT from doc 03 §14 has been deferred until now because it required a live platform, real learners, and enough data to answer its questions.

This task **pre-registers** the RCT and builds the instrumentation that makes its five questions answerable. It does not run the trial — it makes the trial runnable. Analyzing the questions post hoc against a moving product yields nothing publishable and nothing trustworthy; this task is the discipline that makes the eventual analysis credible.

**Your task:** Pre-register the five questions from doc 03 §14, build the instrumentation that captures every variable each question requires, and stand up the shadow-mode infrastructure that lets the platform collect data without changing learner experience.

**Read first, in this order:**

1. `docs/03-learning-science-spec.md` **§1–§12** — every commitment the RCT exists to test
2. `docs/03-learning-science-spec.md` **§14** — the five open questions
3. `docs/03-learning-science-spec.md` **§15** — bibliography (background)
4. `docs/04-learning-engine-spec.md` **§10** — BKT, which is Phase 3 and shadow-mode
5. `docs/04-learning-engine-spec.md` **§14** — telemetry the engine emits
6. `docs/10-engineering-standards.md` **§7** — staged rollout, which the RCT operates inside

**Deliverables, in order:**

### 17.1 Pre-registration document

`docs/rct/preregistration.md`:

A formal pre-registration, in the shape accepted by Open Science Framework or an equivalent registry. Contents:

- **Title:** the platform's internal working title for the trial.
- **Principal investigator:** the curriculum lead, with the engineering owner named.
- **Background:** a summary of the commitments the trial tests, each cited to the relevant doc 03 section.
- **The five questions**, each stated as a falsifiable hypothesis with a primary outcome and a minimum detectable effect:

  **H1 — The two-session mastery gate.** Learners under a two-session non-consecutive gate achieve higher 30-day retrieval retention than learners under a single-session gate, at a margin of ≥ 5 percentage points.
  - Primary outcome: 30-day retrieval retention, measured as the proportion of mastered nodes still correct on first review after ≥ 30 days.
  - Design: within-subject randomization at the node level, with a coin flip per (learner, node) determining which gate applies.
  - Analysis: mixed-effects logistic regression, learner and node as random effects.
  - Minimum detectable effect: 5 pp at 80% power, α = 0.05.
  - Sample size: computed and stated.

  **H2 — The 0.75–0.85 success band.** The desirable-difficulty band as specified yields higher 30-day retention than a higher band (0.85–0.92) in this population.
  - Primary outcome: same as H1.
  - Design: between-learner randomization, stratified by placement frontier.
  - Analysis: as H1.

  **H3 — Misconception-specific remediation.** Remediation that targets a named misconception outperforms generic re-explanation on subsequent-item success rate.
  - Primary outcome: success rate on the next 3 items on the same node after remediation.
  - Design: within-subject randomization at the remediation event level.
  - Analysis: paired comparison with cluster-robust standard errors.

  **H4 — The dose threshold.** The 12-hour threshold over 8 weeks produces detectable gains; below it, gains are not detectable.
  - Primary outcome: end-of-unit mastery rate as a function of accumulated dose.
  - Design: observational, with dose as the independent variable and covariate adjustment for baseline ability.
  - Analysis: dose–response curve fit, pre-registered functional form.

  **H5 — The parent WhatsApp nudge.** The parent nudge increases weekly dose relative to no nudge, and the effect size relative to teacher assignment is measured.
  - Primary outcome: weekly minutes.
  - Design: 3-arm between-learner randomization (no nudge, parent nudge, teacher assignment).
  - Analysis: intention-to-treat with per-protocol secondary.

- **Analysis plan:** the exact models, the exact primary outcomes, the exact transformations. No exploratory analyses in the primary results.
- **Stopping rules:** when the trial stops early (futility, harm, or clear benefit on the primary outcome).
- **Data sharing:** what will be published, what will be retained internally, and what will never leave the platform (learner PII, per the platform's privacy policy).
- **Ethics statement:** consent, withdrawal, and minor-specific considerations.

Every one of the five questions is registered with the same discipline. None are left vague.

### 17.2 Instrumentation

Every variable the pre-registration requires must be captured. The instrumentation is added as **passive telemetry** — it never changes learner experience.

**New event types added to `/engine/src/telemetry.ts` and to the backend analytics pipeline:**

- `mastery_gate_variant` — which gate the node was under (single-session or two-session), and whether the learner crossed it.
- `success_band_assignment` — the band the learner is in for the current trial window.
- `remediation_served` — remediation event, with `misconception_id`, `variant` (specific vs generic), and the outcome of the next 3 items.
- `dose_accumulated` — weekly minutes, with the exact timestamp window.
- `nudge_variant` — which arm the learner is in for H5, and whether the nudge was delivered, opened, and acted upon.

Every event carries: `learner_id` (hashed for storage per the privacy policy), `framework_id`, `node_id` (where relevant), `occurred_at`, and the arm assignment.

**Cohort assignment:**

- Assignment happens once per (learner, node) or per (learner, window), depending on the hypothesis.
- Assignment is persisted in a `rct_assignments` table:

```sql
CREATE TABLE rct_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id        TEXT NOT NULL,             -- 'h1_mastery_gate' | 'h2_success_band' | ...
  learner_id      UUID REFERENCES users(id),
  node_id         TEXT REFERENCES skill_nodes(node_id),
  arm             TEXT NOT NULL,             -- trial-specific
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trial_id, learner_id, node_id)
);
```

**Consent:**

- Every learner in the trial has consented via the standard onboarding flow.
- Consent can be withdrawn at any time; withdrawal excludes the learner's data from the primary analysis and from the published dataset.
- The consent wording states what the learner is agreeing to at an appropriate reading level for the youngest enrolled grade.

**Blinding:**

- The learner is never told which arm they are in.
- The curriculum lead is never told which learners are in which arm during the trial.
- Analysis is performed by the engineering owner, not by the curriculum lead, to avoid accidental bias.

### 17.3 Shadow mode

Three of the five hypotheses require comparing behaviour the platform does not currently run in production. These are prepared in **shadow mode**:

- **H1 (single-session gate).** A shadow evaluation runs the alternative gate in the background for every mastery event, and records what *would have happened* without changing the learner's path. The comparison group in the primary analysis uses this shadow data; the treatment group uses the live gate.

- **H2 (higher success band).** A shadow selection runs the higher band in parallel, records what item *would have been served*, and the analysis compares the predicted success rate under the two bands against the actual retention.

- **H3 (generic remediation).** The generic-remediation variant is generated for every remediation event, and served only when the trial is active in a cohort that has consented.

Shadow mode has no learner-visible effect. It runs server-side, produces telemetry only, and is disabled by a flag on a per-trial basis.

### 17.4 The RCT dashboard

An admin-only view: `(admin)/studio/rct`.

- Trial status per hypothesis: enrolled, arm counts, days elapsed, sample size progress toward pre-registered target.
- Per-arm summary statistics (no primary analyses — those are pre-registered and analysed at the end).
- A prominent banner: **"Primary analyses are pre-registered and not to be run before trial close."**
- A secondary view, restricted to the engineering owner, allows running the pre-registered analyses on synthetic data for pipeline verification only.

### 17.5 The trial-close process

`docs/rct/trial-close.md`:

- The exact sequence: freeze the data, export, run the pre-registered analyses, write the results.
- The template for the results document, with slots for each hypothesis.
- The commitment: results are published whether they confirm or contradict the pre-registered hypotheses.
- The mechanism for reporting unexpected findings — as secondary analyses, clearly labelled as such, in a separate section, after the primary results.

### 17.6 Tests

- `test_rct_assignment.py` — assignment is deterministic, unique per (trial, learner, node), and reproducible.
- `test_rct_shadow_mode.py` — shadow evaluation produces telemetry without affecting the learner's served item or mastery state.
- `test_rct_consent.py` — withdrawal excludes the learner from the primary analysis dataset.
- `test_rct_dashboard_restriction.py` — the primary analyses are not visible to the curriculum lead; only the engineering owner can access the synthetic-data analysis view.
- `test_rct_telemetry_completeness.py` — every variable the pre-registration requires is present in the telemetry for a sample of learners.

### 17.7 CI gates

- **No primary analysis in the dashboard** — a test that asserts the analyses endpoints are not reachable by non-engineering roles.
- **Shadow mode has no learner-visible effect** — an integration test that asserts served items and mastery states are identical with and without shadow mode enabled.
- **Every RCT event has a consent check** — a lint rule that the event producers call the consent service before emitting.
- **Assignment determinism** — running the assignment twice with the same seed produces identical arms.
- **PII in RCT data is hashed** — a lint rule that `learner_id` in the RCT tables is a hash, not the raw UUID.

### 17.8 The report

`docs/rct/preregistration-report.md`:

- The pre-registration as submitted to the registry, with a link to the registry entry.
- The date the registry entry went live.
- The date the trial opens for enrollment.
- The expected trial-close date.
- The names of the investigator, the engineering owner, and the independent reviewer (a person not on the curriculum team).
- Confirmation that every variable required by the pre-registration is instrumented and reachable.

**Definition of done:**

- The pre-registration is written and registered.
- Every hypothesis has a stated primary outcome, design, analysis plan, and minimum detectable effect.
- Instrumentation is complete and tested.
- Shadow mode is implemented and asserted to have no learner-visible effect.
- The RCT dashboard exists, restricted correctly, and the primary analyses are gated to the engineering owner.
- Consent flows are complete, including withdrawal.
- The trial-close process is documented.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the registry where the pre-registration was filed, the primary outcome for each hypothesis in one sentence each, the sample size computed for H1, and any place the spec was ambiguous.

---

## Task Chaining Notes

Save both tasks to `docs/tasks/`:

```
docs/tasks/
├── task-16-curriculum-onboarding.md
└── task-17-rct-preregistration.md
```

Hand them one at a time. After Task 16, do not proceed to Task 17 until the abstraction verdict is **"held"**. If the abstraction failed — if any part of the second country's dry-run required a code change — fix the root cause first, re-run the dry-run, and reissue the verdict. Task 17 builds on top of a platform whose abstraction has been demonstrated, not assumed.

After Task 17, the platform enters a phase that has no further hand-off tasks in this series:

- **Content program** — country-by-country imports, ongoing, using the runbook from Task 16.
- **Trial execution** — enrollment, monitoring, and eventually trial close and analysis.
- **Iteration** — changes to the engine, content, or product, each following the review-and-simulation discipline from Task 10.

At this point, the platform is a live product. Every subsequent change should be able to answer: does it preserve the four non-negotiable commitments from the master prompt? If yes, proceed. If no, do not merge.

---

You now have the complete task sequence — Tasks 1 through 17 — covering:

- The hand-verified engine (1–6)
- The framework layer (7)
- Content pipelines (8)
- Content Studio (9)
- Web and mobile clients (10, 11)
- Sync and offline (12)
- API surface (13)
- Notifications (14)
- Infrastructure (15)
- Curriculum team and first country (16)
- RCT pre-registration (17)

Each is a self-contained hand-off. Read the specs, write the tests first (for the engine), deliver the artifacts, verify the definition of done. The sequencing is deliberate — skipping a step in the engine surfaces later as a progression bug, and skipping a step in the framework layer surfaces as a country that cannot be added without a rewrite.

If the abstraction holds through Task 16, the platform is what it was designed to be: **a canonical curriculum engine with a deterministic learning kernel, into which adding a country is a content project and never an engineering one.**