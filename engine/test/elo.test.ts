/**
 * engine/test/elo.test.ts
 *
 * Conformance tests for Elo rating system against the six golden vectors from doc 04 §12.
 * Tests are written from the vectors before the implementation (doc 04 §task-2 rule).
 *
 * Covers:
 *   1. node_difficulty_topological.json
 *   2. item_difficulty_node_relative.json
 *   3. ability_seed_from_prerequisites.json
 *   4. ability_seed_secured_by_i1.json
 *   5. elo_cold_start.json
 *   6. elo_convergence.json
 *   7. Guards: latency guard (<1500ms Tier 3), review mode, exam mode, [400, 2800] clamping
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { Attempt, NodeState, SkillGraphLike, SkillNodeSummary } from "../src/state.js";
import {
  nodeDifficultyFromGraph,
  tierOffset,
  itemInitialElo,
  abilitySeed,
  updateElo,
} from "../src/elo.js";
import { checkEloBounds } from "../src/invariants.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

function decimalPlaces(num: number): number {
  const str = num.toString();
  if (!str.includes(".")) return 0;
  return str.split(".")[1]!.length;
}

// ---------------------------------------------------------------------------
// 1. node_difficulty_topological
// ---------------------------------------------------------------------------

describe("node_difficulty_topological", () => {
  interface Vector1 {
    graph: Record<string, SkillNodeSummary>;
    cases: {
      node_id: string;
      expected_level: number;
      expected_difficulty_elo: number;
      notes: string;
    }[];
    cycle_cases: {
      node_id: string;
      expected_error: boolean;
      notes: string;
    }[];
  }

  const vector = loadVector<Vector1>("node_difficulty_topological");

  test("derives node difficulty = 1200 + 25 * topologicalLevel", () => {
    for (const c of vector.cases) {
      const difficulty = nodeDifficultyFromGraph(c.node_id, vector.graph);
      expect(difficulty).toBe(c.expected_difficulty_elo);
    }
  });

  test("detects and throws on prerequisite cycles", () => {
    for (const c of vector.cycle_cases) {
      expect(() => nodeDifficultyFromGraph(c.node_id, vector.graph)).toThrow();
    }
  });
});

// ---------------------------------------------------------------------------
// 2. item_difficulty_node_relative
// ---------------------------------------------------------------------------

describe("item_difficulty_node_relative", () => {
  interface Vector2 {
    tier_offsets: Record<"1" | "2" | "3", number>;
    comparisons: {
      node_id: string;
      node_elo: number;
      items: {
        tier: 1 | 2 | 3;
        expected_offset: number;
        expected_item_elo: number;
      }[];
    }[];
  }

  const vector = loadVector<Vector2>("item_difficulty_node_relative");

  test("tierOffset returns baked constants -285, -115, +20", () => {
    expect(tierOffset(1)).toBe(-285);
    expect(tierOffset(2)).toBe(-115);
    expect(tierOffset(3)).toBe(20);
  });

  test("itemInitialElo computes nodeElo + tierOffset", () => {
    for (const comp of vector.comparisons) {
      for (const it of comp.items) {
        const initialElo = itemInitialElo(comp.node_elo, it.tier);
        expect(initialElo).toBe(it.expected_item_elo);
      }
    }
  });

  test("Tier 1 on deep node is harder than Tier 3 on shallow node", () => {
    const shallowTier3 = itemInitialElo(1200, 3); // 1220
    const deepTier1 = itemInitialElo(1600, 1);    // 1315
    expect(deepTier1).toBeGreaterThan(shallowTier3);
  });
});

// ---------------------------------------------------------------------------
// 3. ability_seed_from_prerequisites
// ---------------------------------------------------------------------------

describe("ability_seed_from_prerequisites", () => {
  interface Vector3 {
    graph: Record<string, SkillNodeSummary>;
    cases: {
      learner_id: string;
      node_id: string;
      prerequisite_states: Record<string, { node_id: string; status: NodeState["status"]; ability_elo: number }>;
      expected_ability_seed: number;
      notes: string;
    }[];
  }

  const vector = loadVector<Vector3>("ability_seed_from_prerequisites");

  test("seeds ability from mean of mastered hard prerequisites, ignoring soft", () => {
    for (const c of vector.cases) {
      const seed = abilitySeed(
        c.learner_id,
        c.node_id,
        c.prerequisite_states as unknown as Record<string, NodeState>,
        vector.graph
      );
      expect(seed).toBe(c.expected_ability_seed);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. ability_seed_secured_by_i1
// ---------------------------------------------------------------------------

describe("ability_seed_secured_by_i1", () => {
  interface Vector4 {
    graph: Record<string, SkillNodeSummary>;
    cases: {
      learner_id: string;
      node_id: string;
      prerequisite_states: Record<string, { node_id: string; status: NodeState["status"]; ability_elo: number }>;
      expected_ability_seed: number;
      notes: string;
    }[];
  }

  const vector = loadVector<Vector4>("ability_seed_secured_by_i1");

  test("includes relearning and needs_review in ability seed, excludes unsecured states", () => {
    for (const c of vector.cases) {
      const seed = abilitySeed(
        c.learner_id,
        c.node_id,
        c.prerequisite_states as unknown as Record<string, NodeState>,
        vector.graph
      );
      expect(seed).toBe(c.expected_ability_seed);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. elo_cold_start
// ---------------------------------------------------------------------------

describe("elo_cold_start", () => {
  interface Vector5 {
    node_elo: number;
    item_response_count: number;
    initial_state: NodeState;
    attempts: Attempt[];
    min_expected_ability_shift: number;
    expected_final_ability_elo: number;
    expected_final_attempts_total: number;
  }

  const vector = loadVector<Vector5>("elo_cold_start");

  test("first 10 attempts move ability by >= 150 points with K=40", () => {
    let state = vector.initial_state;
    for (const att of vector.attempts) {
      state = updateElo(state, att, vector.node_elo, vector.item_response_count);
      // Assert rounding on each intermediate state
      expect(decimalPlaces(state.ability_elo)).toBeLessThanOrEqual(4);
      if (state.difficulty_elo !== undefined) {
        expect(decimalPlaces(state.difficulty_elo)).toBeLessThanOrEqual(4);
      }
    }

    const shift = state.ability_elo - vector.initial_state.ability_elo;
    expect(shift).toBeGreaterThanOrEqual(vector.min_expected_ability_shift);
    expect(state.ability_elo).toBeCloseTo(vector.expected_final_ability_elo, 3);
    expect(state.attempts_total).toBe(vector.expected_final_attempts_total);
  });
});

// ---------------------------------------------------------------------------
// 6. elo_convergence
// ---------------------------------------------------------------------------

describe("elo_convergence", () => {
  interface Vector6 {
    true_ability: number;
    node_elo: number;
    tolerance: number;
    initial_state: NodeState;
    attempts: Attempt[];
    expected_final_ability_elo: number;
    expected_final_attempts_total: number;
  }

  const vector = loadVector<Vector6>("elo_convergence");

  test("200 attempts converge to within +-60 of true ability (1500)", () => {
    let state = vector.initial_state;
    for (const att of vector.attempts) {
      state = updateElo(state, att, vector.node_elo, 0);
      expect(decimalPlaces(state.ability_elo)).toBeLessThanOrEqual(4);
    }

    expect(state.attempts_total).toBe(vector.expected_final_attempts_total);
    const diff = Math.abs(state.ability_elo - vector.true_ability);
    expect(diff).toBeLessThanOrEqual(vector.tolerance);
    expect(state.ability_elo).toBeCloseTo(vector.expected_final_ability_elo, 3);
  });
});

// ---------------------------------------------------------------------------
// 7. Guards, Clamping, and Invariant I-5
// ---------------------------------------------------------------------------

describe("Elo guards and invariant I-5", () => {
  const baseState: NodeState = {
    learner_id: "550e8400-e29b-41d4-a716-446655440000",
    node_id: "MATH.TEST",
    status: "in_progress",
    ability_elo: 1200,
    attempts_total: 15,
    recent_window: [],
    distinct_days: [],
    max_tier_correct: 0,
    mastered_at: null,
    stability: 0,
    difficulty_fsrs: 5,
    due_at: null,
    lapses: 0,
  };

  const makeAttempt = (overrides: Partial<Attempt>): Attempt => ({
    attempt_id: "test-att",
    learner_id: "550e8400-e29b-41d4-a716-446655440000",
    node_id: "MATH.TEST",
    item_id: "test-item",
    difficulty_tier: 2,
    correct: true,
    partial_credit: 1,
    selected_option: "A",
    misconception_id: null,
    latency_ms: 3000,
    hints_used: 0,
    session_id: "sess-01",
    occurred_at: "2026-09-01T10:00:00Z",
    is_review: false,
    is_placement: false,
    is_exam: false,
    ...overrides,
  });

  test("latency guard: Tier 3 with latency < 1500ms excludes item difficulty update", () => {
    const fastAttempt = makeAttempt({
      difficulty_tier: 3,
      latency_ms: 1200, // < 1500ms
      correct: true,
    });
    const updated = updateElo(baseState, fastAttempt, 1200, 10);
    // Initial item elo for Tier 3 = 1200 + 20 = 1220. Item difficulty should NOT change.
    expect(updated.difficulty_elo).toBe(1220);
    // Ability should still update
    expect(updated.ability_elo).not.toBe(1200);
  });

  test("review mode: updates ability at half K", () => {
    const normalAttempt = makeAttempt({ is_review: false });
    const reviewAttempt = makeAttempt({ is_review: true });

    const normalUpdated = updateElo(baseState, normalAttempt, 1200, 10);
    const reviewUpdated = updateElo(baseState, reviewAttempt, 1200, 10);

    const normalDelta = normalUpdated.ability_elo - baseState.ability_elo;
    const reviewDelta = reviewUpdated.ability_elo - baseState.ability_elo;

    expect(reviewDelta).toBeCloseTo(normalDelta / 2, 4);
  });

  test("exam mode: updates ability at half K and does not update item difficulty", () => {
    const examAttempt = makeAttempt({ is_exam: true, difficulty_tier: 2 });
    const updated = updateElo(baseState, examAttempt, 1200, 10);

    const normalAttempt = makeAttempt({ is_exam: false, difficulty_tier: 2 });
    const normalUpdated = updateElo(baseState, normalAttempt, 1200, 10);

    const examDelta = updated.ability_elo - baseState.ability_elo;
    const normalDelta = normalUpdated.ability_elo - baseState.ability_elo;
    expect(examDelta).toBeCloseTo(normalDelta / 2, 4);

    // Initial Tier 2 item Elo = 1200 - 115 = 1085. Item difficulty should NOT change in exam mode.
    expect(updated.difficulty_elo).toBe(1085);
  });

  test("clamping: ratings never exceed [400, 2800]", () => {
    const highState = { ...baseState, ability_elo: 2795 };
    const winAttempt = makeAttempt({ correct: true, hints_used: 0 });
    const updatedHigh = updateElo(highState, winAttempt, 2700, 0);
    expect(updatedHigh.ability_elo).toBeLessThanOrEqual(2800);

    const lowState = { ...baseState, ability_elo: 405 };
    const lossAttempt = makeAttempt({ correct: false, hints_used: 0 });
    const updatedLow = updateElo(lowState, lossAttempt, 1200, 0);
    expect(updatedLow.ability_elo).toBeGreaterThanOrEqual(400);
  });

  test("checkEloBounds throws on out-of-bounds ratings", () => {
    expect(() => checkEloBounds({ ...baseState, ability_elo: 350 })).toThrow();
    expect(() => checkEloBounds({ ...baseState, ability_elo: 2850 })).toThrow();
    expect(() => checkEloBounds({ ...baseState, ability_elo: 1200 })).not.toThrow();
  });

  test.skip("elo_review_no_ability_update: review attempt leaves ability_elo unchanged (pending DR-002)", () => {
    const vector = loadVector<{ skip: string; expected_ability_elo: number }>("elo_review_no_ability_update");
    expect(vector.skip).toContain("pending DR-002");
  });
});
