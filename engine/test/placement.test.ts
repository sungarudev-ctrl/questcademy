/**
 * engine/test/placement.test.ts
 *
 * Conformance tests for the Placement algorithm against the four golden vectors from doc 04 §12.
 * Tests are written from the vectors before the implementation (doc 04 §task-4 rule).
 *
 * Covers:
 *   1. placement_low_ability.json — P4 learner in JSS2 context placed at P4 within <= 20 items
 *   2. placement_high_ability.json — above-grade learner placed at frontier above entry hint
 *   3. placement_resume.json — sequence run twice (uninterrupted vs. interrupted at item 9 and resumed),
 *      asserting identical final state and SHA-256 hash
 *   4. availability_provisional_mastery.json — provisional mastery (mastered_at = null) unlocks dependants
 *      under I-1; demoting to 'available' re-locks them
 *   5. Unit tests for step API boundaries (2/3 floor, convergence, bracket seeding, frontier derivation)
 */

import { readFileSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import type { NodeState, PlacementState, PlacementResult, ProbeResult } from "../src/state.js";
import { checkI1, assertInvariants } from "../src/invariants.js";
import {
  initPlacementState,
  nextProbeDepth,
  recordProbeResult,
  finalizePlacement,
  backfillPrerequisites,
  seedStateFromEvidence,
  place,
  depthForGrade,
  eloFromEvidence,
} from "../src/placement.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

function sha256(obj: unknown): string {
  const str = JSON.stringify(obj);
  return createHash("sha256").update(str).digest("hex");
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

// ---------------------------------------------------------------------------
// 1. placement_low_ability.json
// ---------------------------------------------------------------------------

describe("1. placement_low_ability.json (P4 learner in JSS2 context)", () => {
  interface LowAbilityVector {
    learner_id: string;
    subject: string;
    entry_grade_hint: string;
    hint_depth: number;
    graph: Record<string, { node_id: string; depth: number; prerequisites: { node_id: string; type: "hard" | "soft" }[] }>;
    expected_initial_bracket: { lo: number; hi: number };
    probes: { node_id: string; depth: number; correct: boolean }[];
    expected_final_state: {
      items_used: number;
      converged: boolean;
      widened: boolean;
      frontier_depth: number;
      lo: number;
      hi: number;
    };
    expected_frontier: { depth: number; grade_level: string; nodes: string[] };
  }

  it("places a simulated P4-level learner in JSS2 context at P4 within 20 items", () => {
    const vec = loadVector<LowAbilityVector>("placement_low_ability");

    let state = initPlacementState(vec.learner_id, vec.subject, vec.entry_grade_hint, vec.graph);

    // Initial bracket is seeded +-10 around JSS2 (24) -> [14, 30]
    expect(state.lo).toBe(vec.expected_initial_bracket.lo);
    expect(state.hi).toBe(vec.expected_initial_bracket.hi);
    expect(state.hint_depth).toBe(vec.hint_depth);

    // Process probe sequence
    for (const p of vec.probes) {
      if (state.items_used >= 20) break;
      const expectedDepth = nextProbeDepth(state);
      expect(expectedDepth).not.toBeNull();
      state = recordProbeResult(state, p.node_id, p.correct, p.depth);
    }

    // Assert search converged
    expect(nextProbeDepth(state)).toBeNull();
    expect(state.items_used).toBeLessThanOrEqual(20);
    expect(state.items_used).toBe(vec.expected_final_state.items_used);
    expect(state.converged).toBe(vec.expected_final_state.converged);
    expect(state.widened).toBe(vec.expected_final_state.widened);
    expect(state.lo).toBe(vec.expected_final_state.lo);
    expect(state.hi).toBe(vec.expected_final_state.hi);

    // Finalize placement
    const result = finalizePlacement(state, vec.graph);
    expect(result.frontier_depth).toBe(vec.expected_frontier.depth);
    expect(result.frontier_nodes).toEqual(expect.arrayContaining(vec.expected_frontier.nodes));
    expect(result.items_used).toBeLessThanOrEqual(20);
  });
});

// ---------------------------------------------------------------------------
// 2. placement_high_ability.json
// ---------------------------------------------------------------------------

describe("2. placement_high_ability.json (above-grade learner)", () => {
  interface HighAbilityVector {
    learner_id: string;
    subject: string;
    entry_grade_hint: string;
    hint_depth: number;
    graph: Record<string, { node_id: string; depth: number; prerequisites: { node_id: string; type: "hard" | "soft" }[] }>;
    expected_initial_bracket: { lo: number; hi: number };
    probes: { node_id: string; depth: number; correct: boolean }[];
    expected_final_state: {
      items_used: number;
      converged: boolean;
      widened: boolean;
      frontier_depth: number;
      lo: number;
      hi: number;
    };
    expected_frontier: { depth: number; nodes: string[] };
  }

  it("places an above-grade learner at a frontier strictly above the entry hint", () => {
    const vec = loadVector<HighAbilityVector>("placement_high_ability");

    let state = initPlacementState(vec.learner_id, vec.subject, vec.entry_grade_hint, vec.graph);

    expect(state.lo).toBe(vec.expected_initial_bracket.lo);
    expect(state.hi).toBe(vec.expected_initial_bracket.hi);

    for (const p of vec.probes) {
      if (state.items_used >= 20 || (state.hi - state.lo <= 1)) break;
      const targetDepth = nextProbeDepth(state);
      expect(targetDepth).not.toBeNull();
      state = recordProbeResult(state, p.node_id, p.correct, p.depth);
    }

    expect(nextProbeDepth(state)).toBeNull();
    expect(state.items_used).toBeLessThanOrEqual(20);
    expect(state.lo).toBe(vec.expected_final_state.lo);
    expect(state.hi).toBe(vec.expected_final_state.hi);

    const result = finalizePlacement(state, vec.graph);
    expect(result.frontier_depth).toBe(vec.expected_frontier.depth);
    expect(result.frontier_depth).toBeGreaterThan(vec.hint_depth);
    expect(result.frontier_nodes).toEqual(expect.arrayContaining(vec.expected_frontier.nodes));
  });
});

// ---------------------------------------------------------------------------
// 3. placement_resume.json
// ---------------------------------------------------------------------------

describe("3. placement_resume.json (interrupt and resume equivalence)", () => {
  interface ResumeVector {
    learner_id: string;
    subject: string;
    entry_grade_hint: number;
    hint_depth: number;
    graph: Record<string, { node_id: string; depth: number; prerequisites: { node_id: string; type: "hard" | "soft" }[] }>;
    probes: { node_id: string; depth: number; correct: boolean }[];
    expected_state_after_item_9: {
      items_used: number;
      lo: number;
      hi: number;
      evidence: Record<string, { correct: number; total: number; rate: number }>;
    };
    expected_final_state: {
      items_used: number;
      lo: number;
      hi: number;
      converged: boolean;
      frontier_depth: number;
      evidence: Record<string, { correct: number; total: number; rate: number }>;
    };
  }

  it("produces identical final state whether run uninterrupted or interrupted at item 9 and resumed", () => {
    const vec = loadVector<ResumeVector>("placement_resume");

    // Run 1: Uninterrupted to completion
    let state1 = initPlacementState(vec.learner_id, vec.subject, vec.entry_grade_hint, vec.graph);
    for (const p of vec.probes) {
      state1 = recordProbeResult(state1, p.node_id, p.correct, p.depth);
    }
    expect(state1.items_used).toBe(15);
    expect(state1.converged).toBe(true);
    expect(state1.lo).toBe(vec.expected_final_state.lo);
    expect(state1.hi).toBe(vec.expected_final_state.hi);

    // Run 2: Interrupted after item 9
    let state2 = initPlacementState(vec.learner_id, vec.subject, vec.entry_grade_hint, vec.graph);
    for (let i = 0; i < 9; i++) {
      const p = vec.probes[i]!;
      state2 = recordProbeResult(state2, p.node_id, p.correct, p.depth);
    }

    // Verify state after item 9 matches expected vector
    expect(state2.items_used).toBe(9);
    expect(state2.lo).toBe(vec.expected_state_after_item_9.lo);
    expect(state2.hi).toBe(vec.expected_state_after_item_9.hi);
    for (const [nodeId, expectedEv] of Object.entries(vec.expected_state_after_item_9.evidence)) {
      expect(state2.evidence[nodeId]?.correct).toBe(expectedEv.correct);
      expect(state2.evidence[nodeId]?.total).toBe(expectedEv.total);
      expect(state2.evidence[nodeId]?.rate).toBe(expectedEv.rate);
    }

    // Simulate serialization to storage mid-placement and restoration on resume
    const serialized = JSON.stringify(state2);
    const restoredState: PlacementState = JSON.parse(serialized);

    // Resume remaining items (10 to 15)
    let resumedState = restoredState;
    for (let i = 9; i < vec.probes.length; i++) {
      const p = vec.probes[i]!;
      resumedState = recordProbeResult(resumedState, p.node_id, p.correct, p.depth);
    }

    // Assert final states are byte-identical and have identical hashes
    expect(resumedState.items_used).toBe(state1.items_used);
    expect(resumedState.lo).toBe(state1.lo);
    expect(resumedState.hi).toBe(state1.hi);
    expect(resumedState.converged).toBe(state1.converged);
    expect(resumedState.frontier_depth).toBe(state1.frontier_depth);
    expect(resumedState.evidence).toEqual(state1.evidence);
    expect(resumedState.history).toEqual(state1.history);

    const hash1 = sha256(state1);
    const hash2 = sha256(resumedState);
    expect(hash1).toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// 4. availability_provisional_mastery.json
// ---------------------------------------------------------------------------

describe("4. availability_provisional_mastery.json (I-1, I-2 provisional mastery)", () => {
  interface AvailabilityVector {
    graph: Record<string, { node_id: string; depth: number; prerequisites: { node_id: string; type: "hard" | "soft" }[] }>;
    cases: {
      name: string;
      node_a: NodeState;
      node_b: NodeState;
      expected_i2_violation_node_a: unknown | null;
      expected_i1_violation_node_b: { id: string; expected_substring: string } | null;
      expected_node_b_unlocked: boolean;
    }[];
    seeding_case: {
      frontier: string[];
      evidence: Record<string, { correct: number; total: number; rate: number }>;
      expected_provisionally_mastered_nodes: string[];
      expected_mastered_at: null;
    };
  }

  it("unlocks dependants when prerequisite is provisionally mastered and re-locks upon demotion", () => {
    const vec = loadVector<AvailabilityVector>("availability_provisional_mastery");

    // Case 1: Node A has provisional mastery (status: mastered, mastered_at: null)
    const case1 = vec.cases[0]!;
    const violationsA1 = assertInvariants(case1.node_a);
    expect(violationsA1).toHaveLength(0); // Provisional mastery (mastered_at = null) does not violate I-2

    const i1CheckCase1 = checkI1(case1.node_b, [case1.node_a.status]);
    expect(i1CheckCase1).toHaveLength(0); // Node B is unlocked!

    // Case 2: Node A fails review and drops to available per §7.1
    const case2 = vec.cases[1]!;
    const i1CheckCase2 = checkI1(case2.node_b, [case2.node_a.status]);
    expect(i1CheckCase2).toHaveLength(1);
    expect(i1CheckCase2[0]?.id).toBe("I-1");
    expect(i1CheckCase2[0]?.description).toContain("must be mastered/needs_review/relearning");

    // Seeding case: seedStateFromEvidence with propagateMasteryDown
    const stateUpdate = seedStateFromEvidence(
      vec.seeding_case.evidence,
      vec.seeding_case.frontier,
      vec.graph
    );

    for (const expectedNodeId of vec.seeding_case.expected_provisionally_mastered_nodes) {
      const seeded = stateUpdate.node_states[expectedNodeId];
      expect(seeded).toBeDefined();
      expect(seeded?.status).toBe("mastered");
      expect(seeded?.mastered_at).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Unit & Boundary Tests
// ---------------------------------------------------------------------------

describe("5. Step API Boundaries and Invariants", () => {
  const dummyGraph = {
    A: { node_id: "A", depth: 0, prerequisites: [] },
    B: { node_id: "B", depth: 5, prerequisites: [{ node_id: "A", type: "hard" as const }] },
    C: { node_id: "C", depth: 10, prerequisites: [{ node_id: "B", type: "hard" as const }] },
    D: { node_id: "D", depth: 20, prerequisites: [{ node_id: "C", type: "hard" as const }] },
  };

  it("seeds initial bracket at +-10 around hint and does not seed full graph", () => {
    const state = initPlacementState("learner-1", "math", 12, dummyGraph);
    expect(state.lo).toBe(2); // 12 - 10 = 2 >= 0
    expect(state.hi).toBe(20); // min(20, 12 + 10) = 20
    expect(state.items_used).toBe(0);
    expect(state.converged).toBe(false);
  });

  it("advances lo on exactly 2/3 correct (rate >= 2.0/3.0 boundary test)", () => {
    let state = initPlacementState("learner-1", "math", 12, dummyGraph);
    const depth = nextProbeDepth(state)!;

    // 2 correct, 1 incorrect = exactly 2/3
    state = recordProbeResult(state, "item1", true, depth);
    state = recordProbeResult(state, "item2", true, depth);
    state = recordProbeResult(state, "item3", false, depth);

    expect(state.lo).toBe(depth); // Exactly 2/3 advances lo!
  });

  it("advances hi on exactly 1/3 correct (rate <= 1.0/3.0 boundary test)", () => {
    let state = initPlacementState("learner-1", "math", 12, dummyGraph);
    const initialLo = state.lo;
    const depth = nextProbeDepth(state)!;

    // 1 correct, 2 incorrect = exactly 1/3
    state = recordProbeResult(state, "item1", false, depth);
    state = recordProbeResult(state, "item2", false, depth);
    state = recordProbeResult(state, "item3", true, depth);

    expect(state.hi).toBe(depth);
    expect(state.lo).toBe(initialLo);
  });

  it("nextProbeDepth returns null when hi - lo <= 1", () => {
    let state = initPlacementState("learner-1", "math", 12, dummyGraph);
    // Artificially set hi - lo <= 1
    state = { ...state, lo: 10, hi: 11 };
    expect(nextProbeDepth(state)).toBeNull();
  });

  it("nextProbeDepth returns null when items_used >= 20", () => {
    let state = initPlacementState("learner-1", "math", 12, dummyGraph);
    state = { ...state, items_used: 20 };
    expect(nextProbeDepth(state)).toBeNull();
  });

  it("finalizePlacement uses state.lo as frontier, not a failed probeDepth", () => {
    let state = initPlacementState("learner-1", "math", 10, dummyGraph);
    state = { ...state, lo: 8, hi: 9, items_used: 18, converged: true };

    const result = finalizePlacement(state, dummyGraph);
    expect(result.frontier_depth).toBe(8); // Must be state.lo (confirmed floor)
  });

  it("backfillPrerequisites verifies unverified prerequisites up to 25 items cap", () => {
    let state = initPlacementState("learner-1", "math", 10, dummyGraph);
    state = { ...state, lo: 10, hi: 11, items_used: 19, converged: true };

    // C at depth 10 has prerequisites B (depth 5) and A (depth 0)
    let administeredCount = 0;
    const administeredNodes: string[] = [];
    state = backfillPrerequisites(state, ["C"], dummyGraph, (nodeId) => {
      administeredCount++;
      administeredNodes.push(nodeId);
      return true;
    });

    expect(administeredCount).toBe(2);
    expect(state.items_used).toBe(21); // 19 + 2 = 21 <= 25
    expect(administeredNodes).toContain("A");
    expect(administeredNodes).toContain("B");
  });

  it("place convenience wrapper drives placement to completion", () => {
    const rng = mulberry32(42);
    const result = place(
      {
        learner_id: "learner-convenience",
        true_ability: 1400,
      },
      "math",
      10,
      rng,
      { graph: dummyGraph }
    );

    expect(result.frontier_depth).toBeDefined();
    expect(result.items_used).toBeLessThanOrEqual(25);
    expect(result.state_update).toBeDefined();
  });

  describe("v2 Conformance Vectors: Placement", () => {
    it("placement_graph_floor: learner below graph minimum depth => at_graph_floor = true", () => {
      const v = loadVector<{
        learner_id: string;
        subject: string;
        entry_grade_hint: string;
        graph_min_depth: number;
        frontier_depth: number;
        expected_at_graph_floor: boolean;
      }>("placement_graph_floor");

      const state: import("../src/state.js").PlacementState = {
        learner_id: v.learner_id,
        subject: v.subject,
        entry_grade_hint: v.entry_grade_hint,
        hint_depth: 0,
        lo: v.frontier_depth,
        hi: 1,
        initial_lo: 0,
        initial_hi: 10,
        graph_min_depth: v.graph_min_depth,
        graph_max_depth: 30,
        current_probe_depth: null,
        current_depth_probes: [],
        items_used: 12,
        evidence: {},
        history: [],
        widened: false,
        converged: true,
        frontier_depth: v.frontier_depth,
      };

      const res = finalizePlacement(state, {});
      expect(res.at_graph_floor).toBe(v.expected_at_graph_floor);
    });

    it.skip("placement_propagates_prerequisites: propagates mastery down (pending DR-001)", () => {
      const v = loadVector<{ skip: string }>("placement_propagates_prerequisites");
      expect(v.skip).toContain("pending DR-001");
    });
  });
});
