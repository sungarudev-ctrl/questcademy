/**
 * engine/test/statemachine.test.ts
 *
 * Conformance tests for node state machine transitions and availability checks.
 * Source of truth: docs/04-learning-engine-spec.md §3, §11 (I-1), §12.
 */

import { readFileSync } from "fs";
import { join } from "path";
import type {
  NodeState,
  NodeStatus,
  Attempt,
  SkillNodeSummary,
} from "../src/state.js";
import {
  checkAvailability,
  computeAvailableNodes,
  computeFrontierNodes,
  transition,
} from "../src/statemachine.js";

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

// ---------------------------------------------------------------------------
// 1. availability_hard_prerequisite_gates
// ---------------------------------------------------------------------------

interface HardPrereqVector {
  readonly graph: Record<string, SkillNodeSummary>;
  readonly cases: readonly {
    readonly name: string;
    readonly node_id: string;
    readonly prerequisite_states: Record<string, NodeState>;
    readonly expected_available: boolean;
  }[];
}

describe("availability_hard_prerequisite_gates", () => {
  const vec = loadVector<HardPrereqVector>("availability_hard_prerequisite_gates");

  for (const c of vec.cases) {
    it(`handles case: ${c.name}`, () => {
      const node = vec.graph[c.node_id]!;
      const available = checkAvailability(node, c.prerequisite_states);
      expect(available).toBe(c.expected_available);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. availability_chain_unlocks
// ---------------------------------------------------------------------------

interface ChainUnlocksVector {
  readonly graph: Record<string, SkillNodeSummary>;
  readonly stages: readonly {
    readonly stage: number;
    readonly states: Record<string, NodeState>;
    readonly expected_available: readonly string[];
    readonly expected_secured: readonly string[];
    readonly expected_frontier: readonly string[];
  }[];
}

describe("availability_chain_unlocks", () => {
  const vec = loadVector<ChainUnlocksVector>("availability_chain_unlocks");

  for (const st of vec.stages) {
    it(`stage ${st.stage}: available and frontier sets match spec`, () => {
      const available = computeAvailableNodes(vec.graph, st.states);
      expect(available).toEqual(st.expected_available);

      const frontier = computeFrontierNodes(vec.graph, st.states);
      expect(frontier).toEqual(st.expected_frontier);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. availability_soft_never_gates
// ---------------------------------------------------------------------------

interface SoftNeverGatesVector {
  readonly graph: Record<string, SkillNodeSummary>;
  readonly cases: readonly {
    readonly name: string;
    readonly target_node_id: string;
    readonly prerequisite_states: Record<string, NodeState>;
    readonly expected_available: boolean;
  }[];
}

describe("availability_soft_never_gates", () => {
  const vec = loadVector<SoftNeverGatesVector>("availability_soft_never_gates");

  for (const c of vec.cases) {
    it(`handles soft prerequisite case: ${c.name}`, () => {
      const node = vec.graph[c.target_node_id]!;
      const available = checkAvailability(node, c.prerequisite_states);
      expect(available).toBe(c.expected_available);
    });
  }
});

// ---------------------------------------------------------------------------
// 4. availability_review_states_satisfy
// ---------------------------------------------------------------------------

interface ReviewStatesSatisfyVector {
  readonly graph: Record<string, SkillNodeSummary>;
  readonly cases: readonly {
    readonly parent_status: NodeStatus;
    readonly expected_satisfies: boolean;
    readonly expected_child_available: boolean;
  }[];
}

describe("availability_review_states_satisfy", () => {
  const vec = loadVector<ReviewStatesSatisfyVector>("availability_review_states_satisfy");

  for (const c of vec.cases) {
    it(`status '${c.parent_status}' satisfies hard prereq: ${c.expected_satisfies}`, () => {
      const childNode = vec.graph["CHILD_NODE"]!;
      const parentState: NodeState = {
        learner_id: "learn-rev-test",
        node_id: "PARENT_NODE",
        status: c.parent_status,
        ability_elo: 1250,
        attempts_total: 5,
        recent_window: [],
        distinct_days: ["2026-09-01", "2026-09-03"],
        max_tier_correct: 3,
        mastered_at: c.parent_status === "locked" || c.parent_status === "available" || c.parent_status === "in_progress" ? null : "2026-09-03T10:00:00Z",
        stability: 3.0,
        difficulty_fsrs: 5.0,
        due_at: null,
        lapses: 0,
      };

      const states: Record<string, NodeState> = {
        PARENT_NODE: parentState,
      };

      const available = checkAvailability(childNode, states);
      expect(available).toBe(c.expected_child_available);
    });
  }
});

// ---------------------------------------------------------------------------
// 5. Pure Transition Unit Tests per doc 04 §3
// ---------------------------------------------------------------------------

describe("transition function", () => {
  const baseNode: NodeState = {
    learner_id: "learn-trans",
    node_id: "MATH.ADD",
    status: "locked",
    ability_elo: 1200,
    difficulty_elo: 1200,
    attempts_total: 0,
    recent_window: [],
    distinct_days: [],
    max_tier_correct: 0,
    mastered_at: null,
    stability: 3.0,
    difficulty_fsrs: 5.0,
    due_at: null,
    lapses: 0,
  };

  it("locked -> available on unlock event when hard prerequisites are secured", () => {
    const unlocked = transition(baseNode, { type: "unlock", hardPrerequisiteStatuses: ["mastered"] }, "2026-09-15T10:00:00Z");
    expect(unlocked.status).toBe("available");

    // Fails to unlock if hard prerequisite is in_progress
    const stillLocked = transition(baseNode, { type: "unlock", hardPrerequisiteStatuses: ["in_progress"] }, "2026-09-15T10:00:00Z");
    expect(stillLocked.status).toBe("locked");
  });

  it("available -> in_progress on first non-placement attempt", () => {
    const availNode: NodeState = { ...baseNode, status: "available" };
    const attempt: Attempt = {
      attempt_id: "att-1",
      learner_id: "learn-trans",
      node_id: "MATH.ADD",
      item_id: "item-1",
      difficulty_tier: 1,
      correct: false,
      partial_credit: 0,
      selected_option: "B",
      misconception_id: null,
      latency_ms: 10000,
      hints_used: 0,
      session_id: "sess-1",
      occurred_at: "2026-09-15T10:00:00Z",
      is_review: false,
      is_placement: false,
      is_exam: false,
    };

    const inProg = transition(availNode, attempt, "2026-09-15T10:00:00Z");
    expect(inProg.status).toBe("in_progress");
    expect(inProg.attempts_total).toBe(1);
    expect(inProg.recent_window).toHaveLength(1);
  });

  it("mastered -> needs_review when now >= due_at on check_due", () => {
    const masteredNode: NodeState = {
      ...baseNode,
      status: "mastered",
      mastered_at: "2026-09-10T10:00:00Z",
      due_at: "2026-09-13T10:00:00Z",
    };

    // Before due
    const notDue = transition(masteredNode, { type: "check_due" }, "2026-09-12T10:00:00Z");
    expect(notDue.status).toBe("mastered");

    // At/after due
    const isDue = transition(masteredNode, { type: "check_due" }, "2026-09-13T10:00:00Z");
    expect(isDue.status).toBe("needs_review");
  });

  it("placement_override demotes any status to available", () => {
    const masteredNode: NodeState = {
      ...baseNode,
      status: "mastered",
      mastered_at: "2026-09-10T10:00:00Z",
    };

    const demoted = transition(masteredNode, { type: "placement_override" }, "2026-09-15T10:00:00Z");
    expect(demoted.status).toBe("available");
  });
});
