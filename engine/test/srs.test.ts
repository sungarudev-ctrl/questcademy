/**
 * engine/test/srs.test.ts
 *
 * Conformance tests for the FSRS Review Scheduler against the six golden vectors from doc 04 §12.
 *
 * Covers:
 *   1. fsrs_lapse_recovery.json — stability drop on lapse, relearning, 2-correct recovery
 *   2. fsrs_exam_compression.json — exam-aware interval compression across all brackets
 *   3. review_queue_daily_cap.json — hard cap of 8 (I-6), determinism, mid-day budget resume
 *   4. review_queue_priority.json — priority tier sorting (relearning > overdue > exam-critical > due today)
 *   5. review_queue_overdue_decay.json — >60d overdue backlog capped at 3/day
 *   6. review_queue_relearning_not_due.json — exclusion of not-yet-due relearning nodes
 *   7. doc 04 §3 implementation note — review attempt arriving while status === 'mastered'
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { NodeState } from "../src/state.js";
import {
  onMastery,
  onReview,
  buildReviewQueue,
  examCompression,
  retrievability,
} from "../src/srs.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

// ---------------------------------------------------------------------------
// 1. fsrs_lapse_recovery.json
// ---------------------------------------------------------------------------

describe("1. fsrs_lapse_recovery.json", () => {
  interface LapseVector {
    initial_node: NodeState;
    steps: {
      step: number;
      now: string;
      correct: boolean;
      hints_used: number;
      expected_state: Partial<NodeState>;
    }[];
  }

  it("handles lapse stability drop, transition to relearning, and 2-correct recovery", () => {
    const vec = loadVector<LapseVector>("fsrs_lapse_recovery");

    let node = vec.initial_node;

    // Step 1: Incorrect review -> lapse
    const step1 = vec.steps[0]!;
    node = onReview(node, step1.correct, step1.now, null, step1.hints_used);
    expect(node.status).toBe(step1.expected_state.status); // relearning
    expect(node.lapses).toBe(step1.expected_state.lapses); // 1
    expect(node.stability).toBe(step1.expected_state.stability); // 3.0
    expect(node.difficulty_fsrs).toBeCloseTo(step1.expected_state.difficulty_fsrs!, 2); // 5.1
    expect(node.due_at).toBe(step1.expected_state.due_at);
    expect(node.mastered_at).toBe(step1.expected_state.mastered_at); // I-2: never cleared

    // Step 2: 1st correct in relearning -> remains in relearning
    const step2 = vec.steps[1]!;
    node = onReview(node, step2.correct, step2.now, null, step2.hints_used);
    expect(node.status).toBe(step2.expected_state.status); // relearning
    expect(node.lapses).toBe(step2.expected_state.lapses); // 1
    expect(node.mastered_at).toBe(step2.expected_state.mastered_at);

    // Step 3: 2nd consecutive correct in relearning -> recovers to mastered!
    const step3 = vec.steps[2]!;
    node = onReview(node, step3.correct, step3.now, null, step3.hints_used);
    expect(node.status).toBe(step3.expected_state.status); // mastered
    expect(node.lapses).toBe(step3.expected_state.lapses); // 1
    expect(node.mastered_at).toBe(step3.expected_state.mastered_at); // preserved
  });
});

// ---------------------------------------------------------------------------
// 2. fsrs_exam_compression.json
// ---------------------------------------------------------------------------

describe("2. fsrs_exam_compression.json", () => {
  interface ExamCompressionVector {
    compression_cases: {
      name: string;
      days_until_exam: number | null;
      expected_compression: number;
    }[];
    scheduling_case: {
      now: string;
      days_until_exam: number;
      base_stability: number;
      expected_compression: number;
      expected_effective_interval_days: number;
      expected_due_at: string;
    };
  }

  it("calculates exam compression factors across all threshold brackets", () => {
    const vec = loadVector<ExamCompressionVector>("fsrs_exam_compression");
    const now = "2026-06-01T08:00:00.000Z";

    for (const c of vec.compression_cases) {
      const factor = examCompression(now, c.days_until_exam);
      expect(factor).toBe(c.expected_compression);
    }
  });

  it("compresses due_at scheduling interval when exam is imminent", () => {
    const vec = loadVector<ExamCompressionVector>("fsrs_exam_compression");
    const sc = vec.scheduling_case;

    const dummyNode: NodeState = {
      learner_id: "learner-01",
      node_id: "MATH.NODE_01",
      status: "mastered",
      ability_elo: 1400,
      attempts_total: 5,
      recent_window: [],
      distinct_days: ["2026-06-01"],
      max_tier_correct: 3,
      mastered_at: "2026-05-01T08:00:00.000Z",
      stability: sc.base_stability,
      difficulty_fsrs: 5.0,
      due_at: "2026-06-01T08:00:00.000Z",
      lapses: 0,
    };

    // Review on 'now' with correct=true and 10 days to exam
    const updated = onReview(dummyNode, true, sc.now, sc.days_until_exam);
    // Effective interval should reflect 0.35 factor
    const factor = examCompression(sc.now, sc.days_until_exam);
    expect(factor).toBe(sc.expected_compression);
    expect(updated.due_at).toBeDefined();
    const scheduledDays =
      (Date.parse(updated.due_at!) - Date.parse(sc.now)) / 86400000;
    expect(scheduledDays).toBeCloseTo(updated.stability * 0.35, 2);
  });
});

// ---------------------------------------------------------------------------
// 3. review_queue_daily_cap.json
// ---------------------------------------------------------------------------

describe("3. review_queue_daily_cap.json", () => {
  interface DailyCapVector {
    learner_id: string;
    now: string;
    daily_cap: number;
    nodes: NodeState[];
    expected_full_queue_count: number;
    expected_first_8_node_ids: string[];
    midday_resume: {
      reviews_completed_today: number;
      expected_remaining_queue_count: number;
      expected_remaining_node_ids: string[];
    };
  }

  it("enforces hard daily cap of 8 (I-6) and determinism", () => {
    const vec = loadVector<DailyCapVector>("review_queue_daily_cap");

    // Run 1: 0 completed today -> returns exactly 8
    const q1 = buildReviewQueue(
      {
        learner_id: vec.learner_id,
        node_states: vec.nodes,
        reviews_completed_today: 0,
      },
      vec.now
    );

    expect(q1.items).toHaveLength(vec.expected_full_queue_count);
    expect(q1.items.length).toBeLessThanOrEqual(8);
    expect(q1.items.map((it) => it.node_id)).toEqual(
      vec.expected_first_8_node_ids
    );

    // Run 2: identical inputs produce identical queue (determinism)
    const q2 = buildReviewQueue(
      {
        learner_id: vec.learner_id,
        node_states: vec.nodes,
        reviews_completed_today: 0,
      },
      vec.now
    );
    expect(q2.items.map((it) => it.node_id)).toEqual(
      q1.items.map((it) => it.node_id)
    );

    // Run 3: Midday resume with 3 reviews completed today
    const q3 = buildReviewQueue(
      {
        learner_id: vec.learner_id,
        node_states: vec.nodes,
        reviews_completed_today: vec.midday_resume.reviews_completed_today,
      },
      vec.now
    );
    expect(q3.items).toHaveLength(
      vec.midday_resume.expected_remaining_queue_count
    );
    expect(q3.items.map((it) => it.node_id)).toEqual(
      vec.midday_resume.expected_remaining_node_ids
    );
  });
});

// ---------------------------------------------------------------------------
// 4. review_queue_priority.json
// ---------------------------------------------------------------------------

describe("4. review_queue_priority.json", () => {
  interface PriorityVector {
    learner_id: string;
    now: string;
    exam_critical_nodes: string[];
    nodes_input_reverse_order: NodeState[];
    expected_queue_node_ids: string[];
  }

  it("orders queue strictly by priority: relearning > overdue > exam-critical > due today", () => {
    const vec = loadVector<PriorityVector>("review_queue_priority");

    const q = buildReviewQueue(
      {
        learner_id: vec.learner_id,
        node_states: vec.nodes_input_reverse_order,
      },
      vec.now,
      undefined,
      { examCriticalNodes: new Set(vec.exam_critical_nodes) }
    );

    expect(q.items.map((it) => it.node_id)).toEqual(
      vec.expected_queue_node_ids
    );
  });
});

// ---------------------------------------------------------------------------
// 5. review_queue_overdue_decay.json
// ---------------------------------------------------------------------------

describe("5. review_queue_overdue_decay.json", () => {
  interface OverdueDecayVector {
    learner_id: string;
    now: string;
    max_overdue_backlog: number;
    nodes: NodeState[];
    expected_queue_count: number;
    expected_overdue_backlog_admitted: number;
    expected_today_reviews_admitted: number;
    expected_queue_node_ids: string[];
  }

  it("caps >60d overdue backlog at 3/day so today's reviews are not crowded out", () => {
    const vec = loadVector<OverdueDecayVector>("review_queue_overdue_decay");

    const q = buildReviewQueue(
      {
        learner_id: vec.learner_id,
        node_states: vec.nodes,
      },
      vec.now,
      undefined,
      { maxOverdueBacklog: vec.max_overdue_backlog }
    );

    expect(q.items).toHaveLength(vec.expected_queue_count);
    expect(q.items.map((it) => it.node_id)).toEqual(
      vec.expected_queue_node_ids
    );

    const overdueAdmitted = q.items.filter((it) =>
      it.node_id.startsWith("OVERDUE")
    ).length;
    const todayAdmitted = q.items.filter((it) =>
      it.node_id.startsWith("TODAY")
    ).length;

    expect(overdueAdmitted).toBe(vec.expected_overdue_backlog_admitted);
    expect(todayAdmitted).toBe(vec.expected_today_reviews_admitted);
  });
});

// ---------------------------------------------------------------------------
// 6. review_queue_relearning_not_due.json
// ---------------------------------------------------------------------------

describe("6. review_queue_relearning_not_due.json", () => {
  interface RelearningNotDueVector {
    learner_id: string;
    now: string;
    nodes: NodeState[];
    expected_excluded_node_ids: string[];
    expected_queue_node_ids: string[];
  }

  it("excludes relearning nodes that are not yet due even when slots are empty", () => {
    const vec = loadVector<RelearningNotDueVector>(
      "review_queue_relearning_not_due"
    );

    const q = buildReviewQueue(
      {
        learner_id: vec.learner_id,
        node_states: vec.nodes,
      },
      vec.now
    );

    const queueNodeIds = q.items.map((it) => it.node_id);

    // None of the not-due relearning nodes should be in the queue
    for (const excludedId of vec.expected_excluded_node_ids) {
      expect(queueNodeIds).not.toContain(excludedId);
    }

    expect(queueNodeIds).toEqual(vec.expected_queue_node_ids);
  });
});

// ---------------------------------------------------------------------------
// 7. Doc 04 §3 Implementation Note (Review arriving while status === 'mastered')
// ---------------------------------------------------------------------------

describe("7. Doc 04 §3 Implementation Note", () => {
  const baseMasteredNode: NodeState = {
    learner_id: "learner-impl-note",
    node_id: "MATH.TEST_NODE",
    status: "mastered", // Persisted status is 'mastered', but due_at has elapsed!
    ability_elo: 1400,
    attempts_total: 5,
    recent_window: [],
    distinct_days: ["2026-06-01"],
    max_tier_correct: 3,
    mastered_at: "2026-06-01T08:00:00.000Z",
    stability: 5.0,
    difficulty_fsrs: 4.5,
    due_at: "2026-06-06T08:00:00.000Z",
    lapses: 0,
  };

  it("handles a review attempt arriving while status === 'mastered' identically to needs_review (correct)", () => {
    const now = "2026-06-08T08:00:00.000Z"; // 2 days past due
    const updated = onReview(baseMasteredNode, true, now);

    // On correct: remains mastered, stability increases, difficulty decreases by 0.1
    expect(updated.status).toBe("mastered");
    expect(updated.stability).toBeGreaterThan(baseMasteredNode.stability);
    expect(updated.difficulty_fsrs).toBeCloseTo(4.4, 2);
    expect(updated.lapses).toBe(0);
    expect(Date.parse(updated.due_at!)).toBeGreaterThan(Date.parse(now));
  });

  it("handles a review attempt arriving while status === 'mastered' identically to needs_review (incorrect)", () => {
    const now = "2026-06-08T08:00:00.000Z"; // 2 days past due
    const updated = onReview(baseMasteredNode, false, now);

    // On incorrect: transitions to relearning, lapses += 1, stability drops
    expect(updated.status).toBe("relearning");
    expect(updated.lapses).toBe(1);
    expect(updated.stability).toBe(Math.max(1.0, baseMasteredNode.stability * 0.3)); // 1.5
    expect(updated.difficulty_fsrs).toBeCloseTo(5.1, 2);
    expect(updated.mastered_at).toBe(baseMasteredNode.mastered_at); // I-2
  });
});

// ---------------------------------------------------------------------------
// 8. Unit Tests: onMastery and retrievability
// ---------------------------------------------------------------------------

describe("8. Unit Tests: onMastery and retrievability", () => {
  it("initializes stability = 3.0, difficulty_fsrs in [1.0, 10.0], and due_at on mastery", () => {
    const now = "2026-07-01T08:00:00.000Z";
    const unmasteredNode: NodeState = {
      learner_id: "learner-01",
      node_id: "MATH.NODE_01",
      status: "in_progress",
      ability_elo: 1300,
      attempts_total: 4,
      recent_window: [],
      distinct_days: ["2026-06-28", "2026-07-01"],
      max_tier_correct: 3,
      mastered_at: null,
      stability: 0,
      difficulty_fsrs: 0,
      due_at: null,
      lapses: 0,
    };

    const mastered = onMastery(unmasteredNode, now);
    expect(mastered.status).toBe("mastered");
    expect(mastered.mastered_at).toBe(now);
    expect(mastered.stability).toBe(3.0);
    // difficulty_fsrs = 5.0 - 0.8 * (1300 - 1200) / 200 = 5.0 - 0.4 = 4.6
    expect(mastered.difficulty_fsrs).toBeCloseTo(4.6, 2);
    expect(mastered.due_at).toBe("2026-07-04T08:00:00.000Z");
  });

  it("retrievability decreases monotonically with elapsed days", () => {
    const stability = 5.0;
    const r0 = retrievability(stability, 0);
    const r1 = retrievability(stability, 1);
    const r5 = retrievability(stability, 5);
    const r10 = retrievability(stability, 10);

    expect(r0).toBeCloseTo(1.0, 4);
    expect(r5).toBeCloseTo(0.9, 4); // at stability, retrievability = 0.9 by definition (exp(ln(0.9)*1))
    expect(r1).toBeLessThan(r0);
    expect(r5).toBeLessThan(r1);
    expect(r10).toBeLessThan(r5);
  });

  describe("v2 Conformance Vectors: SRS", () => {
    it("exam_proximity_none: days_until_exam = null => compression 1.0, no error", () => {
      const v = loadVector<{ now: string; exam_window: null; expected_compression: number }>("exam_proximity_none");
      const comp = examCompression(v.now, v.exam_window);
      expect(comp).toBe(v.expected_compression);
    });

    it("review_backlog_exam_window_telemetry: emits review_backlog_in_exam_window when backlog > cap in exam window", () => {
      const v = loadVector<{
        now: string;
        exam_window_days: number;
        nodes_due_count: number;
        cap: number;
        expected_queue_length: number;
        expected_telemetry_key: string;
      }>("review_backlog_exam_window_telemetry");

      // Construct 40 due mastered nodes
      const nodes: NodeState[] = Array.from({ length: v.nodes_due_count }, (_, i) => ({
        learner_id: "learner-test",
        node_id: `NODE.${i}`,
        status: "mastered" as const,
        ability_elo: 1200,
        attempts_total: 5,
        recent_window: [],
        distinct_days: [],
        max_tier_correct: 3,
        mastered_at: "2026-08-01T00:00:00Z",
        stability: 10,
        difficulty_fsrs: 5,
        due_at: "2026-09-01T00:00:00Z", // overdue
        lapses: 0,
      }));

      const queue = buildReviewQueue(nodes, v.now, undefined, {
        cap: v.cap,
        examWindowDays: v.exam_window_days,
      });

      expect(queue.items.length).toBe(v.expected_queue_length);
      expect(queue.telemetry?.[v.expected_telemetry_key]).toBe(v.nodes_due_count - v.cap);
    });
  });
});
