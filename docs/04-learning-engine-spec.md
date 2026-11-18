# 04 — Learning Engine Specification

**Owner:** Engineering · **Change control:** strict — no change without updated test vectors
**Version:** v2 (2026-11-18) — changes marked **(v2)**; see Change Log and Decisions Needed at the end. Items marked *proposed* are not yet implemented and each needs a vector in the same commit (§12 rule).

> This is the algorithmic contract for the module that decides what every learner sees next. It runs **identically on client and server**. A silent bug here is invisible to users and corrupts every learner's progression permanently. This is the one part of the codebase to hand-verify rather than trust to generation.

---

## 1. Scope & Non-Goals

### In scope
Placement, ability/difficulty estimation, item selection, mastery evaluation, review scheduling, exam-readiness forecasting (specified in §15, v2 — it had no section before).

### Explicitly NOT in scope
- Rendering, UI, animation
- Network, sync, persistence
- Any model call whatsoever
- Content, copy, localization

### Hard requirements

| ID | Requirement |
|---|---|
| E-1 | **Pure.** No I/O, no clock access, no network, no randomness except via an injected seeded PRNG. `now` is a parameter. |
| E-2 | **Deterministic.** Identical inputs MUST yield byte-identical outputs on every platform. |
| E-3 | **Client/server parity.** One implementation, or two with a shared conformance test suite that both MUST pass. |
| E-4 | **Offline-capable.** Every decision computable from local state alone. |
| E-5 | **Total.** No exceptions thrown for any input in the valid domain. Invalid input returns a typed error. |
| E-6 | **Fast.** `select_next_item` P99 < 15ms on a 2GB Android device. |

---

## 2. Core Data Contracts

### 2.1 Input: Attempt event (append-only, immutable)

```
Attempt {
  attempt_id      : uuid
  learner_id      : uuid
  node_id         : string
  item_id         : string
  difficulty_tier : 1 | 2 | 3
  correct         : bool
  partial_credit  : float          # 0.0-1.0, for multi-part items
  selected_option : string?         # for MCQ; maps to a distractor
  misconception_id: string?         # resolved from selected_option
  latency_ms      : int
  hints_used      : 0 | 1 | 2 | 3
  session_id      : uuid
  occurred_at     : timestamp       # client clock, UTC
  is_review       : bool            # served from the review queue
  is_placement    : bool
  is_exam         : bool
}
```

**`hints_used > 0` MUST NOT count toward mastery.** It counts for Elo as a half-credit result (§5.2, score 0.5) and for the review scheduler. This prevents hint-farming to mastery.

**(v2) Reconciliation:** v1 also said hinted attempts count for Elo "with reduced K". §5.2's pseudocode applies only the 0.5 score, with no K change. §5.2 is the rule; the phrase is removed. Confirm against `elo.ts`.

**(v2) `max_tier_correct` MUST be updated only by a qualifying attempt that is correct with `hints_used == 0`** (qualifying = `is_placement = false AND is_exam = false`). v1 did not say, and a hinted Tier-3 correct that raised it would satisfy §4's Tier clause through a hint, which I-10 forbids (the same class of bug corrected on 2026-08-09 for the spacing gate). *Open:* it is not windowed, so a Tier-3 correct from long ago still counts. Decide whether it should be. New vector: `mastery_hinted_tier3.json`.

### 2.2 Persistent state per (learner, node)

```
NodeState {
  learner_id        : uuid
  node_id           : string
  status            : locked | available | in_progress | mastered | needs_review | relearning
  ability_elo       : int           # learner ability on THIS node
  attempts_total    : int
  recent_window     : Attempt[5]    # last 5 qualifying attempts — §4 defines qualifying
  distinct_days     : date[]        # days with ≥1 correct attempt, capped at 10 — see the note below
  max_tier_correct  : 0 | 1 | 2 | 3   # updated only by qualifying, unhinted correct attempts (§2.1, v2)
  correct_total     : int           # (v2, proposed) qualifying correct attempts ever; gates interleaving, §6 step 1
  mastered_at       : timestamp?
  stability         : float         # FSRS memory stability, days
  difficulty_fsrs   : float         # FSRS difficulty, 1-10
  due_at            : timestamp?
  lapses            : int
}
```

**§2.2's field comments are descriptive; §4's rules are normative. Where they disagree, §4 wins (2026-08-09).** This block exists to name the shape of persisted state. The comments beside each field are a reader's gloss, and three of them have now been found stale — twice in the same field, once in another — while §4's pseudocode was correct each time. Treat a comment here as a pointer to the section that owns the rule, never as the rule. Implementations and reviewers read §4, §5 and §8; a change to a rule updates the owning section, and the comment here is expected to lag.

The three specific corrections, recorded rather than silently edited away so the pattern stays visible:

- **`recent_window`** was described as "last 5 non-hinted, non-review attempts." Wrong on both counts. §4's *Qualifying attempt* clause is `is_placement = false AND is_exam = false` — nothing about reviews, which do enter the window — and it says explicitly that "hinted attempts enter the window but count as incorrect for the `correct` tally." A window that excluded hinted attempts would make the 4-of-5 tally trivially easier to satisfy, which is the opposite of what §4 does with them.
- **`distinct_days`** is **descriptive state, not an input to the mastery predicate.** §4 derives its days from `recent_window` filtered by `a.correct && a.hints_used == 0` — so a hinted correct appears in `distinct_days` but contributes nothing to the spacing gate. The two are deliberately not the same set, and code that reaches for `distinct_days` to answer "has this learner practised on enough separate days to master" is asking the wrong field. The gate's days live in the window.
- **`misconception_hits` is REMOVED (2026-08-16), not just re-described.** It was declared here from the start of this spec but no implementation ever wrote to it — `apply_attempt` (§5) has no step that increments it, confirmed absent from the reference `mastery.ts` entirely. §6 step 2's `dominant_misconception` needs a time-ordered, fixed-size window to honour `window=5`; `recent_window` is exactly that field and was already being maintained for the mastery predicate, so `dominant_misconception` now derives its answer from `recent_window` directly (§6's pseudocode below is corrected to match) rather than from a second, parallel tally that nothing kept in sync. A field declared in a contract and read by nothing is worse than an absent field — it looks implemented. Per-learner remediation dedup state (`remediation_shown_recently`) is not part of `NodeState` either, for the same reason `due_at`/`mastered_at`-adjacent bookkeeping the engine itself never reads doesn't belong on its pure type — see doc 07 §5/§8 for where it's actually persisted.

### 2.3 Engine outputs

```
Decision {
  action     : serve_item | serve_lesson | serve_remediation
             | node_mastered | queue_empty | escalate_to_tutor
             | offer_tutor                      # (v2, proposed) optional help, §9
  node_id    : string?
  item_id    : string?
  misconception_id : string?    # when action = serve_remediation | escalate_to_tutor | offer_tutor
  reason     : enum             # for telemetry & debugging
}
```

Every `Decision` MUST carry a `reason`. Undebuggable adaptive systems are unmaintainable.

### 2.4 Engine context — non-state inputs (v2)

The engine is pure (E-1), so everything it needs beyond persisted state is a parameter:

```
EngineContext {
  now             : timestamp
  rng             : seeded PRNG
  days_until_exam : int?        # resolved by the CALLER from the learner's framework pin and the
                                # academic calendar (doc 02 §4); None = no exam known
  frameworkId     : string?     # telemetry tagging only; behaviour MUST NOT depend on it
}
```

v1 used `days_until_exam(learner)` inside §8.3 with no declared input. A `None` value is normal (no exam window, a US school calendar with no exam board, a pin migration in progress) and yields compression 1.0. New vector: `exam_proximity_none.json`.

---

## 3. Node State Machine

```
                    prerequisites met
        locked ──────────────────────────► available
                                              │ first attempt
                                              ▼
                                        in_progress
                                              │ mastery predicate true
                                              ▼
                                          mastered
                                              │ due_at reached
                                              ▼
                                        needs_review
                                     ┌────────┴────────┐
                     review correct  │                 │ review incorrect
                                     ▼                 ▼
                                 mastered          relearning
                                                       │ 2 consecutive correct
                                                       └──► mastered
```

### Transition rules

| From | To | Condition |
|---|---|---|
| `locked` | `available` | ALL hard prerequisites in `mastered`, `needs_review`, or `relearning` |
| `available` | `in_progress` | first non-placement attempt recorded |
| `in_progress` | `mastered` | mastery predicate (§4) returns true |
| `mastered` | `needs_review` | `now >= due_at` |
| `needs_review` | `mastered` | review attempt correct, hints_used = 0 |
| `needs_review` | `relearning` | review attempt incorrect → `lapses += 1` |
| `relearning` | `mastered` | 2 consecutive correct, hints_used = 0, same or different session |
| ANY | `available` | re-diagnosis explicitly demotes (placement override only) |

**Invariant I-1:** a node MUST NOT be `available` unless all hard prerequisites are at `mastered` or beyond. Enforced on every state read, not just on write.

**Invariant I-2:** `mastered_at` is set once and never cleared. A lapse changes `status`, not history.

**Implementation note (found wiring the reference implementation against `fsrs_lapse_recovery`, 2026-07):** `mastered → needs_review` is time-triggered (`now >= due_at`), not attempt-triggered — nothing about a learner's activity causes it, so a correct implementation has no natural event to hang an eager write on. In practice this means a review attempt can legitimately arrive while the persisted `status` still reads `mastered` (the transition was true in principle but never separately written). Treat that case identically to `needs_review` receiving a review attempt — the same correct/incorrect branching applies — rather than requiring a separate due-date sweep to run first and write `needs_review` before any review attempt can be processed.

---

## 4. Mastery Predicate

```
fn is_mastered(s: NodeState) -> bool {
    let w = s.recent_window          // last 5 qualifying attempts
    if w.len() < 4 { return false }

    let correct = w.filter(|a| a.correct && a.hints_used == 0).count()
    if correct < 4 { return false }

    if s.max_tier_correct < 3 { return false }

    let days = distinct_dates(w.filter(|a| a.correct && a.hints_used == 0))
    if days.len() < 2 { return false }
    let span_days = (days.max() - days.min()).days
    if span_days < 2 { return false }   // non-consecutive: Mon+Tue (span=1) fails; Mon+Wed (span=2) passes

    true
}
```

**Qualifying attempt:** `is_placement = false` AND `is_exam = false`. Hinted attempts enter the window but count as incorrect for the `correct` tally.

**Corrected 2026-07 — hand-verification catch:** the original condition (`max_gap_days(days) < 1`) never actually rejected consecutive days — Monday-to-Tuesday has a 1-day gap, and `1 < 1` is false, so it silently passed. That's the exact case §12's `mastery_boundary_consecutive` vector says must fail. The rule now checks the full span between the earliest and latest correct day in the window and requires it to be at least 2 calendar days — i.e., at least one full rest day between the two practice days, not merely "not the same day." This is why every mastery-gate golden vector (§12) is worth running before trusting this predicate to an agent's generation: the bug was in the pseudocode, not in any implementation of it, and would have passed a naive "does it compile and handle the same-day case" review.

**Corrected 2026-08-09 — found by the 0.18 simulation harness, not by hand:** the `days` filter above read `w.filter(|a| a.correct)`, with no `hints_used` condition, while the correctness tally three lines earlier reads `a.correct && a.hints_used == 0`. That asymmetry meant a hinted correct could not count toward the 4-of-5 tally but *could* supply a distinct day — so the spacing gate was satisfiable by a hinted attempt, which I-10 forbids outright. The shape it permitted, found in 309 of 71,525 simulated masteries (0.43%): **four clean corrects inside a single session, then one hinted correct days later ⇒ mastered, on the strength of exactly one unhinted correct day.** That is precisely the "demonstrated performance, not learning" case doc 03 §3 says this gate exists to reject, and doc 03 §3 names it the single commitment most likely to be attacked and least permissible to relax. §4 was wrong and I-10 was right; the filter is now applied in both places. Note this was invisible to `mastery_same_day_grind` (§12), which passes under the old rule only because it has no later attempt at all — the new `mastery_hinted_day_bridge` vector covers the case.

**Rationale (see 03 §3, §5):** the two-session, non-consecutive-day requirement is the spacing effect encoded directly into the gate. A learner who grinds one node for 20 minutes has demonstrated performance, not learning. This single rule is the largest single contributor to 30-day retention and MUST NOT be relaxed for engagement reasons.

**(v2) Consequence of reading only the last 5 attempts.** The spacing gate needs correct, unhinted attempts from two days at least 2 calendar days apart, *both still inside the 5-attempt window*. After the first day, the second day can only satisfy the predicate during the first few attempts of the later session, while day-1 attempts have not yet rolled out of the window. A miss early in that session moves the window on, and the learner needs another spaced day. This is stricter than "two spaced days" and is part of the engagement cost doc 03 §3 accepts. *Open:* read time-to-mastery and the share of masteries needing a second spaced cycle from the 0.18 simulation (71,525 masteries) before the pilot, and decide whether the window should be longer for the spacing clause only.

**(v2, proposed) Spacing-pending.** Nothing said what a learner does once the count and tier clauses hold but only spacing is unmet. Add a pure helper `mastery_blockers(s) -> {count, tier, spacing}` (the clauses of §4 not yet satisfied). When the only blocker is `spacing`, selection SHOULD move the learner to another available node rather than serve more items from this one, and the UI says "Come back to this on <day> to lock it in", never "not yet". New vector: `mastery_blockers.json`.

**Invariant I-3:** mastery is monotonic within a session. Once true, additional attempts in the same session cannot revoke it.

---

## 5. Elo Rating System (v1 algorithm)

Chosen over IRT/BKT for the pilot because it self-calibrates from the first response, is robust at low data volume, requires no fitting step, and is trivially debuggable.

### 5.1 State

- Each **node** has `difficulty_elo` (doc 02 §2, doc 07 §3), derived from its position in the prerequisite graph — see *Node difficulty* below.
- Each **item** has `difficulty_elo`, initialised **relative to its node**: `node.difficulty_elo + tier_offset(tier)`, with T1 = −285, T2 = −115, T3 = +20.
- Each **(learner, node)** has `ability_elo`, initialised from placement, else from the mean ability of mastered prerequisites, else 1200.

**Changed 2026-08-09 — the fix for 0.18's cold-start finding.** This section previously seeded item difficulty from authored tier alone: T1 = 1200, T2 = 1500, T3 = 1800, everywhere, for every node in the curriculum. The consequence is arithmetic, not judgement. Inverting §5.2 at the edges of §6.1's band, an in-band serve needs the item **191–301 Elo below ability**, so a bank spanning 1200–1800 can only serve abilities in **[1391, 2101]** — a 710-point window fixed in absolute Elo space regardless of how much curriculum the bank covers. Learners outside it are out of band at one tail or the other by construction, and no selection policy can rescue them because the pool contains nothing at the required difficulty: in a 300-learner simulated cohort, **10.3% never entered the band within 12 weeks** (all of them below it) and **61 of 300 spent time above 0.85**. The root cause was an asymmetry inside this very section — `ability_elo` was specified to seed from graph position ("the mean ability of mastered prerequisites") while `difficulty_elo` was not, so a Pre-K counting item and a JSS3 algebra item both started at 1200.

**Tier offsets, derived from doc 05 §2 rather than asserted.** doc 05 §2 gives each tier a target p-value; §5.2 gives the relationship between an Elo gap and a success probability. Inverting it for a learner sitting exactly at the node's difficulty — the learner who has just met its prerequisites:

```
p      = 1 / (1 + 10^(offset / 400))
offset = 400 * log10((1 - p) / p)
```

| Tier | doc 05 §2 target p | Offset range | Midpoint | Adopted |
|---|---|---|---|---|
| 1 — Recognition | 0.75–0.90 | −190.85 … −381.70 | −286.27 | **−285** |
| 2 — Fluency | 0.55–0.75 | −34.86 … −190.85 | −112.85 | **−115** |
| 3 — Transfer | 0.35–0.60 | +107.54 … −70.44 | +18.55 | **+20** |

The midpoint is taken in **Elo space, not in p space**. The quantity being fixed is an Elo offset, so the band should be symmetric in the units it is expressed in; midpointing the probabilities and converting gives a materially different number for T1 (−269 vs −286) because the logistic is not linear. Implementations MUST bake these as constants rather than computing them — `log10` is transcendental, and §5.2's 2026-07-29 note establishes that V8 and Hermes may differ in its last bits, so a seed computed at runtime is a fresh E-2/E-3 hazard for no benefit.

**Cross-check against §6.1, which was not an input to the derivation.** §6.1 targets `ability − 200`. For a just-ready learner, T1 (−285) and T2 (−115) sit at exactly **85 Elo either side** of that target, so §6's σ=150 Gaussian weights them equally (0.85 each) while T3 (+20) is 1.47σ out at 0.34. A just-ready learner therefore draws a T1/T2 mix with T3 rare, and as ability rises above the node the target walks toward T3 — which §4 requires for mastery. Two sections derived independently agreeing to within 85 Elo is the best available evidence that this reading of doc 05 §2 is the intended one.

**Node difficulty.** `skill_nodes.difficulty_elo` has been defined in doc 02 §2 and columned in doc 07 §3 since Phase 0, and nothing has ever written it — every node in the database currently claims an identical 1200. It is derived by a topological pass over `node_prerequisites`:

```
level(n)          = 0 if n has no prerequisites, else 1 + max(level(p) for p in prerequisites(n))
difficulty_elo(n) = 1200 + 25 * level(n)
```

- **Base 1200** deliberately equals this section's cold-start ability fallback. A learner with no placement and no mastered prerequisites starts at 1200; a node with no prerequisites is the node such a learner meets first. Setting them equal is what makes "just met the prerequisites" and "cold start" the same point on the scale — the assumption every tier offset above is derived under.
- **`max`, not sum and not count.** Level is the length of the longest chain that must be climbed to reach the node. Summing would make a node with three shallow prerequisites look harder than one with a single deep one; counting would make difficulty depend on how finely an author chose to split the prerequisites rather than on the curriculum.
- **Soft prerequisites count.** doc 02 §2.2 gates availability on hard prerequisites only, so hard-only would be defensible — but the same section gives soft edges to "ordering recommendations and placement propagation," and level *is* an ordering. This is a judgement call and the first thing to revisit if seeded difficulties look wrong against real data.
- A prerequisite **cycle is an error, not a case to level around**. doc 02 §2.2 requires acyclicity and I-7 asserts it at client load, so a cycle reaching this pass has already escaped two gates; emitting a plausible number for the nodes outside it would hide a content bug.

**The 25 Elo per level is provisional, in the same sense as §8.1's FSRS weights** — a plausible starting constant to be refit from real response data once volume allows (>= 500k reviews), not a calibrated measurement. It is currently the value the simulation harness assumes for its own depth penalty, which makes it internally consistent and externally unvalidated. What refits it is observed p-values by node depth once the bank carries response volume. Until then a node's seeded difficulty is an **ordering hint that Elo corrects within roughly 50 responses** (§5.3's uncalibrated K of 32), not a measurement, and it must not be reported as one.

**The ability clause is now implemented, and was not before (2026-08-09).** "Else from the mean ability of mastered prerequisites" had existed here since Phase 0 with no implementation anywhere — not in `/engine`, which contained no reference to prerequisites at all, and not in the simulation harness, which pinned every fresh node at 1200. It was survivable only while item difficulty was *also* position-blind: two constants wrong in the same direction cancel. Once difficulty tracks graph position, an ability seed that does not is a growing error, so the two clauses are a matched pair and neither is optional. The mean is over prerequisites the learner has actually **secured** — a prerequisite with no evidence behind it has an `ability_elo` that is itself a seed, and averaging seeds propagates the fallback rather than measuring anything.

**Corrected 2026-08-14 — "mastered" here means §11 I-1's secured set, not the literal status string.** The first implementation filtered to `status === 'mastered'` and shipped in 0.20, three days before I-1 itself existed as code (0.21). Once I-1 was built, this clause was a strict subset of it: I-1's satisfying set is `mastered | needs_review | relearning`, all three reachable only by having been mastered first, while this clause admitted only the first. The two clauses describe the **same relationship** — prerequisites the learner has secured — and having availability gating and ability-seeding disagree about what "secured" means is the kind of divergence that surfaces nowhere in a build and only as a learner mysteriously getting harder content after a lapse: a node's hard prerequisite lapses into `relearning`, availability correctly keeps the node open, but the ability seed for the *next* fresh node silently drops that prerequisite from the mean, and if enough of a learner's prerequisites are mid-relapse the seed falls through to 1200 — the cold-start position 0.20 measured as producing a 73% too-hard serve rate for the bottom quartile.

The literal reading is not the more defensible one on its own terms, either. The stated reason for excluding "unmastered" prerequisites is that their `ability_elo` is itself a seed rather than a measurement — but `ability_elo` is **only ever updated by a non-review attempt** (§5.2's update runs on the acquisition path; a review attempt against a node already in `mastered`, `needs_review` or `relearning` is handled entirely by §8's FSRS scheduler, which manages `stability`/`difficulty_fsrs`/`due_at` and never touches `ability_elo`). So a node's ability value is frozen at the moment it first reaches genuine mastery and is **identically evidenced** whether its current status is `mastered`, `needs_review`, or `relearning` — the literal filter excludes two of three states carrying the same quality of evidence as the one it keeps, for no reason connected to its own justification.

(One case is unaffected either way and is flagged rather than fixed here: `mastered_at = null` provisional mastery, from §7.1's `propagate_mastery_down`, is not implemented in `/engine` and so cannot be produced by anything importing this module. When it is built, a provisionally-mastered prerequisite's `ability_elo` genuinely is closer to a seed than a measurement, which is a real question for that implementation to answer — this correction does not resolve it, and does not need to.)

### 5.2 Update

```
expected = 1 / (1 + 10^((difficulty_elo - ability_elo) / 400))

score    = if correct && hints_used == 0 { 1.0 }
           else if correct && hints_used > 0 { 0.5 }
           else { 0.0 }

ability_elo    += K_learner * (score - expected)
difficulty_elo += K_item    * (expected - score)
```

**Added 2026-07-29 — found while implementing the determinism_cross_platform vector, not a hypothetical:** `10^x` is a transcendental function. Unlike `+ - * /`, IEEE-754 does not require bit-identical results for transcendental functions across implementations — JavaScript engines (V8 on the server sidecar, the browser engines on web, and the embedded runtime on mobile; Hermes if a React Native client is ever adopted) are permitted to differ in the last bit or two of `Math.pow`/exponentiation, because they may use different underlying libm implementations. This directly threatens E-2/E-3 (doc 04 intro) if left unhandled: two engines can run the identical update on identical input and produce `ability_elo` values that differ in the 12th decimal place, which is invisible in normal use but breaks a byte-for-byte state hash. **`ability_elo` and `difficulty_elo` MUST be rounded to a fixed precision (4 decimal places, matching the tolerance already used throughout §12's vectors) immediately after each update, before the value is persisted, compared, or hashed.** This isn't a test-harness-only concern — round in the actual engine update, not just when computing a conformance hash, or client and server states can silently drift apart over many attempts even though each individual update "looks" deterministic.

### 5.3 K-factors (uncertainty-decaying)

| Subject | Condition | K |
|---|---|---|
| Learner | attempts_total < 10 | 40 |
| Learner | 10 ≤ attempts_total < 30 | 24 |
| Learner | attempts_total ≥ 30 | 16 |
| Item | responses < 50 (uncalibrated) | 32 |
| Item | 50 ≤ responses < 200 | 16 |
| Item | responses ≥ 200 (calibrated) | 8 |

### 5.4 Guards

- Clamp both ratings to [400, 2800].
- Review attempts do **not** update `ability_elo`; they are handled by §8 and measure retention, not acquisition. **(v2 reconciliation)** v1 said review attempts update ability at half K, which contradicts §5.1's 2026-08-14 correction (ability is "only ever updated by a non-review attempt", frozen at first mastery). §5.1's text describes the reference implementation, so this line was aligned to it. *If the implementation does apply half-K review updates, amend §5.1's reasoning instead.* New vector: `elo_review_no_ability_update.json`.
- Exam-mode attempts update ability at **half K** and never update item difficulty.
- Latency < 1500ms on a Tier-3 item flags `suspicious_fast`; excluded from item difficulty updates (guessing/answer-sharing).

---

## 6. Item Selection

```
fn select_next_item(learner, node, now, rng) -> Decision {

    // 1. Interleaving: every 4th item comes from the review queue, but only once the node
    //    has 2 correct attempts (doc 03 §5: blocked practice for first exposure). (v2, proposed)
    if node.correct_total >= 2 && items_since_review >= 3 && review_queue_nonempty(learner, now) {
        return serve_review_item(learner, now, rng)
    }

    // 2. Remediation override: a misconception hit twice in the last 5
    // qualifying attempts. Reads recent_window, not a separate per-misconception
    // tally (see §2.2's 2026-08-16 erratum on misconception_hits' removal) --
    // window=5 needs recent_window's time ordering, which is the field the
    // mastery predicate already maintains.
    if let Some(m) = dominant_misconception(node.recent_window, window=5, threshold=2) {
        if !remediation_shown_recently(learner, m, within_days=3) {
            return Decision::serve_remediation(node, m)
        }
    }

    // 3. Target the desirable-difficulty band
    let target_elo = node.ability_elo - 200      // ≈ 0.76 success probability — item EASIER than ability
    let pool = items(node)
        .filter(|i| !seen_within(learner, i, days=21))
        .filter(|i| tier_is_reachable(i, node))

    if pool.is_empty() { return relax_and_retry(node, learner) }

    // 4. Weighted sample, not argmin — prevents lockstep sequences across learners
    let weights = pool.map(|i| gaussian(i.difficulty_elo, mean=target_elo, sigma=150))
    let chosen  = weighted_sample(pool, weights, rng)

    Decision::serve_item(node, chosen)
}
```

### 6.1 Target success probability

`ability - 200` gives ≈ 0.76 expected success — the target item is *easier* than the learner's current ability by 200 Elo points, not harder. Band: **0.75–0.85** (03 §6).

**Corrected 2026-07 — hand-verification catch:** this section originally read `ability + 200`. Given `expected = 1/(1+10^((difficulty-ability)/400))`, difficulty *above* ability lowers expected success (an item +200 harder gives ≈0.24, not 0.76) — the original formula would have systematically served items far outside the desirable-difficulty band, well past the point doc 03 §6 flags as where learners in low-support contexts disengage rather than persist. The adaptive adjustment direction below was already correct and needed no change: `target_elo` is a difficulty-space value, so "raise it when success is too high" holds regardless of which side of ability the base target sits on — only the base offset's sign was wrong.

Adjust once ≥ 20 attempts exist on the node:
- Observed success > 0.90 over last 10 → `target_elo += 100`
- Observed success < 0.60 over last 10 → `target_elo -= 100`
- Clamp adjustment to ±200.

**(v2) Arithmetic check of the band — open, not changed.** `ability − 200` gives 0.76 *at* the target. Under §6's weighted sample (σ=150) the mean expected success is lower, because the logistic is concave above 0.5. Computed with σ=150: a continuous pool gives a mean of about 0.73. For a just-ready learner (ability equal to node difficulty) served the three tier items of §5.1 in equal numbers, the mean is about 0.70, entering the 0.75–0.85 band only around ability = node + 100. The weights assume equal item counts per tier; real bank composition (doc 05 §8) will move this. Before launch: document the bank composition and ability assumed by `selection_band.json`, and re-derive the base offset from simulation if the band is missed. Changing −200 also changes §5.1's cross-check, so do it deliberately.

### 6.2 Tier reachability

Tier 3 items are withheld until the learner has ≥ 2 correct at Tier 2 on that node. Prevents a demoralising early wall while still requiring Tier 3 for mastery.

### 6.3 Pool exhaustion ladder

1. Relax `seen_within` 21 days → 10 days
2. Widen sigma 150 → 300
3. Serve the least-recently-seen item
4. If node has < 8 items, emit `content_gap` telemetry — this is a content bug, not an engine condition

**Invariant I-4:** `select_next_item` MUST always return a `Decision`. Never null, never an exception.

---

## 7. Placement Algorithm

**Implementation note, added 2026-07-29 while building the conformance test harness:** the pseudocode below is written as a single synchronous function for readability, but that shape directly contradicts §7.2's resumability requirement — a dropped connection mid-loop has nowhere to persist to and nothing to resume from in a one-shot function. The actual implementation is a **resumable step API**: `initPlacementState`, `nextProbeDepth`, `recordProbeResult`, `finalizePlacement`, each taking and returning explicit state that the caller (client or server) persists between calls. A `place()` convenience wrapper exists for the uninterrupted case and simply drives the four steps in sequence — it satisfies the pseudocode's literal shape below, but the step API is the real contract, and it's what `placement_resume` (§12) actually exercises. Read the pseudocode below for *what* the algorithm computes; read `engine/src/placement.ts` for the *shape* it's actually built in.

Binary search over the prerequisite DAG. Budget: 15–20 items, hard cap 25.

```
fn place(learner, subject, entry_grade_hint, rng) -> PlacementResult {

    // 1. Seed at the middle of the hinted grade band
    let hint_depth = depth_for_grade(entry_grade_hint)
    let mut lo = max(graph_min_depth, hint_depth - 10)
    let mut hi = min(graph_max_depth, hint_depth + 10)
    let mut evidence = Map<node_id, (correct, total)>

    while items_used < 20 && hi - lo > 1 {
        let probe_depth = (lo + hi) / 2
        let probes = sample_nodes_at_depth(probe_depth, k=3, rng)

        for node in probes {
            let item = select_placement_item(node, tier=2, rng)   // always mid-tier
            let result = administer(item)
            evidence[node] += result
            items_used += 1
        }

        let rate = success_rate(probes, evidence)
        if rate >= 2.0/3.0      { lo = probe_depth }     // search upward — 2 or 3 of 3 probes correct
        else if rate <= 1.0/3.0 { hi = probe_depth }     // search downward — 0 or 1 of 3 probes correct
        else                 { break }                // frontier found
    }

    // The frontier is wherever the loop's binary search settled — but specifically the
    // last CONFIRMED-successful depth, not just the last depth probed. `lo` is only ever
    // advanced on rate>=0.67, so it always denotes a verified floor; `probe_depth` on its
    // final iteration may have just failed (that's often why the loop exited), and using
    // it directly would place the frontier one level above what the learner actually
    // demonstrated.
    let frontier_nodes = nodes_at_depth(subject, lo)

    // If the true frontier lies outside the initial ±10 window (rare — a learner far
    // enough off-hint that even the widened bracket undershoots or overshoots),
    // widen once by another 10 in the exhausted direction and continue the loop,
    // still inside the same 20-item budget. This keeps the common case cheap
    // (a handful of probes near the hint) without hard-failing the rare case.

    // 2. Backfill: verify prerequisites of the identified frontier
    for node in prerequisites_of(frontier_nodes) {
        if unverified(node) && items_used < 25 {
            administer(select_placement_item(node, tier=1, rng))
        }
    }

    // 3. Seed state
    for (node, ev) in evidence {
        if ev.rate >= 0.75 { mark_provisionally_mastered(node) }
        set_initial_elo(node, elo_from_evidence(ev))
    }
    propagate_mastery_down(frontier_nodes)   // prerequisites of mastered nodes assumed mastered
}
```

**Corrected 2026-07 — hand-verification catch:** the original version initialized the search to the *full graph range* (`graph_min_depth` to `graph_max_depth`) despite the adjacent comment claiming to "seed at the middle of the hinted grade band" — on a graph up to depth 40 (doc 02 §2.2), that costs roughly 5–6 binary-search rounds × 3 probes just to narrow toward the hint before the real placement work starts, eating most of the 20-item budget on nothing. It also referenced two different, never-reconciled variable names (`frontier` and `frontier_nodes`) for what should be one value. Both are fixed above: the search now brackets a ±10 window around the grade hint, and the frontier is derived once, explicitly, from where the loop actually settles.

### 7.1 Rules

- Placement items MUST be Tier 2 for probing (Tier 1 over-passes, Tier 3 under-passes).
- Placement attempts MUST NOT count toward the mastery window (`is_placement = true`).
- **Provisional mastery** from placement carries `mastered_at = null` and is re-verified by the review scheduler within 14 days. If a provisional node fails review, it drops to `available` and is fully taught.
- `propagate_mastery_down` marks unverified prerequisites of a mastered node as provisionally mastered. This is what makes a 20-item test place a learner across 400 nodes. **(v2) Not implemented in `/engine` as of the 2026-08-14 note, and pilot-blocking:** without it placement unlocks only the nodes it probed. Implement it with a vector, `placement_propagates_prerequisites.json`, before any learner is placed.
- **(v2) Placement presupposes nodes at and below the learner's frontier.** A graph with no nodes below JSS1 cannot place a P4-level learner, whatever the algorithm does. `PlacementResult` MUST carry `at_graph_floor: bool`, true when the search ended at the graph's minimum depth with the frontier still unconfirmed. Telemetry `placement_at_graph_floor` is the content-gap signal; it should be near zero before the pilot. This is a content requirement (a prerequisite spine of primary-level nodes, Product Plan §17.1), not an engine change. New vector: `placement_graph_floor.json`.

### 7.2 Presentation constraints

- The learner MUST NOT see a score, a grade level, or a comparison.
- Copy: "We're finding your starting point." Never "you are 3 years behind."
- Placement MUST be resumable — a dropped connection mid-placement does not restart it.

---

## 8. Review Scheduler (FSRS-derived)

Deterministic, offline, no model call. **The study planner is this — do not put an LLM on it.**

### 8.1 Scheduling

On transition to `mastered`:
```
stability      = 3.0 days          (initial)
difficulty_fsrs = clamp(5.0 - 0.8 * (ability_elo - 1200)/200, 1.0, 10.0)
due_at         = now + stability
```

On each review:
```
retrievability = exp(ln(0.9) * elapsed_days / stability)

if correct:
    stability *= 1 + exp(w1) * (11 - difficulty_fsrs) * stability^(-w2) * (exp(w3*(1-retrievability)) - 1)
    difficulty_fsrs -= 0.1
else:
    lapses += 1
    stability = max(1.0, stability * 0.3)
    difficulty_fsrs += 0.6
    status = relearning

difficulty_fsrs = clamp(difficulty_fsrs, 1.0, 10.0)
due_at = now + stability * exam_compression(now)
```

Start with published FSRS-5 default weights. Refit from Questcademy data at ≥ 500k reviews.

### 8.2 Queue construction

- Daily cap: **8 review items.** Hard cap — review must never crowd out forward progress.
- Priority: `relearning` > overdue (largest `now - due_at`) > exam-critical nodes > due today.
- Overdue backlog decays: nodes overdue by > 60 days are re-queued at a max of 3/day rather than dumped.
- **(v2) Exam-window backlog.** Compression (§8.3) shortens intervals but I-6 caps the queue at 8/day, so nothing guarantees every mastered node is reviewed inside the window. Illustration (assumed 14-day average interval): 200 mastered nodes at ×0.35 is about 40 due per day against a cap of 8. Until a decision record sets an `exam_window_daily_cap`, the cap stays 8, priority already favours exam-critical nodes, and the engine MUST emit `review_backlog_in_exam_window` (due count above cap). Doc 03 §3's wording ("nothing goes unreviewed inside the exam window") is an aspiration, not something the engine can guarantee. New vector: `review_backlog_exam_window_telemetry.json`.

### 8.3 Exam-aware compression

```
fn exam_compression(now) -> float {
    let d = ctx.days_until_exam          // (v2) declared input, §2.4; None = 1.0
    match d {
        None          => 1.0,
        Some(d) if d > 90 => 1.0,
        Some(d) if d > 30 => 0.75,
        Some(d) if d > 14 => 0.5,
        Some(d)           => 0.35,
    }
}
```

Intervals compress as the exam approaches so no mastered node goes unreviewed inside the exam window. **This is a genuine differentiator — no general-purpose tutor does it.**

---

## 9. Escalation to Tutor

The engine decides *when*; it never talks to a model.

```
fn should_escalate(node: NodeState) -> bool {
    let recent = node.recent_window
    recent.len() >= 4
      && recent.last(4).all(|a| !a.correct)
      && recent.last(4).any(|a| a.hints_used == 3)   // exhausted Tier 1
      && !escalated_within(node, hours=24)
}
```

Emits `Decision::escalate_to_tutor` with `node_id` and `misconception_id`. Everything downstream is doc 08.

### 9.1 Optional tutor offers (v2, proposed)

`escalate_to_tutor` means "this learner is struggling" and fires late (4 failures). Product Plan §13 wants the tutor inside the practice loop at earlier, specific moments, as an *optional* offer the learner can decline. Keep the two distinct:

```
fn should_offer_tutor(node, last_attempt, ctx) -> Option<reason> {
    // each reason is offered at most once per its scope below, so offers never nag
    if last_attempt.hints_used == 3 && !last_attempt.correct           -> hint_ladder_exhausted   // once per item
    if remediation_shown_recently(node, m, within_days=3)
       && dominant_misconception(node.recent_window, 5, 2) == Some(m)  -> repeat_misconception   // once per misconception per 3 days
    if last_attempt.correct && last_attempt.hints_used == 0
       && last_attempt.difficulty_tier == 3
       && !offered_within(node, "self_explain", hours=24)              -> self_explain           // once per node per 24h
}
```

Rules: an offer never mutates `NodeState`, never counts toward mastery, Elo or review, and is not an `Attempt`. Tutor dialogue and the learner's explanation are not graded. `repeat_misconception` fires only *after* `serve_remediation` has already been shown, so the micro-lesson (doc 03 §10) always comes first. The offer is a pure function of state and `now`, so it needs a vector: `tutor_offer_triggers.json`. The thresholds above are starting values from Product Plan §13.1; adjust after the pilot (Product Plan §13.3 metrics).

**Target escalation rate: < 10% of node attempts.** Higher means Tier 1 hint content is weak — a content problem, not an engine problem. Instrument it.

---

## 10. Bayesian Knowledge Tracing (future; triggered by data volume)

Do not build before ~500k attempts. There is nothing to fit.

Per-node parameters `p(L0), p(T), p(G), p(S)` fitted by EM. Runs **alongside** Elo, not instead of it.

**The one thing BKT buys that Elo cannot:** guess/slip separation. A 4-option MCQ has a 25% floor; Elo cannot distinguish "lucky" from "knows it." BKT can, and it directly tightens the mastery gate.

Integration:
```
p_mastery = bkt_posterior(node, attempt_history)
is_mastered = elo_predicate(node) && p_mastery >= 0.95
```

Ship behind a feature flag. Run 8 weeks in shadow mode, comparing predicted vs. actual 30-day retention against the Elo-only gate, before enabling. Surface uncertainty to teachers as a band, never a false-precision percentage.

---

## 11. Invariants (assert in every build, including release)

| ID | Invariant |
|---|---|
| I-1 | No node `available` unless all hard prerequisites are `mastered`+ |
| I-2 | `mastered_at` set once, never cleared |
| I-3 | Mastery monotonic within a session |
| I-4 | `select_next_item` always returns a Decision |
| I-5 | Elo ratings always within [400, 2800] |
| I-6 | Review queue never exceeds 8 items/day |
| I-7 | Skill graph is acyclic (validated at content build, re-asserted at load) |
| I-8 | An attempt is never counted twice — `attempt_id` idempotency |
| I-9 | Engine output is a pure function of (state, event, now, seed) |
| I-10 | Hinted attempts never satisfy the mastery predicate |
| I-11 | (v2) A framework pin migration never mutates `NodeState`. Mastery lives on nodes; pins live on frameworks (doc 02 V-6). Vector: `pin_migration_preserves_state.json` |
| I-12 | (v2) Engine output is framework-agnostic: the same attempt sequence under two different `frameworkId` values yields byte-identical state and decisions (E-2; `EngineContext.frameworkId` is telemetry only, §2.4). Checked in tests, not as a runtime assertion. Vector: `determinism_across_frameworks.json` |

---

## 12. Conformance Test Vectors

`engine/testdata/` — golden files, JSON. Both client and server implementations MUST pass all.

| Vector | Asserts |
|---|---|
| `mastery_same_day_grind.json` | 8 correct in one session ⇒ NOT mastered (spacing gate) |
| `mastery_two_day_clean.json` | 4/5 correct across 2 non-consecutive days + Tier 3 ⇒ mastered |
| `mastery_hint_farm.json` | 10 correct all with hints ⇒ NOT mastered |
| `mastery_boundary_consecutive.json` | Correct on Mon and Tue ⇒ NOT mastered (must be non-consecutive) |
| `mastery_hinted_day_bridge.json` | 4 clean corrects in one session + 1 hinted correct days later ⇒ NOT mastered (a hinted attempt cannot supply the second day) |
| `elo_convergence.json` | 200 simulated attempts ⇒ ability within ±60 of true |
| `elo_cold_start.json` | First 10 attempts move ability ≥ 150 points |
| `selection_band.json` | 1000 selections ⇒ mean expected success in [0.75, 0.85] |
| `selection_no_repeat.json` | No item repeats within 21 simulated days |
| `selection_pool_exhaustion.json` | 6-item node ⇒ ladder engages, never errors |
| `item_difficulty_node_relative.json` | §5.1 — same tier on a shallow and a deep node ⇒ different seeds; the offsets are the p-value spread, not 0/+300/+600 |
| `node_difficulty_topological.json` | §5.1 — `node.difficulty_elo` derived from prerequisite depth; a node with no prerequisites sits at the grade anchor |
| `ability_seed_from_prerequisites.json` | §5.1 — a new node seeds from the learner's mastered prerequisites, not from the grade default |
| `ability_seed_secured_by_i1.json` | §5.1, I-1 (corrected 2026-08-14) — the ability-seed mean is I-1's secured set (mastered/needs_review/relearning), not the literal string 'mastered'; a relearning-only prerequisite seeds from its ability rather than falling back to 1200, and available/in_progress/locked/no-state stay excluded |
| `availability_hard_prerequisite_gates.json` | §3, I-1 — an unsecured hard prerequisite gates; `in_progress` and no-state-at-all both gate; the entry set (no hard prerequisites) is always available |
| `availability_chain_unlocks.json` | §3, I-1 — mastering one node in a 4-chain makes exactly one more available at each stage, and the doc 01 §3.2 frontier is the available set minus the secured ones |
| `availability_soft_never_gates.json` | §3, I-1 + doc 02 §2.2 — a soft prerequisite never gates; structural, since `AvailabilityNode` carries only `hard_prerequisite_ids` |
| `availability_review_states_satisfy.json` | §3, I-1 — `needs_review` and `relearning` satisfy a prerequisite; asserted over all six statuses, so widening the set fails here |
| `availability_provisional_mastery.json` | §7.1, I-1 — provisional mastery (`mastered_at` null) unlocks dependants; demotion to `available` re-locks them on the next read |
| `interleave_cadence.json` | (v2, proposed) Review items appear at every 4th position counted from the first interleavable item; none before the node has 2 correct attempts |
| `remediation_override.json` | §6 step 2, §2.2 (2026-08-16) — `dominant_misconception` reads `recent_window` (not the removed `misconception_hits`); 1 hit in 5 does not trigger, 2 hits triggers `serve_remediation`, `remediation_shown_recently=true` suppresses the same detection, and a 2-vs-2 tie resolves to the more-recently-hit belief |
| `review_queue_daily_cap.json` | 20 due nodes ⇒ exactly 8 queued (I-6), same 8 every run; resume mid-day does not re-spend the budget |
| `review_queue_priority.json` | relearning > overdue (largest first) > exam-critical > due today, from reverse-order input |
| `review_queue_overdue_decay.json` | 10 nodes >60 days overdue ⇒ at most 3 admitted, today's 5 reviews not crowded out |
| `review_queue_relearning_not_due.json` | 9 relearning nodes not yet due ⇒ excluded; the 1 due relearning node still leads; overdue and due-today tiers reached |
| `placement_low_ability.json` | Simulated P4-level learner in JSS2 ⇒ frontier at P4, ≤ 20 items |
| `placement_high_ability.json` | Above-grade learner ⇒ frontier above entry hint |
| `placement_resume.json` | Interrupt at item 9, resume ⇒ identical outcome |
| `fsrs_lapse_recovery.json` | Lapse ⇒ stability drop, relearning, 2-correct recovery |
| `fsrs_exam_compression.json` | 10 days to exam ⇒ intervals × 0.35 |
| `escalation_trigger.json` | 4 fails with hints exhausted ⇒ escalate exactly once per 24h |
| `determinism_cross_platform.json` | Same seed + input ⇒ byte-identical output |
| `idempotency_replay.json` | Replaying the full attempt log ⇒ identical final state |
| `mastery_hinted_tier3.json` | (v2) A hinted Tier-3 correct does not set `max_tier_correct`; mastery stays false |
| `mastery_blockers.json` | (v2, proposed) Each unmet clause is reported; spacing-only ⇒ blockers = {spacing} |
| `elo_review_no_ability_update.json` | (v2) A review attempt leaves `ability_elo` unchanged |
| `exam_proximity_none.json` | (v2) `days_until_exam = None` ⇒ compression 1.0, no error |
| `review_backlog_exam_window_telemetry.json` | (v2) 40 due inside the exam window ⇒ queue is 8, `review_backlog_in_exam_window` emitted |
| `placement_propagates_prerequisites.json` | (v2) Mastering a probed node provisionally masters its unverified prerequisites |
| `placement_graph_floor.json` | (v2) Learner below the graph's minimum depth ⇒ `at_graph_floor = true`, no error |
| `tutor_offer_triggers.json` | (v2, proposed) Each §9.1 reason fires once at its scope; remediation always precedes `repeat_misconception`; offers do not change state |
| `pin_migration_preserves_state.json` | (v2) I-11: migrating a pin leaves every `NodeState` byte-identical |
| `determinism_across_frameworks.json` | (v2) I-12: same attempt sequence under two `frameworkId` values ⇒ byte-identical state and decisions |
| `forecast_band_not_point.json` | (v2) §15: forecast returns a band; identical inputs ⇒ identical output |

**Rule:** a change to §4, §5, §6, §7 or §8 requires an updated or added vector in the same commit. Enforced in CI.

---

## 13. Performance Budget

| Operation | P50 | P99 | Device |
|---|---|---|---|
| `select_next_item` | 4ms | 15ms | 2GB Android |
| `evaluate_attempt` | 1ms | 5ms | 2GB Android |
| `build_review_queue` | 15ms | 60ms | 2GB Android |
| `place` (full run) | — | 400ms | 2GB Android |
| Full state rehydrate (400 nodes) | 80ms | 250ms | 2GB Android |

Item pools loaded lazily per node. The whole graph MUST NOT be resident in memory.

---

## 14. Telemetry the Engine Must Emit

Not for analytics dashboards — for debugging the engine itself.

`decision_reason` on every decision · `expected_vs_actual_success` per selection · `pool_exhaustion_level` · `escalation_rate` per node · `content_gap` when a node has < 8 usable items · `provisional_mastery_failure_rate` (placement quality) · `placement_at_graph_floor` (v2; content gap) · `review_backlog_in_exam_window` (v2) · `tutor_offer` with `reason` (v2) · `invariant_violation` (should always be zero; page on non-zero)

---

## 15. Exam-Readiness Forecast (v2)

§1 put forecasting in scope but no section defined it, and the Product Plan's dashboard shows a "predicted exam score". This section fixes the contract; the algorithm is deliberately unvalidated.

**Contract.** A pure function. The engine must not read a framework (§2.4), so everything framework-specific is passed in:

```
forecast_exam(node_states, exam_inputs, now) -> Forecast
  exam_inputs = { weights: [{ node_id, weight }], grading_scale: [{ grade, min_pct }] }   # resolved by the caller
  Forecast    = { pct_low, pct_high, grade_low, grade_high, coverage, basis }
```

- Output is a **band, never a single number** (the same rule as §10: uncertainty to teachers as a band, never false-precision percentages). `coverage` is the share of exam weight on nodes with any evidence; `basis` says what the band is built from.
- Nodes with no mapped objective do not contribute (doc 02 M-4). Unmapped objectives widen the band.
- Deterministic and offline (E-1 to E-4). Never shown to a learner in a way that implies rank or grade level (doc 03 §2). Teacher-facing use follows the same dignity rule.

**Candidate baseline (unvalidated).** For each weighted node, the probability of a correct answer from `ability_elo` against node difficulty (§5.2), reduced by FSRS retrievability for mastered nodes (§8.1); sum by weight; widen by the weight of unevidenced nodes. Validate against the pre-registered RCT outcomes (doc 03 §14) before any learner or school relies on it.

---

## Change Log

**v2 — 2026-11-18**

- §2.1, §2.2: removed the "reduced K" wording; specified `max_tier_correct` updates; proposed `correct_total`.
- §2.3, §2.4: added `offer_tutor`; declared `EngineContext` including `days_until_exam`.
- §4: documented the window consequence for spacing; proposed `mastery_blockers` and spacing-pending behaviour.
- §5.4: reconciled review-attempt handling with §5.1's 2026-08-14 correction.
- §6: proposed interleaving only after 2 correct (doc 03 §5); recorded the band arithmetic check.
- §7.1: flagged `propagate_mastery_down` as pilot-blocking; added `at_graph_floor`.
- §8.2, §8.3: exam-window backlog and telemetry; declared the exam-proximity input.
- §9.1: optional tutor offers, distinct from escalation.
- §11, §12, §14: I-11, ten new vectors, new telemetry.
- §11, §12 (2026-11-18 documentation pass): added I-12 and the `determinism_across_frameworks` vector, both already implemented in `engine/`.
- §15: forecast contract (new).

**Decision records:** DR-001 to DR-007, DR-010

## Decisions (resolved 2026-11-18)

Recorded in the linked decision records, accepted on the owner's delegated instruction. Implementation consequences are in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md); none of them has been coded.

| # | Topic | Decision | Status |
|---|---|---|---|
| 1 | Pilot content scope ([DR-001](decisions/DR-001-prerequisite-spine.md)) | Spine = hard-prerequisite closure of the pilot nodes, mainly P4-P6, plus a minimal P1-P3 arithmetic floor; `propagate_mastery_down` is not deferred | Accepted |
| 2 | Review attempts and ability ([DR-002](decisions/DR-002-review-attempt-elo.md)) | Review attempts do not change `ability_elo` (§5.4 is correct; `elo.ts` must change) | Accepted |
| 3 | Interleaving ([DR-003](decisions/DR-003-interleaving-correct-total.md)) | Gate on >= 2 correct in `recent_window`; no `correct_total`; `offer_tutor` and `mastery_blockers` accepted | Accepted |
| 4 | `max_tier_correct` ([DR-004](decisions/DR-004-max-tier-correct-windowed.md)) | Lifetime maximum for the pilot; metric and trigger defined | Provisional |
| 5 | Exam-window cap ([DR-005](decisions/DR-005-exam-window-cap.md)) | Cap stays 8 (I-6); telemetry only | Provisional |
| 6 | Band offset ([DR-006](decisions/DR-006-band-offset.md)) | -200 for the pilot; re-derive if the observed band leaves 0.72-0.86 | Provisional |
| 7 | Spacing window ([DR-007](decisions/DR-007-spacing-window.md)) | FSRS-5 default weights; refit at >= 500k reviews | Accepted |
| 8 | Phase labels ([DR-008](decisions/DR-008-phase-labels.md)) | Translation table in plan §18; algorithm uses renamed to data triggers (done in this document) | Accepted |
| 9 | Pending-attempt contract ([DR-010](decisions/DR-010-pending-attempt-contract.md)) | Separate `pending_attempts` queue; engine sees only graded attempts; 14-day expiry | Provisional |
