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
