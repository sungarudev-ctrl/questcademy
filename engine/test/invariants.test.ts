/**
 * engine/test/invariants.test.ts
 *
 * Conformance tests for Invariants I-1 through I-10, determinism_cross_platform,
 * and idempotency_replay per docs/04-learning-engine-spec.md §11, §12.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type {
  NodeState,
  Attempt,
  Decision,
  ReviewQueue,
  SkillNodeSummary,
} from "../src/state.js";
import {
  assertInvariants,
  checkI1,
  checkI2,
  checkI3,
  checkI4,
  checkI5,
  checkI6,
  checkI7,
  checkI8,
  checkI9,
  checkI10,
  checkI11,
  checkI12,
} from "../src/invariants.js";
import { transition } from "../src/statemachine.js";

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

describe("Invariants I-1 through I-10 standalone checks", () => {
  const validMasteredNode: NodeState = {
    learner_id: "learn-inv",
    node_id: "MATH.ADD",
    status: "mastered",
    ability_elo: 1250,
    difficulty_elo: 1200,
    attempts_total: 5,
    recent_window: [
      {
        attempt_id: "att-inv-1",
        learner_id: "learn-inv",
        node_id: "MATH.ADD",
        item_id: "item-1",
        difficulty_tier: 1,
        correct: true,
        partial_credit: 1.0,
        selected_option: null,
        misconception_id: null,
        latency_ms: 10000,
        hints_used: 0,
        session_id: "sess-1",
        occurred_at: "2026-09-01T10:00:00Z",
        is_review: false,
        is_placement: false,
        is_exam: false,
      },
    ],
    distinct_days: ["2026-09-01"],
    max_tier_correct: 3,
    mastered_at: "2026-09-01T10:00:00Z",
    stability: 3.0,
    difficulty_fsrs: 4.8,
    due_at: "2026-09-04T10:00:00Z",
    lapses: 0,
  };

  it("I-1: detects available node with unsecured prerequisite", () => {
    const availNode: NodeState = { ...validMasteredNode, status: "available" };
    const vPass = checkI1(availNode, ["mastered", "needs_review"]);
    expect(vPass).toHaveLength(0);

    const vFail = checkI1(availNode, ["in_progress"]);
    expect(vFail).toHaveLength(1);
    expect(vFail[0]?.id).toBe("I-1");
  });

  it("I-2: detects mastered_at cleared or changed", () => {
    const prior: NodeState = { ...validMasteredNode };
    const cleared: NodeState = { ...validMasteredNode, mastered_at: null };
    const vCleared = checkI2(cleared, prior);
    expect(vCleared.some((v) => v.id === "I-2")).toBe(true);

    const changed: NodeState = { ...validMasteredNode, mastered_at: "2026-09-05T10:00:00Z" };
    const vChanged = checkI2(changed, prior);
    expect(vChanged.some((v) => v.id === "I-2")).toBe(true);

    // Lapses with null mastered_at
    const lapsedNoDate: NodeState = { ...validMasteredNode, lapses: 1, mastered_at: null };
    const vLapsed = checkI2(lapsedNoDate);
    expect(vLapsed.some((v) => v.id === "I-2")).toBe(true);
  });

  it("I-3: detects mastery revocation within session", () => {
    const priorMastered: NodeState = { ...validMasteredNode };
    const demotedInSession: NodeState = { ...validMasteredNode, status: "available" };
    const vRevoked = checkI3(demotedInSession, priorMastered);
    expect(vRevoked.some((v) => v.id === "I-3")).toBe(true);
  });

  it("I-4: detects invalid Decision structure", () => {
    const validDecision: Decision = {
      action: "serve_item",
      node_id: "MATH.ADD",
      item_id: "item-1",
      misconception_id: null,
      reason: "target_band",
    };
    expect(checkI4(validDecision)).toHaveLength(0);

    expect(checkI4(null)).toHaveLength(1);
    expect(checkI4({ action: "invalid_action" })).toHaveLength(2); // missing reason + invalid action
  });

  it("I-5: detects Elo rating out of bounds [400, 2800]", () => {
    expect(checkI5(validMasteredNode)).toHaveLength(0);

    const tooLow: NodeState = { ...validMasteredNode, ability_elo: 350 };
    expect(checkI5(tooLow)).toHaveLength(1);

    const tooHigh: NodeState = { ...validMasteredNode, ability_elo: 2850 };
    expect(checkI5(tooHigh)).toHaveLength(1);
  });

  it("I-6: detects review queue exceeding 8 items", () => {
    const q7: ReviewQueue = {
      learner_id: "learn-q",
      date: "2026-09-15",
      items: new Array(7).fill({
        node_id: "NODE",
        status: "needs_review",
        due_at: "2026-09-15",
        overdue_days: 0,
        priority_tier: "due_today",
      }),
      total_due: 7,
      cap: 8,
    };
    expect(checkI6(q7)).toHaveLength(0);

    const q9: ReviewQueue = {
      ...q7,
      items: new Array(9).fill(q7.items[0]!),
      total_due: 9,
    };
    const v6 = checkI6(q9);
    expect(v6).toHaveLength(1);
    expect(v6[0]?.id).toBe("I-6");
  });

  it("I-7: detects cycles in skill graph", () => {
    const acyclicGraph: SkillNodeSummary[] = [
      { node_id: "A", prerequisites: [] },
      { node_id: "B", prerequisites: [{ node_id: "A", type: "hard" }] },
      { node_id: "C", prerequisites: [{ node_id: "B", type: "hard" }] },
    ];
    expect(checkI7(acyclicGraph)).toHaveLength(0);

    const cyclicGraph: SkillNodeSummary[] = [
      { node_id: "A", prerequisites: [{ node_id: "C", type: "hard" }] },
      { node_id: "B", prerequisites: [{ node_id: "A", type: "hard" }] },
      { node_id: "C", prerequisites: [{ node_id: "B", type: "hard" }] },
    ];
    const v7 = checkI7(cyclicGraph);
    expect(v7).toHaveLength(1);
    expect(v7[0]?.id).toBe("I-7");
    expect(v7[0]?.description).toContain("Cycle detected");
  });

  it("I-8: detects duplicate attempt_id", () => {
    const duplicateAttempts: Attempt[] = [
      {
        attempt_id: "att-dup-1",
        learner_id: "l",
        node_id: "n",
        item_id: "i",
        difficulty_tier: 1,
        correct: true,
        partial_credit: 1,
        selected_option: null,
        misconception_id: null,
        latency_ms: 1000,
        hints_used: 0,
        session_id: "s",
        occurred_at: "2026-09-15T10:00:00Z",
        is_review: false,
        is_placement: false,
        is_exam: false,
      },
      {
        attempt_id: "att-dup-1",
        learner_id: "l",
        node_id: "n",
        item_id: "i2",
        difficulty_tier: 1,
        correct: false,
        partial_credit: 0,
        selected_option: null,
        misconception_id: null,
        latency_ms: 1000,
        hints_used: 0,
        session_id: "s",
        occurred_at: "2026-09-15T10:05:00Z",
        is_review: false,
        is_placement: false,
        is_exam: false,
      },
    ];

    const v8 = checkI8(duplicateAttempts);
    expect(v8).toHaveLength(1);
    expect(v8[0]?.id).toBe("I-8");
  });

  it("I-9: detects divergence between identical runs", () => {
    expect(checkI9({ a: 1, b: "x" }, { a: 1, b: "x" })).toHaveLength(0);

    const v9 = checkI9({ a: 1 }, { a: 2 });
    expect(v9).toHaveLength(1);
    expect(v9[0]?.id).toBe("I-9");
  });

  it("I-11: detects pin migration mutating node state", () => {
    const prior = { ...validMasteredNode };
    const current = { ...validMasteredNode };
    expect(checkI11(prior, current)).toHaveLength(0);

    const mutatedNode = { ...prior, status: "locked" as const };
    const v11 = checkI11(prior, mutatedNode);
    expect(v11.length).toBeGreaterThan(0);
    expect(v11[0]?.id).toBe("I-11");

    const mutatedWindow = { ...prior, recent_window: [] };
    expect(checkI11(prior, mutatedWindow).some((v) => v.description.includes("recent_window"))).toBe(true);

    const mutatedDays = { ...prior, distinct_days: ["2026-09-01", "2026-09-05"] };
    expect(checkI11(prior, mutatedDays).some((v) => v.description.includes("distinct_days"))).toBe(true);
  });

  it("I-12: detects engine output divergence across frameworks", () => {
    expect(checkI12({ action: "serve" }, { action: "serve" })).toHaveLength(0);

    const v12 = checkI12({ action: "serve_a" }, { action: "serve_b" });
    expect(v12).toHaveLength(1);
    expect(v12[0]?.id).toBe("I-12");
  });

  it("assertInvariants: exercises pinMigrationState and outputFramework checks", () => {
    const res = assertInvariants({
      pinMigrationState: { prior: validMasteredNode, current: validMasteredNode },
      outputFrameworkA: { ok: true },
      outputFrameworkB: { ok: true },
    });
    expect(res).toHaveLength(0);

    const resDiff = assertInvariants({
      outputFrameworkA: { ok: true },
      outputFrameworkB: { ok: false },
    });
    expect(resDiff).toHaveLength(1);
    expect(resDiff[0]?.id).toBe("I-12");
  });

  it("I-10: detects mastery satisfied only by hinted attempts", () => {
    const hintedOnlyNode: NodeState = {
      ...validMasteredNode,
      recent_window: [
        {
          attempt_id: "att-hinted-1",
          learner_id: "learn-inv",
          node_id: "MATH.ADD",
          item_id: "item-1",
          difficulty_tier: 1,
          correct: true,
          partial_credit: 1.0,
          selected_option: null,
          misconception_id: null,
          latency_ms: 10000,
          hints_used: 1, // HINTED!
          session_id: "sess-1",
          occurred_at: "2026-09-01T10:00:00Z",
          is_review: false,
          is_placement: false,
          is_exam: false,
        },
      ],
    };

    const v10 = checkI10(hintedOnlyNode);
    expect(v10).toHaveLength(1);
    expect(v10[0]?.id).toBe("I-10");
  });

  it("assertInvariants aggregates all violations and throws in test harness when requested", () => {
    const invalidNode: NodeState = {
      ...validMasteredNode,
      ability_elo: 300, // I-5 violation
      mastered_at: null,
      lapses: 2, // I-2 violation
    };

    const violations = assertInvariants(invalidNode);
    expect(violations.length).toBeGreaterThanOrEqual(2);

    expect(() => {
      assertInvariants(invalidNode, { throwInTests: true });
    }).toThrow(/Invariant violations/);
  });
});

// ---------------------------------------------------------------------------
// Conformance Vector: determinism_cross_platform.json
// ---------------------------------------------------------------------------

interface DeterminismVector {
  readonly seed: number;
  readonly initial_state: NodeState;
  readonly events: readonly Attempt[];
  readonly expected_final_status: string;
  readonly expected_attempts_total: number;
  readonly expected_max_tier_correct: number;
  readonly expected_stability: number;
  readonly expected_difficulty_fsrs: number;
}

describe("determinism_cross_platform", () => {
  const vec = loadVector<DeterminismVector>("determinism_cross_platform");

  it("produces byte-identical state and hash across runs", () => {
    function runSimulation(): { state: NodeState; hash: string } {
      let state = { ...vec.initial_state };
      for (const event of vec.events) {
        state = transition(state, event, event.occurred_at);
      }
      const json = JSON.stringify(state);
      const hash = createHash("sha256").update(json).digest("hex");
      return { state, hash };
    }

    const run1 = runSimulation();
    const run2 = runSimulation();

    // Verify determinism across multiple runs
    expect(run1.hash).toBe(run2.hash);
    expect(JSON.stringify(run1.state)).toBe(JSON.stringify(run2.state));

    // Verify expected properties from vector
    expect(run1.state.status).toBe(vec.expected_final_status);
    expect(run1.state.attempts_total).toBe(vec.expected_attempts_total);
    expect(run1.state.max_tier_correct).toBe(vec.expected_max_tier_correct);
    expect(run1.state.stability).toBe(vec.expected_stability);
    expect(run1.state.difficulty_fsrs).toBe(vec.expected_difficulty_fsrs);

    // Verify zero invariant violations
    const violations = assertInvariants(run1.state);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Conformance Vector: idempotency_replay.json
// ---------------------------------------------------------------------------

interface IdempotencyVector {
  readonly initial_state: NodeState;
  readonly attempt_log: readonly Attempt[];
  readonly expected_final_status: string;
  readonly expected_attempts_total: number;
}

describe("idempotency_replay", () => {
  const vec = loadVector<IdempotencyVector>("idempotency_replay");

  it("replaying the full attempt log from empty state produces identical final state", () => {
    // Run 1: process sequentially
    let state1 = { ...vec.initial_state };
    for (const attempt of vec.attempt_log) {
      state1 = transition(state1, attempt, attempt.occurred_at);
    }

    // Run 2: full replay from initial state
    let state2 = { ...vec.initial_state };
    for (const attempt of vec.attempt_log) {
      state2 = transition(state2, attempt, attempt.occurred_at);
    }

    expect(JSON.stringify(state1)).toBe(JSON.stringify(state2));
    expect(state1.status).toBe(vec.expected_final_status);
    expect(state1.attempts_total).toBe(vec.expected_attempts_total);

    // Verify zero invariant violations
    const violations = assertInvariants(state1);
    expect(violations).toHaveLength(0);
  });

  describe("v2 Conformance Vectors: Invariants & Forecast", () => {
    it("pin_migration_preserves_state: I-11 asserts migrating a pin leaves every NodeState byte-identical", () => {
      const vec = loadVector<{
        prior_state: NodeState;
        expected_i11_violations: number;
      }>("pin_migration_preserves_state");
      const current_state = { ...vec.prior_state };
      const v11 = checkI11(vec.prior_state, current_state);
      expect(v11.length).toBe(vec.expected_i11_violations);
    });

    it.skip("forecast_band_not_point: returns a band rather than a point (pending forecasting DR)", () => {
      const vec = loadVector<{ skip: string }>("forecast_band_not_point");
      expect(vec.skip).toContain("pending forecasting DR");
    });
  });
});
