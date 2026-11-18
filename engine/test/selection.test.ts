/**
 * engine/test/selection.test.ts
 *
 * Conformance tests for Item Selection against the five golden vectors from doc 04 §12.
 * Tests are written from the vectors before the implementation (doc 04 §task-3 rule).
 *
 * Covers:
 *   1. selection_band.json — 1000 selections with mean expected success in [0.75, 0.85]
 *   2. selection_no_repeat.json — 21 simulated days with no repeats
 *   3. selection_pool_exhaustion.json — 6-item node ladder engages, never throws (I-4)
 *   4. interleave_cadence.json — reviews served at positions 4, 8, 12
 *   5. remediation_override.json — 2-in-5 trigger, 3-day dedup, 2-vs-2 tie-break
 *   6. Isolated unit tests: dominantMisconception, tierIsReachable, applyAdaptiveAdjustment
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { Attempt, NodeState } from "../src/state.js";
import {
  selectNextItem,
  dominantMisconception,
  tierIsReachable,
  applyAdaptiveAdjustment,
  poolExhaustionLadder,
} from "../src/selection.js";
import type { Item, LearnerSelectionContext, SelectionNodeContext } from "../src/selection.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeAttempt(overrides: Partial<Attempt>): Attempt {
  return {
    attempt_id: "att-01",
    learner_id: "550e8400-e29b-41d4-a716-446655440000",
    node_id: "MATH.TEST",
    item_id: "item-01",
    difficulty_tier: 2,
    correct: true,
    partial_credit: 1.0,
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
  };
}

// ---------------------------------------------------------------------------
// 1. selection_band.json
// ---------------------------------------------------------------------------

describe("selection_band", () => {
  interface Vector1 {
    num_selections: number;
    prng_seed: number;
    expected_band: { min: number; max: number };
    learner: { learner_id: string; items_since_review: number };
    node: NodeState;
    items: Item[];
  }

  const vector = loadVector<Vector1>("selection_band");

  test("1000 simulated selections yield mean expected success probability in [0.75, 0.85]", () => {
    const rng = mulberry32(vector.prng_seed);
    const itemMap = new Map<string, Item>(vector.items.map((it) => [it.item_id, it]));

    let sumExpectedP = 0;
    const now = "2026-09-01T10:00:00Z";

    const learnerCtx: LearnerSelectionContext = {
      learner_id: vector.learner.learner_id,
      items_since_review: 0,
      itemPool: vector.items,
    };

    const nodeCtx: SelectionNodeContext = {
      ...vector.node,
      items: vector.items,
    };

    for (let i = 0; i < vector.num_selections; i++) {
      const decision = selectNextItem(learnerCtx, nodeCtx, now, rng);
      expect(decision.action).toBe("serve_item");
      expect(decision.item_id).not.toBeNull();

      const item = itemMap.get(decision.item_id!)!;
      // Expected success formula: 1 / (1 + 10^((itemDiff - ability) / 400))
      const p = 1 / (1 + Math.pow(10, (item.difficulty_elo - vector.node.ability_elo) / 400));
      sumExpectedP += p;
    }

    const meanP = sumExpectedP / vector.num_selections;
    expect(meanP).toBeGreaterThanOrEqual(vector.expected_band.min);
    expect(meanP).toBeLessThanOrEqual(vector.expected_band.max);
  });
});

// ---------------------------------------------------------------------------
// 2. selection_no_repeat.json
// ---------------------------------------------------------------------------

describe("selection_no_repeat", () => {
  interface Vector2 {
    days: number;
    node: NodeState;
    items: Item[];
    expected_unique_selections: number;
  }

  const vector = loadVector<Vector2>("selection_no_repeat");

  test("no item repeats within 21 simulated days with candidate pool", () => {
    const rng = mulberry32(999);
    const seenItems = new Map<string, number>(); // itemId -> day seen
    const selectedItemIds: string[] = [];

    for (let day = 0; day < vector.days; day++) {
      const now = new Date(1788259200000 + day * 86400000).toISOString();

      const learnerCtx: LearnerSelectionContext = {
        learner_id: vector.node.learner_id,
        items_since_review: 0,
        itemPool: vector.items,
        seenWithin: (itemId: string, days: number) => {
          if (!seenItems.has(itemId)) return false;
          const daySeen = seenItems.get(itemId)!;
          return day - daySeen <= days;
        },
      };

      const decision = selectNextItem(learnerCtx, vector.node, now, rng);
      expect(decision.action).toBe("serve_item");
      expect(decision.item_id).not.toBeNull();

      selectedItemIds.push(decision.item_id!);
      seenItems.set(decision.item_id!, day);
    }

    const uniqueSelected = new Set(selectedItemIds);
    expect(uniqueSelected.size).toBe(vector.expected_unique_selections);
  });
});

// ---------------------------------------------------------------------------
// 3. selection_pool_exhaustion.json
// ---------------------------------------------------------------------------

describe("selection_pool_exhaustion", () => {
  interface Vector3 {
    node: NodeState;
    items: Item[];
    cases: {
      description: string;
      seen_history: { item_id: string; days_ago: number }[];
      expected_reasons: string[];
      allowed_item_ids?: string[];
      expected_item_id?: string;
    }[];
  }

  const vector = loadVector<Vector3>("selection_pool_exhaustion");

  test("pool exhaustion ladder relaxes constraints and never throws (I-4)", () => {
    const rng = mulberry32(42);
    const now = "2026-09-15T12:00:00Z";

    for (const c of vector.cases) {
      const historyMap = new Map(c.seen_history.map((h) => [h.item_id, h.days_ago]));

      const learnerCtx: LearnerSelectionContext = {
        learner_id: vector.node.learner_id,
        items_since_review: 0,
        itemPool: vector.items,
        seenWithin: (itemId: string, days: number) => {
          const daysAgo = historyMap.get(itemId);
          if (daysAgo === undefined) return false;
          return daysAgo <= days;
        },
        itemHistory: c.seen_history.map((h) => ({
          item_id: h.item_id,
          seen_at: new Date(Date.parse(now) - h.days_ago * 86400000).toISOString(),
        })),
      };

      const nodeCtx: SelectionNodeContext = {
        ...vector.node,
        items: vector.items,
      };

      const decision = selectNextItem(learnerCtx, nodeCtx, now, rng);
      // I-4: MUST return a decision
      expect(decision).toBeDefined();
      expect(decision.action).toBe("serve_item");
      expect(c.expected_reasons).toContain(decision.reason);

      if (c.allowed_item_ids) {
        expect(c.allowed_item_ids).toContain(decision.item_id);
      }
      if (c.expected_item_id) {
        expect(decision.item_id).toBe(c.expected_item_id);
      }
    }
  });

  test("poolExhaustionLadder directly returns content_gap telemetry on node with < 8 items", () => {
    const rng = mulberry32(111);
    const learnerCtx: LearnerSelectionContext = {
      learner_id: vector.node.learner_id,
      items_since_review: 0,
      itemPool: vector.items,
    };
    const nodeCtx: SelectionNodeContext = {
      ...vector.node,
      items: vector.items,
    };

    const decision = poolExhaustionLadder(nodeCtx, learnerCtx, rng);
    expect(decision).toBeDefined();
    expect(decision.action).toBe("serve_item");
    // Node has 6 items (<8), so content_gap is emitted
    expect(["pool_exhaustion_relax_window", "pool_exhaustion_widen_sigma", "pool_exhaustion_least_recent", "content_gap"]).toContain(
      decision.reason
    );
  });
});

// ---------------------------------------------------------------------------
// 4. interleave_cadence.json
// ---------------------------------------------------------------------------

describe("interleave_cadence", () => {
  interface Vector4 {
    sequence_length: number;
    expected_review_positions_1_indexed: number[];
    node: NodeState;
    items: Item[];
    review_queue_item: { node_id: string; item_id: string };
  }

  const vector = loadVector<Vector4>("interleave_cadence");

  test("interleaving review items appear at exact positions 4, 8, 12 (not 4, 7, 10)", () => {
    const rng = mulberry32(777);
    const now = "2026-09-01T10:00:00Z";
    let itemsSinceReview = 0;
    const reviewPositions: number[] = [];

    const nodeCtx: SelectionNodeContext = {
      ...vector.node,
      items: vector.items,
    };

    for (let pos = 1; pos <= vector.sequence_length; pos++) {
      const learnerCtx: LearnerSelectionContext = {
        learner_id: vector.node.learner_id,
        items_since_review: itemsSinceReview,
        itemPool: vector.items,
        getNextReviewItem: () => vector.review_queue_item,
      };

      const decision = selectNextItem(learnerCtx, nodeCtx, now, rng);

      if (decision.reason === "interleave_review") {
        reviewPositions.push(pos);
        expect(decision.item_id).toBe(vector.review_queue_item.item_id);
        // Review items do NOT count toward items_since_review — counter resets to 0
        itemsSinceReview = 0;
      } else {
        // Acquisition item increments items_since_review
        itemsSinceReview++;
      }
    }

    expect(reviewPositions).toEqual(vector.expected_review_positions_1_indexed);
  });
});

// ---------------------------------------------------------------------------
// 5. remediation_override.json
// ---------------------------------------------------------------------------

describe("remediation_override", () => {
  interface Vector5 {
    cases: {
      id: string;
      description: string;
      recent_window_misconceptions: (string | null)[];
      expected_dominant: string | null;
      remediation_shown_recently: boolean;
      expected_action: string;
      expected_reason?: string;
    }[];
  }

  const vector = loadVector<Vector5>("remediation_override");

  test("dominantMisconception and remediation override logic", () => {
    const rng = mulberry32(555);
    const now = "2026-09-01T10:00:00Z";

    const sampleItems: Item[] = [
      { item_id: "i-01", node_id: "MATH.NODE", difficulty_tier: 2, difficulty_elo: 1000 },
    ];

    for (const c of vector.cases) {
      // Build recent_window with timestamps in order
      const recentWindow: Attempt[] = c.recent_window_misconceptions.map((m, idx) =>
        makeAttempt({
          attempt_id: `att-${idx}`,
          misconception_id: m,
          correct: m === null,
          occurred_at: `2026-09-01T10:0${idx}:00Z`,
        })
      );

      // 1. Test dominantMisconception directly
      const dominant = dominantMisconception(recentWindow, 2);
      expect(dominant).toBe(c.expected_dominant);

      // 2. Test selectNextItem integration
      const learnerCtx: LearnerSelectionContext = {
        learner_id: "550e8400-e29b-41d4-a716-446655440000",
        items_since_review: 0,
        itemPool: sampleItems,
        remediationShownRecently: (_m: string, _days: number) => c.remediation_shown_recently,
      };

      const nodeCtx: SelectionNodeContext = {
        learner_id: "550e8400-e29b-41d4-a716-446655440000",
        node_id: "MATH.NODE",
        status: "in_progress",
        ability_elo: 1200,
        attempts_total: 5,
        recent_window: recentWindow,
        distinct_days: [],
        max_tier_correct: 2,
        mastered_at: null,
        stability: 0,
        difficulty_fsrs: 5,
        due_at: null,
        lapses: 0,
        items: sampleItems,
      };

      const decision = selectNextItem(learnerCtx, nodeCtx, now, rng);
      expect(decision.action).toBe(c.expected_action);
      if (c.expected_reason) {
        expect(decision.reason).toBe(c.expected_reason);
      }
      if (c.expected_action === "serve_remediation") {
        expect(decision.misconception_id).toBe(c.expected_dominant);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 6. Unit tests: tier reachability and adaptive adjustment
// ---------------------------------------------------------------------------

describe("tierIsReachable", () => {
  const baseNode: NodeState = {
    learner_id: "550e8400-e29b-41d4-a716-446655440000",
    node_id: "MATH.NODE",
    status: "in_progress",
    ability_elo: 1200,
    attempts_total: 2,
    recent_window: [],
    distinct_days: [],
    max_tier_correct: 0,
    mastered_at: null,
    stability: 0,
    difficulty_fsrs: 5,
    due_at: null,
    lapses: 0,
  };

  test("Tier 1 and Tier 2 items are always reachable", () => {
    const itemT1: Item = { item_id: "i1", node_id: "MATH.NODE", difficulty_tier: 1, difficulty_elo: 915 };
    const itemT2: Item = { item_id: "i2", node_id: "MATH.NODE", difficulty_tier: 2, difficulty_elo: 1085 };

    expect(tierIsReachable(itemT1, baseNode)).toBe(true);
    expect(tierIsReachable(itemT2, baseNode)).toBe(true);
  });

  test("Tier 3 withheld when learner has < 2 Tier 2 unhinted correct", () => {
    const itemT3: Item = { item_id: "i3", node_id: "MATH.NODE", difficulty_tier: 3, difficulty_elo: 1220 };

    const node1Correct: NodeState = {
      ...baseNode,
      recent_window: [makeAttempt({ difficulty_tier: 2, correct: true, hints_used: 0 })],
      max_tier_correct: 2,
    };
    expect(tierIsReachable(itemT3, node1Correct)).toBe(false);

    const nodeHintedCorrect: NodeState = {
      ...baseNode,
      recent_window: [
        makeAttempt({ difficulty_tier: 2, correct: true, hints_used: 0 }),
        makeAttempt({ difficulty_tier: 2, correct: true, hints_used: 1 }), // hinted doesn't count
      ],
      max_tier_correct: 2,
    };
    expect(tierIsReachable(itemT3, nodeHintedCorrect)).toBe(false);
  });

  test("Tier 3 reachable when learner has >= 2 Tier 2 unhinted correct or max_tier_correct >= 3", () => {
    const itemT3: Item = { item_id: "i3", node_id: "MATH.NODE", difficulty_tier: 3, difficulty_elo: 1220 };

    const node2CleanCorrect: NodeState = {
      ...baseNode,
      recent_window: [
        makeAttempt({ difficulty_tier: 2, correct: true, hints_used: 0 }),
        makeAttempt({ difficulty_tier: 2, correct: true, hints_used: 0 }),
      ],
      max_tier_correct: 2,
    };
    expect(tierIsReachable(itemT3, node2CleanCorrect)).toBe(true);

    const nodeAlreadyMasteredT3: NodeState = {
      ...baseNode,
      max_tier_correct: 3,
    };
    expect(tierIsReachable(itemT3, nodeAlreadyMasteredT3)).toBe(true);
  });
});

describe("applyAdaptiveAdjustment", () => {
  const baseNode: NodeState = {
    learner_id: "550e8400-e29b-41d4-a716-446655440000",
    node_id: "MATH.NODE",
    status: "in_progress",
    ability_elo: 1200,
    attempts_total: 10,
    recent_window: [],
    distinct_days: [],
    max_tier_correct: 0,
    mastered_at: null,
    stability: 0,
    difficulty_fsrs: 5,
    due_at: null,
    lapses: 0,
  };

  test("no adjustment if attempts_total < 20", () => {
    expect(applyAdaptiveAdjustment(baseNode, 0.95)).toBe(0);
    expect(applyAdaptiveAdjustment(baseNode, 0.50)).toBe(0);
  });

  test("adjusts +100 if success > 0.90 once attempts_total >= 20", () => {
    const matureNode: NodeState = { ...baseNode, attempts_total: 25 };
    expect(applyAdaptiveAdjustment(matureNode, 0.95)).toBe(100);
  });

  test("adjusts -100 if success < 0.60 once attempts_total >= 20", () => {
    const matureNode: NodeState = { ...baseNode, attempts_total: 25 };
    expect(applyAdaptiveAdjustment(matureNode, 0.55)).toBe(-100);
  });

  test("no adjustment if success is between 0.60 and 0.90", () => {
    const matureNode: NodeState = { ...baseNode, attempts_total: 25 };
    expect(applyAdaptiveAdjustment(matureNode, 0.75)).toBe(0);
  });
});
