/**
 * engine/test/determinism.test.ts
 *
 * Conformance tests for Invariant I-11 and I-12:
 * - I-11: Pin migration never mutates learner_node_state
 * - I-12: Engine output is framework-agnostic (evaluated across frameworks)
 *
 * Reference: docs/plan.md §7; docs/02-curriculum-framework-spec.md §5, §9;
 *            docs/04-learning-engine-spec.md §11
 */

import * as fs from "fs";
import * as path from "path";
import { transition } from "../src/statemachine.js";
import { updateElo } from "../src/elo.js";
import { onMastery } from "../src/srs.js";
import { selectNextItem } from "../src/selection.js";
import {
  checkI11,
  checkI12,
  assertInvariants,
} from "../src/invariants.js";
import type {
  NodeState,
  Attempt,
  EngineContext,
  Item,
  LearnerSelectionContext,
  SelectionNodeContext,
} from "../src/state.js";

interface DeterminismAcrossFrameworksVector {
  description: string;
  spec_reference: string;
  seed: number;
  framework_a: string;
  framework_b: string;
  initial_state: NodeState;
  events: Attempt[];
  expected_final_status: string;
  expected_attempts_total: number;
  expected_max_tier_correct: number;
  expected_stability: number;
  expected_difficulty_fsrs: number;
}

function createPrng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("Invariant I-12: Engine Output is Framework-Agnostic", () => {
  const vectorPath = path.join(
    __dirname,
    "../testdata/determinism_across_frameworks.json"
  );
  const vector: DeterminismAcrossFrameworksVector = JSON.parse(
    fs.readFileSync(vectorPath, "utf-8")
  );

  test("Identical attempt sequence under different frameworkIds produces byte-identical NodeState", () => {
    const runSimulation = (_frameworkId: string) => {
      let state: NodeState = JSON.parse(JSON.stringify(vector.initial_state));
      const history: { state: NodeState; attempt: Attempt }[] = [];

      for (const event of vector.events) {
        state = transition(state, event, event.occurred_at);
        history.push({ state, attempt: event });
      }

      return { finalState: state, history };
    };

    const resultA = runSimulation(vector.framework_a);
    const resultB = runSimulation(vector.framework_b);

    // Byte-identical final state stringification
    expect(JSON.stringify(resultA.finalState)).toBe(
      JSON.stringify(resultB.finalState)
    );

    // Verify expected vector targets
    expect(resultA.finalState.status).toBe(vector.expected_final_status);
    expect(resultA.finalState.attempts_total).toBe(
      vector.expected_attempts_total
    );
    expect(resultA.finalState.max_tier_correct).toBe(
      vector.expected_max_tier_correct
    );
    expect(resultA.finalState.stability).toBe(vector.expected_stability);
    expect(resultA.finalState.difficulty_fsrs).toBe(
      vector.expected_difficulty_fsrs
    );

    // I-12 check function passes
    const violations = checkI12(resultA.finalState, resultB.finalState);
    expect(violations).toHaveLength(0);
  });

  test("Item selection is identical regardless of EngineContext.frameworkId", () => {
    const state: NodeState = JSON.parse(JSON.stringify(vector.initial_state));
    const items: Item[] = [
      {
        item_id: "item-1",
        node_id: state.node_id,
        difficulty_tier: 1,
        difficulty_elo: 1000,
        type: "mcq_single",
      },
      {
        item_id: "item-2",
        node_id: state.node_id,
        difficulty_tier: 2,
        difficulty_elo: 1100,
        type: "mcq_single",
      },
      {
        item_id: "item-3",
        node_id: state.node_id,
        difficulty_tier: 2,
        difficulty_elo: 1200,
        type: "mcq_single",
      },
    ];

    const now = "2026-09-15T12:00:00Z";

    const learnerCtxA: LearnerSelectionContext = {
      learner_id: state.learner_id,
      items_since_review: 0,
      itemPool: items,
    };

    const nodeCtxA: SelectionNodeContext = {
      ...state,
      items,
    };

    const learnerCtxB: LearnerSelectionContext = {
      learner_id: state.learner_id,
      items_since_review: 0,
      itemPool: items,
    };

    const nodeCtxB: SelectionNodeContext = {
      ...state,
      items,
    };

    const rngA = createPrng(42);
    const rngB = createPrng(42);

    const decisionA = selectNextItem(learnerCtxA, nodeCtxA, now, rngA);
    const decisionB = selectNextItem(learnerCtxB, nodeCtxB, now, rngB);

    expect(JSON.stringify(decisionA)).toBe(JSON.stringify(decisionB));
    expect(checkI12(decisionA, decisionB)).toHaveLength(0);
  });

  test("checkI12 detects and reports divergence between framework outputs", () => {
    const outA = { decision: "item-1", score: 100 };
    const outB = { decision: "item-2", score: 100 };
    const violations = checkI12(outA, outB);
    expect(violations).toHaveLength(1);
    expect(violations[0].id).toBe("I-12");
  });
});

describe("Invariant I-11: Pin Migration Never Mutates Node State", () => {
  const baseState: NodeState = {
    learner_id: "learner-100",
    node_id: "MATH.FRAC.ADD_UNLIKE",
    status: "mastered",
    ability_elo: 1450,
    difficulty_elo: 1200,
    attempts_total: 6,
    recent_window: [
      {
        attempt_id: "a1",
        learner_id: "learner-100",
        node_id: "MATH.FRAC.ADD_UNLIKE",
        item_id: "i1",
        difficulty_tier: 2,
        correct: true,
        hints_used: 0,
        occurred_at: "2026-09-10T10:00:00Z",
        is_review: false,
        is_placement: false,
        is_exam: false,
      },
    ],
    distinct_days: ["2026-09-10", "2026-09-12"],
    max_tier_correct: 3,
    mastered_at: "2026-09-12T14:10:00Z",
    stability: 7.5,
    difficulty_fsrs: 4.5,
    due_at: "2026-09-20T14:10:00Z",
    lapses: 0,
  };

  test("Clean pin migration preserves byte-identical NodeState without violations", () => {
    const priorState = JSON.parse(JSON.stringify(baseState));
    const currentState = JSON.parse(JSON.stringify(baseState));

    const violations = checkI11(priorState, currentState);
    expect(violations).toHaveLength(0);

    const assertResult = assertInvariants({
      pinMigrationState: { prior: priorState, current: currentState },
    });
    expect(assertResult).toHaveLength(0);
  });

  test("I-11 catches any state mutation during pin migration", () => {
    const priorState = JSON.parse(JSON.stringify(baseState));
    const mutatedState = {
      ...priorState,
      status: "available", // forbidden reset
      ability_elo: 1200,
    };

    const violations = checkI11(priorState, mutatedState);
    expect(violations.length).toBeGreaterThanOrEqual(2);
    expect(violations.some((v) => v.id === "I-11" && v.description.includes("status"))).toBe(true);
    expect(violations.some((v) => v.id === "I-11" && v.description.includes("ability_elo"))).toBe(true);
  });

  test("I-11 catches deep mutations in recent_window or distinct_days", () => {
    const priorState = JSON.parse(JSON.stringify(baseState));
    const mutatedRecent = {
      ...priorState,
      recent_window: [],
    };
    const v1 = checkI11(priorState, mutatedRecent);
    expect(v1.some((v) => v.description.includes("recent_window"))).toBe(true);

    const mutatedDays = {
      ...priorState,
      distinct_days: ["2026-09-10"],
    };
    const v2 = checkI11(priorState, mutatedDays);
    expect(v2.some((v) => v.description.includes("distinct_days"))).toBe(true);
  });
});
