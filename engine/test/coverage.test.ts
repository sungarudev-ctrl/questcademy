/**
 * engine/test/coverage.test.ts
 *
 * Targeted tests for 100% branch, statement, function, and line coverage across all engine modules.
 */

import {
  resolveGraphNode,
  resolveNodeState,
  type SkillNodeSummary,
  type NodeState,
  type Attempt,
} from "../src/state.js";
import {
  shouldEscalate,
  escalateToTutor,
} from "../src/escalation.js";
import {
  abilitySeed,
  updateElo,
  ELO_BASE,
} from "../src/elo.js";
import {
  isMastered,
  calendarDaySpan,
} from "../src/mastery.js";
import {
  depthForGrade,
  getNodeDepth,
  getGraphMinMaxDepth,
  recordProbeResult,
  backfillPrerequisites,
  place,
  initPlacementState,
  nextProbeDepth,
  eloFromEvidence,
  propagateMasteryDown,
} from "../src/placement.js";
import {
  selectNextItem,
  applyAdaptiveAdjustment,
  poolExhaustionLadder,
  dominantMisconception,
  isSeenWithin,
  getLastSeenTimestamp,
  weightedSample,
} from "../src/selection.js";
import {
  examCompression,
  onReview,
  buildReviewQueue,
  extractNodeStates,
} from "../src/srs.js";
import {
  assertInvariants,
  roundElo,
  checkI1,
  checkI2,
  checkI3,
  checkI4,
  checkI5,
  checkI6,
  checkI7,
  checkI10,
} from "../src/invariants.js";
import {
  computeAvailableNodes,
  computeFrontierNodes,
  transition,
} from "../src/statemachine.js";

describe("Branch Coverage Suite", () => {
  const baseNodeState: NodeState = {
    learner_id: "learn-cov",
    node_id: "NODE.COV",
    subject: "MATH",
    status: "available",
    ability_elo: 1200,
    difficulty_elo: 1200,
    stability: 3.0,
    difficulty_fsrs: 5.0,
    due_at: null,
    lapses: 0,
    reps: 0,
    last_reviewed_at: null,
    attempts_total: 0,
    recent_window: [],
    distinct_days: [],
    max_tier_correct: 0,
    mastered_at: null,
  };

  const sampleSkillNode: SkillNodeSummary = {
    node_id: "NODE.COV",
    subject: "MATH",
    prerequisites: [],
  };

  describe("state.ts lookups", () => {
    test("resolveGraphNode with SkillGraphLike (getNode) and Map", () => {
      const graphObj = {
        getNode: (id: string) => (id === "NODE.COV" ? sampleSkillNode : undefined),
      };
      expect(resolveGraphNode(graphObj, "NODE.COV")).toBe(sampleSkillNode);
      expect(resolveGraphNode(graphObj, "OTHER")).toBeUndefined();

      const graphMap = new Map<string, SkillNodeSummary>([
        ["NODE.COV", sampleSkillNode],
      ]);
      expect(resolveGraphNode(graphMap, "NODE.COV")).toBe(sampleSkillNode);
      expect(resolveGraphNode(graphMap, "OTHER")).toBeUndefined();
    });

    test("resolveNodeState with function and Map", () => {
      const lookupFn = (id: string) => (id === "NODE.COV" ? baseNodeState : undefined);
      expect(resolveNodeState(lookupFn, "NODE.COV")).toBe(baseNodeState);
      expect(resolveNodeState(lookupFn, "OTHER")).toBeUndefined();

      const lookupMap = new Map<string, NodeState>([["NODE.COV", baseNodeState]]);
      expect(resolveNodeState(lookupMap, "NODE.COV")).toBe(baseNodeState);
      expect(resolveNodeState(lookupMap, "OTHER")).toBeUndefined();
    });
  });

  describe("escalation.ts edge cases", () => {
    test("shouldEscalate returns false when not all last 4 are incorrect", () => {
      const stateWithSuccess: NodeState = {
        ...baseNodeState,
        recent_window: [
          { attempt_id: "a1", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:00:00Z", latency_ms: 5000 },
          { attempt_id: "a2", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:01:00Z", latency_ms: 5000 },
          { attempt_id: "a3", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:02:00Z", latency_ms: 5000 },
          { attempt_id: "a4", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:03:00Z", latency_ms: 5000 },
        ],
      };
      expect(shouldEscalate(stateWithSuccess, "2026-09-01T10:05:00Z")).toEqual({ escalate: false });
    });

    test("shouldEscalate handles invalid date strings gracefully", () => {
      const stateInvalidDate: NodeState = {
        ...baseNodeState,
        last_escalated_at: "invalid-date",
        recent_window: [
          { attempt_id: "a1", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:00:00Z", latency_ms: 5000 },
          { attempt_id: "a2", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:01:00Z", latency_ms: 5000 },
          { attempt_id: "a3", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:02:00Z", latency_ms: 5000 },
          { attempt_id: "a4", node_id: "N", correct: false, hints_used: 3, difficulty_tier: 1, occurred_at: "2026-09-01T10:03:00Z", latency_ms: 5000 },
        ],
      };
      const res = shouldEscalate(stateInvalidDate, "2026-09-01T10:05:00Z");
      expect(res.escalate).toBe(true);
    });

    test("escalateToTutor with and without misconceptionId", () => {
      const d1 = escalateToTutor(baseNodeState, "2026-09-01T10:00:00Z", "MISC.123");
      expect(d1.misconception_id).toBe("MISC.123");

      const d2 = escalateToTutor(baseNodeState, "2026-09-01T10:00:00Z");
      expect(d2.misconception_id).toBeNull();
    });
  });

  describe("elo.ts edge cases", () => {
    test("abilitySeed returns ELO_BASE when only soft prerequisites exist", () => {
      const graph = {
        "NODE.SOFT": {
          node_id: "NODE.SOFT",
          subject: "MATH",
          prerequisites: [{ node_id: "PREREQ.SOFT", type: "soft" as const }],
        },
      };
      const seed = abilitySeed("learn-1", "NODE.SOFT", {}, graph);
      expect(seed).toBe(ELO_BASE);
    });

    test("updateElo gives 0.5 score on correct with hints, and covers item K factor brackets", () => {
      const hintedCorrectAttempt: Attempt = {
        attempt_id: "att-hinted",
        node_id: "NODE.COV",
        correct: true,
        hints_used: 1,
        difficulty_tier: 2,
        occurred_at: "2026-09-01T12:00:00Z",
        latency_ms: 4000,
      };

      // Item response count in [50, 200) -> kItem = 16
      const resMid = updateElo(baseNodeState, hintedCorrectAttempt, 1200, 100);
      expect(resMid.ability_elo).toBeLessThan(baseNodeState.ability_elo);

      // Item response count >= 200 -> kItem = 8
      const resHigh = updateElo(baseNodeState, hintedCorrectAttempt, 1200, 250);
      expect(typeof resHigh.ability_elo).toBe("number");
    });
  });

  describe("mastery.ts edge cases", () => {
    test("isMastered returns false if max_tier_correct < 3 even with qualifying attempts across days", () => {
      const stateLowTier: NodeState = {
        ...baseNodeState,
        max_tier_correct: 2, // Tier 3 not reached!
        recent_window: [
          { attempt_id: "m1", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 2, occurred_at: "2026-09-01T10:00:00Z", latency_ms: 4000 },
          { attempt_id: "m2", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 2, occurred_at: "2026-09-01T11:00:00Z", latency_ms: 4000 },
          { attempt_id: "m3", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 2, occurred_at: "2026-09-03T10:00:00Z", latency_ms: 4000 },
          { attempt_id: "m4", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 2, occurred_at: "2026-09-03T11:00:00Z", latency_ms: 4000 },
          { attempt_id: "m5", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 2, occurred_at: "2026-09-03T12:00:00Z", latency_ms: 4000 },
        ],
      };
      expect(isMastered(stateLowTier)).toBe(false);
    });

    test("calendarDaySpan defensive branches", () => {
      expect(calendarDaySpan([])).toBe(0);
      expect(calendarDaySpan(["2026-09-01"])).toBe(0);
      expect(calendarDaySpan([undefined as unknown as string, undefined as unknown as string])).toBe(0);
    });
  });

  describe("placement.ts edge cases", () => {
    test("depthForGrade parses numeric strings and unknown fallbacks", () => {
      expect(depthForGrade("7")).toBe(7);
      expect(depthForGrade("UNKNOWN_GRADE")).toBe(15);
    });

    test("getNodeDepth and getGraphMinMaxDepth fallbacks", () => {
      const graphObj = {
        getNode: (id: string) => ({
          node_id: id,
          subject: "MATH",
          prerequisites: [],
        }),
      };
      // Uses topological derivation when depth is undefined
      const depth = getNodeDepth(graphObj, "NODE.COV");
      expect(typeof depth).toBe("number");

      // Empty / getNode-only graph fallback
      const minMaxEmpty = getGraphMinMaxDepth(graphObj);
      expect(minMaxEmpty).toEqual({ min: 0, max: 30 });

      // Map graph
      const mapGraph = new Map<string, SkillNodeSummary>([
        ["N1", { node_id: "N1", subject: "MATH", prerequisites: [] }],
      ]);
      const minMaxMap = getGraphMinMaxDepth(mapGraph);
      expect(minMaxMap.min).toBeDefined();
    });

    test("recordProbeResult handles rate between 1/3 and 2/3 and widening", () => {
      let st = initPlacementState("p-wide", "MATH", "GRADE_5", {});
      // Simulate low success to trigger widening downward
      st = {
        ...st,
        current_depth_probes: [
          { node_id: "n1", correct: false },
          { node_id: "n2", correct: false },
          { node_id: "n3", correct: false },
        ],
        items_used: 3,
        lo: 0,
        initial_lo: 0,
        hi: 1,
        initial_hi: 15,
        widened: false,
      };
      const resDown = recordProbeResult(st, "n3", false, 0);
      expect(resDown.items_used).toBe(4);

      // Simulate middle success rate (1/3 < rate < 2/3): e.g. 1 correct out of 2 probes at items_used=19
      st = {
        ...st,
        items_used: 19,
        current_depth_probes: [{ node_id: "m1", correct: true }],
      };
      const resMid = recordProbeResult(st, "m2", false, 5);
      expect(resMid.lo).toBe(5);
      expect(resMid.hi).toBe(5);

      // Simulate widening upward
      st = {
        ...st,
        lo: 14,
        initial_lo: 0,
        hi: 15,
        initial_hi: 15,
        graph_max_depth: 30,
        widened: false,
        history: [{ node_id: "n1", depth: 14, correct: true }],
        current_depth_probes: [
          { node_id: "n1", correct: true },
          { node_id: "n2", correct: true },
          { node_id: "n3", correct: true },
        ],
        items_used: 3,
      };
      const resUp = recordProbeResult(st, "n3", true, 15);
      expect(resUp.widened).toBe(true);
      expect(resUp.hi).toBe(25);
    });

    test("nextProbeDepth handles widening when bracket exhausted", () => {
      let st = initPlacementState("p-probe", "MATH", 10, {});
      st = {
        ...st,
        lo: 10,
        initial_lo: 10,
        graph_min_depth: 0,
        hi: 11,
        widened: false,
        history: [{ node_id: "n1", depth: 10, correct: false }],
      };
      expect(nextProbeDepth(st)).toBe(5); // (0 + 11)/2 = 5

      st = {
        ...st,
        lo: 19,
        hi: 20,
        initial_hi: 20,
        graph_max_depth: 30,
        widened: false,
        history: [{ node_id: "n1", depth: 20, correct: true }],
      };
      expect(nextProbeDepth(st)).toBe(24); // (19 + 30)/2 = 24
    });

    test("eloFromEvidence covers all delta brackets and default baseElo", () => {
      expect(eloFromEvidence({ correct: 4, total: 4 })).toBe(1400);
      expect(eloFromEvidence({ correct: 3, total: 4 })).toBe(1350);
      expect(eloFromEvidence({ correct: 2, total: 3 })).toBe(1250);
      expect(eloFromEvidence({ correct: 1, total: 2 })).toBe(1200);
      expect(eloFromEvidence({ correct: 1, total: 3 })).toBe(1150);
      expect(eloFromEvidence({ correct: 0, total: 3 })).toBe(1050);
      expect(eloFromEvidence({ correct: 0, total: 0 })).toBe(1200);
    });

    test("propagateMasteryDown with default evidence", () => {
      const graph = {
        NODE_A: {
          node_id: "NODE_A",
          subject: "MATH",
          prerequisites: [{ node_id: "NODE_B", type: "hard" as const }],
        },
        NODE_B: {
          node_id: "NODE_B",
          subject: "MATH",
          prerequisites: [],
        },
      };
      const res = propagateMasteryDown(["NODE_A"], graph);
      expect(res).toContain("NODE_B");
    });

    test("recordProbeResult without depth parameter uses current/next probe depth", () => {
      const stProbe = initPlacementState("p-nodept", "MATH", 10, {});
      const resNoDepth = recordProbeResult(stProbe, "n1", true);
      expect(resNoDepth.items_used).toBe(1);
    });

    test("backfillPrerequisites skips when items_used >= 25 or no administerFn or already verified", () => {
      const st = initPlacementState("p-backfill", "MATH", 5, {});
      const stOver = { ...st, items_used: 25 };
      expect(backfillPrerequisites(stOver, ["N1"], {})).toBe(stOver);
      expect(backfillPrerequisites(st, ["N1"], {}, undefined)).toBe(st);

      // Prerequisite already verified in evidence
      const graph = {
        NODE_P: {
          node_id: "NODE_P",
          subject: "MATH",
          prerequisites: [{ node_id: "NODE_VER", type: "hard" as const }],
        },
        NODE_VER: {
          node_id: "NODE_VER",
          subject: "MATH",
          prerequisites: [],
        },
      };
      const stVerified = {
        ...st,
        evidence: {
          NODE_VER: { correct: 1, total: 1, rate: 1.0 },
        },
      };
      const resVerified = backfillPrerequisites(stVerified, ["NODE_P"], graph, () => true);
      expect(resVerified.items_used).toBe(0);

      // Prerequisite with evidence existing but total === 0
      const stZeroTotal = {
        ...st,
        evidence: {
          NODE_VER: { correct: 0, total: 0, rate: 0 },
        },
      };
      const resZeroTotal = backfillPrerequisites(stZeroTotal, ["NODE_P"], graph, () => true);
      expect(resZeroTotal.items_used).toBe(1);

      // Backfill with incorrect answer (administerFn returns false)
      const resIncorrect = backfillPrerequisites(st, ["NODE_P"], graph, () => false);
      expect(resIncorrect.items_used).toBe(1);
      expect(resIncorrect.evidence["NODE_VER"]?.correct).toBe(0);

      // Prerequisite where node is missing in graph
      const resMissingNode = backfillPrerequisites(st, ["NON_EXISTENT"], {}, () => true);
      expect(resMissingNode.items_used).toBe(0);

      // Backfill loop reaches 25 and breaks
      const graphTwoPrereqs = {
        NODE_P2: {
          node_id: "NODE_P2",
          subject: "MATH",
          prerequisites: [
            { node_id: "PREREQ_1", type: "hard" as const },
            { node_id: "PREREQ_2", type: "hard" as const },
          ],
        },
        PREREQ_1: { node_id: "PREREQ_1", subject: "MATH", prerequisites: [] },
        PREREQ_2: { node_id: "PREREQ_2", subject: "MATH", prerequisites: [] },
      };
      const st24 = {
        ...st,
        items_used: 24,
      };
      const res25Break = backfillPrerequisites(st24, ["NODE_P2"], graphTwoPrereqs, () => true);
      expect(res25Break.items_used).toBe(25);
    });

    test("recordProbeResult with converged state evaluates state.lo", () => {
      const stConverged = {
        ...initPlacementState("p-conv", "MATH", 10, {}),
        lo: 10,
        hi: 11,
        current_probe_depth: null,
      };
      const resConv = recordProbeResult(stConverged, "n1", true);
      expect(resConv.items_used).toBe(1);
    });

    test("place with options.administer, learnerContext.administer, true_ability, and frontier backfill closure", () => {
      let rngState = 12345;
      const rng = () => {
        rngState = (rngState * 16807) % 2147483647;
        return (rngState - 1) / 2147483646;
      };

      const wideGraphWithPrereq = {
        NODE_D0: {
          node_id: "NODE_D0",
          subject: "MATH",
          depth: 0,
          prerequisites: [],
        },
        NODE_D10: {
          node_id: "NODE_D10",
          subject: "MATH",
          depth: 10,
          prerequisites: [{ node_id: "NODE_D4", type: "hard" as const }],
        },
        NODE_D4: {
          node_id: "NODE_D4",
          subject: "MATH",
          depth: 4,
          prerequisites: [],
        },
        NODE_D11: {
          node_id: "NODE_D11",
          subject: "MATH",
          depth: 11,
          prerequisites: [],
        },
      };

      // 1. options.administer settles at depth 10, triggering frontier backfill closure (line 597)
      const p1 = place("p-opt", "MATH", 10, rng, {
        graph: wideGraphWithPrereq,
        administer: (nodeId) => {
          if (nodeId.includes("D11")) return false;
          return true;
        },
      });
      expect(p1.items_used).toBeGreaterThan(0);

      // 2. learnerContext.administer
      const p2 = place(
        { learner_id: "p-ctx", administer: () => false },
        "MATH",
        10,
        rng,
        { graph: wideGraphWithPrereq }
      );
      expect(p2.items_used).toBeGreaterThan(0);

      // 3. learnerContext with true_ability
      const p3 = place(
        { learner_id: "p-ability", true_ability: 1350 },
        "MATH",
        10,
        rng,
        { graph: wideGraphWithPrereq }
      );
      expect(p3.items_used).toBeGreaterThan(0);

      // 4. learner string without options -> fallback rng() >= 0.35
      const p4 = place("p-fallback", "MATH", 10, rng, { graph: wideGraphWithPrereq });
      expect(p4.items_used).toBeGreaterThan(0);

      // 5. place without options parameter (defaults to {})
      const p5 = place("p-no-opts", "MATH", 10, rng);
      expect(p5.items_used).toBeGreaterThan(0);

      // 6. place with options.graph undefined (defaults to {})
      const p6 = place("p-graph-undef", "MATH", 10, rng, { graph: undefined });
      expect(p6.items_used).toBeGreaterThan(0);
    });
  });

  describe("selection.ts edge cases", () => {
    test("applyAdaptiveAdjustment handles undefined recentSuccessRate with empty and non-empty window", () => {
      const stateEmptyWindow: NodeState = {
        ...baseNodeState,
        attempts_total: 25,
        recent_window: [],
      };
      expect(applyAdaptiveAdjustment(stateEmptyWindow)).toBe(0);

      const stateHighSuccess: NodeState = {
        ...baseNodeState,
        attempts_total: 25,
        recent_window: [
          { attempt_id: "a1", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:00:00Z", latency_ms: 3000 },
          { attempt_id: "a2", node_id: "N", correct: true, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:01:00Z", latency_ms: 3000 },
        ],
      };
      expect(applyAdaptiveAdjustment(stateHighSuccess)).toBe(100);
    });

    test("poolExhaustionLadder handles empty pool, fallback to learner.itemPool, and unreachable tiers", () => {
      const emptyDecision = poolExhaustionLadder(
        { ...baseNodeState, items: [] },
        { learner_id: "l-empty" },
        () => 0.5
      );
      expect(emptyDecision.action).toBe("queue_empty");
      expect(emptyDecision.reason).toBe("content_gap");

      // node.items undefined, learner.itemPool undefined
      const noItemsDecision = poolExhaustionLadder(
        { ...baseNodeState, items: undefined },
        { learner_id: "l-none", itemPool: undefined },
        () => 0.5
      );
      expect(noItemsDecision.action).toBe("queue_empty");

      // node.items undefined, learner.itemPool defined
      const poolDecision = poolExhaustionLadder(
        { ...baseNodeState, items: undefined },
        {
          learner_id: "l-pool",
          itemPool: [{ item_id: "i1", node_id: "N", difficulty_tier: 1, difficulty_elo: 1000 }],
        },
        () => 0.5
      );
      expect(poolDecision.action).toBe("serve_item");

      // Items exist but none reachable by tier (e.g. tier 3 only when max_tier_correct=0)
      const unreachableDecision = poolExhaustionLadder(
        { ...baseNodeState, max_tier_correct: 0, items: [{ item_id: "i-t3", node_id: "N", difficulty_tier: 3, difficulty_elo: 1500 }] },
        { learner_id: "l-unreach" },
        () => 0.5
      );
      expect(unreachableDecision.action).toBe("serve_item");
    });

    test("dominantMisconception edge cases (default threshold, window > 5, no winner)", () => {
      const sixAttempts: Attempt[] = [
        { attempt_id: "a0", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:00:00Z", latency_ms: 1000, misconception_id: "M1" },
        { attempt_id: "a1", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:01:00Z", latency_ms: 1000, misconception_id: "M1" },
        { attempt_id: "a2", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:02:00Z", latency_ms: 1000, misconception_id: "M2" },
        { attempt_id: "a3", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:03:00Z", latency_ms: 1000, misconception_id: "M2" },
        { attempt_id: "a4", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:04:00Z", latency_ms: 1000, misconception_id: "M2" },
        { attempt_id: "a5", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-01T10:05:00Z", latency_ms: 1000, misconception_id: "M2" },
      ];
      // Default threshold = 2
      expect(dominantMisconception(sixAttempts)).toBe("M2");
      expect(dominantMisconception(sixAttempts, 3)).toBe("M2");
      expect(dominantMisconception(sixAttempts, 10)).toBeNull();
    });

    test("selectNextItem with Date object, remediation suppression, and fallback learner.itemPool", () => {
      const now = new Date("2026-09-15T12:00:00Z");

      // Date object and learner.itemPool fallback
      const decDate = selectNextItem(
        {
          learner_id: "l-pool",
          itemPool: [{ item_id: "i-pool", node_id: "N", difficulty_tier: 1, difficulty_elo: 1000 }],
        },
        { ...baseNodeState, items: undefined },
        now,
        () => 0.5
      );
      expect(decDate.action).toBe("serve_item");

      // Both node.items and learner.itemPool undefined
      const decEmpty = selectNextItem(
        { learner_id: "l-empty" },
        { ...baseNodeState, items: undefined },
        "2026-09-15T12:00:00Z",
        () => 0.5
      );
      expect(decEmpty.action).toBe("queue_empty");

      // Remediation shown recently returns false to serve remediation, true suppresses
      const stateWithMisc: NodeState = {
        ...baseNodeState,
        recent_window: [
          { attempt_id: "a1", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-15T10:00:00Z", latency_ms: 2000, misconception_id: "M_ACTIVE" },
          { attempt_id: "a2", node_id: "N", correct: false, hints_used: 0, difficulty_tier: 1, occurred_at: "2026-09-15T10:01:00Z", latency_ms: 2000, misconception_id: "M_ACTIVE" },
        ],
      };
      // Suppressed
      const decSuppressed = selectNextItem(
        {
          learner_id: "l-suppress",
          remediationShownRecently: () => true, // suppressed!
          itemPool: [{ item_id: "i1", node_id: "N", difficulty_tier: 1, difficulty_elo: 1000 }],
        },
        stateWithMisc,
        "2026-09-15T12:00:00Z",
        () => 0.5
      );
      expect(decSuppressed.action).toBe("serve_item");

      // Not suppressed (remediationShownRecently undefined)
      const decServeRem = selectNextItem(
        {
          learner_id: "l-unsuppressed",
          itemPool: [{ item_id: "i1", node_id: "N", difficulty_tier: 1, difficulty_elo: 1000 }],
        },
        stateWithMisc,
        "2026-09-15T12:00:00Z",
        () => 0.5
      );
      expect(decServeRem.action).toBe("serve_remediation");
    });

    test("isSeenWithin and selection history filters", () => {
      const learner = {
        learner_id: "l-hist",
        itemHistory: [
          { item_id: "seen-recently", seen_at: "2026-09-14T12:00:00Z" }, // 1 day ago
        ],
      };
      const nowMs = Date.parse("2026-09-15T12:00:00Z");
      expect(isSeenWithin(learner, "seen-recently", 21, nowMs)).toBe(true);
      expect(isSeenWithin(learner, "never-seen", 21, nowMs)).toBe(false);

      const items = [
        { item_id: "seen-recently", node_id: "N", difficulty_tier: 1 as const, difficulty_elo: 950 },
        { item_id: "never-seen", node_id: "N", difficulty_tier: 1 as const, difficulty_elo: 960 },
      ];
      const now = "2026-09-15T12:00:00Z";
      const decision = selectNextItem(
        learner,
        { ...baseNodeState, items },
        now,
        () => 0.5
      );
      expect(decision.action).toBe("serve_item");
      expect(decision.item_id).toBe("never-seen");
    });

    test("getLastSeenTimestamp with empty history and weightedSample edge cases", () => {
      expect(getLastSeenTimestamp({ learner_id: "l" }, "item-1")).toBe(0);
      expect(weightedSample(["a", "b"], [0, 0], () => 0.5)).toBe("b");
      expect(weightedSample(["a", "b"], [1, 2], () => 1.05)).toBe("b"); // line 126 loop exit
    });
  });

  describe("srs.ts edge cases", () => {
    test("examCompression handles valid ISO string, invalid string, and day brackets", () => {
      const now = "2026-09-01T00:00:00Z";
      // > 90 days
      expect(examCompression(now, "2026-12-15T00:00:00Z")).toBe(1.0);
      // > 30 days
      expect(examCompression(now, "2026-10-15T00:00:00Z")).toBe(0.75);
      // > 14 days
      expect(examCompression(now, "2026-09-20T00:00:00Z")).toBe(0.5);
      // <= 14 days
      expect(examCompression(now, "2026-09-05T00:00:00Z")).toBe(0.35);
      // invalid date string returns 1.0
      expect(examCompression(now, "not-a-date")).toBe(1.0);
    });

    test("onReview with relearning node receiving incorrect attempt and with null due_at and empty recent_window", () => {
      const relearningNode: NodeState = {
        ...baseNodeState,
        status: "relearning",
        stability: 2.0,
        difficulty_fsrs: 6.0,
        lapses: 1,
        due_at: "2026-09-01T00:00:00Z",
      };
      const updated = onReview(relearningNode, false, "2026-09-02T00:00:00Z");
      expect(updated.status).toBe("relearning");
      expect(updated.lapses).toBe(2);
      expect(updated.stability).toBe(1.0);
      expect(updated.difficulty_fsrs).toBe(6.6);

      // Node with null due_at and empty recent_window on review
      const nullDueNode: NodeState = {
        ...baseNodeState,
        status: "relearning",
        due_at: null,
        recent_window: [],
      };
      const resNullDue = onReview(nullDueNode, true, "2026-09-15T00:00:00Z");
      expect(resNullDue.attempts_total).toBe(1);
    });

    test("extractNodeStates covers all input types and empty fallbacks", () => {
      expect(extractNodeStates([]).learnerId).toBe("learner");
      expect(extractNodeStates(new Map()).learnerId).toBe("learner");
      expect(extractNodeStates({}).learnerId).toBe("learner");
      const ctxWithRecord = {
        learner_id: "l-rec",
        node_states: {
          n1: { ...baseNodeState, node_id: "n1" },
        },
      };
      expect(extractNodeStates(ctxWithRecord).nodes).toHaveLength(1);

      const ctxWithMap = {
        learner_id: "l-map-ctx",
        node_states: new Map([["n1", baseNodeState]]),
      };
      expect(extractNodeStates(ctxWithMap).nodes).toHaveLength(1);

      const ctxWithArr = {
        learner_id: "l-arr-ctx",
        node_states: [baseNodeState],
      };
      expect(extractNodeStates(ctxWithArr).nodes).toHaveLength(1);
    });

    test("buildReviewQueue handles sorting, caps, locked, no-due, future-due, and breaks in all categories", () => {
      const now = "2026-09-15T12:00:00Z";

      // Map containing locked node, node without due_at, and future due node
      const mapNodes = new Map<string, NodeState>([
        ["LOCKED", { ...baseNodeState, node_id: "LOCKED", status: "locked" }],
        ["NO_DUE", { ...baseNodeState, node_id: "NO_DUE", status: "mastered", due_at: null }],
        ["FUTURE", { ...baseNodeState, node_id: "FUTURE", status: "mastered", due_at: "2026-09-20T12:00:00Z" }],
      ]);
      const qFiltered = buildReviewQueue(mapNodes, now);
      expect(qFiltered.items).toHaveLength(0);

      // Relearning items (multiple to execute relearning sort and cap break)
      const relearnNodes = [
        { ...baseNodeState, node_id: "RELEARN_B", status: "relearning" as const, due_at: "2026-09-10T12:00:00Z" },
        { ...baseNodeState, node_id: "RELEARN_A", status: "relearning" as const, due_at: "2026-09-10T12:00:00Z" },
      ];
      const qRelearn = buildReviewQueue(relearnNodes, now, undefined, { cap: 1 });
      expect(qRelearn.items).toHaveLength(1);
      expect(qRelearn.items[0]?.node_id).toBe("RELEARN_A");

      // Overdue normal items (multiple to execute sortOverdue)
      const overdueNormNodes = [
        { ...baseNodeState, node_id: "NORM_B", status: "needs_review" as const, due_at: "2026-09-10T12:00:00Z" },
        { ...baseNodeState, node_id: "NORM_A", status: "needs_review" as const, due_at: "2026-09-08T12:00:00Z" },
        { ...baseNodeState, node_id: "NORM_C", status: "needs_review" as const, due_at: "2026-09-08T12:00:00Z" },
      ];
      const qNorm = buildReviewQueue(overdueNormNodes, now);
      expect(qNorm.items).toHaveLength(3);

      // Exam critical items (multiple to execute exam-critical sort and cap break)
      const examNodes = [
        { ...baseNodeState, node_id: "EXAM_B", status: "needs_review" as const, due_at: "2026-09-15T12:00:00Z" },
        { ...baseNodeState, node_id: "EXAM_A", status: "needs_review" as const, due_at: "2026-09-15T12:00:00Z" },
      ];
      const qExam = buildReviewQueue(examNodes, now, undefined, {
        examCriticalNodes: ["EXAM_A", "EXAM_B"],
        cap: 1,
      });
      expect(qExam.items).toHaveLength(1);
      expect(qExam.items[0]?.node_id).toBe("EXAM_A");

      // Due today items (multiple to execute due-today sort and cap break)
      const dueTodayNodes = [
        { ...baseNodeState, node_id: "DUE_B", status: "needs_review" as const, due_at: "2026-09-15T12:00:00Z" },
        { ...baseNodeState, node_id: "DUE_A", status: "needs_review" as const, due_at: "2026-09-15T12:00:00Z" },
      ];
      const qDue = buildReviewQueue(dueTodayNodes, now, undefined, { cap: 1 });
      expect(qDue.items).toHaveLength(1);
      expect(qDue.items[0]?.node_id).toBe("DUE_A");
    });
  });

  describe("invariants.ts edge cases", () => {
    test("roundElo helper", () => {
      expect(roundElo(1234.56789)).toBe(1234.5679);
    });

    test("checkI1 with non-available status returns empty", () => {
      const lockedNode: NodeState = { ...baseNodeState, status: "locked" };
      expect(checkI1(lockedNode, ["locked"])).toEqual([]);
    });

    test("checkI2 with needs_review and no mastered_at", () => {
      const invalidLapseNode: NodeState = {
        ...baseNodeState,
        status: "needs_review",
        lapses: 1,
        mastered_at: null,
      };
      const v = checkI2(invalidLapseNode);
      expect(v.length).toBeGreaterThan(0);
    });

    test("checkI3 with invalid date string in mastered_at", () => {
      const invalidDateNode: NodeState = {
        ...baseNodeState,
        mastered_at: "not-a-valid-date",
      };
      const v = checkI3(invalidDateNode);
      expect(v.some((x) => x.id === "I-3")).toBe(true);
    });

    test("checkI4 with non-string action", () => {
      const invalidDec = { action: 123, reason: "ok" };
      const v = checkI4(invalidDec);
      expect(v.some((x) => x.id === "I-4")).toBe(true);
    });

    test("checkI5 with out of bounds difficulty_elo", () => {
      const invalidDiffNode: NodeState = {
        ...baseNodeState,
        difficulty_elo: 300,
      };
      const v = checkI5(invalidDiffNode);
      expect(v.some((x) => x.id === "I-5")).toBe(true);
    });

    test("checkI6 with number, array, and ReviewQueue object", () => {
      expect(checkI6(5)).toEqual([]);
      expect(checkI6(9)).toHaveLength(1);
      expect(checkI6([1, 2, 3])).toEqual([]);
      expect(checkI6(new Array(10).fill(1))).toHaveLength(1);
    });

    test("checkI7 with Map and getNode lookups", () => {
      const graphMap = new Map([
        ["N1", { node_id: "N1", subject: "MATH", prerequisites: [] }],
      ]);
      expect(checkI7(graphMap)).toEqual([]);

      const graphObj = {
        getNode: () => undefined,
      };
      expect(checkI7(graphObj)).toEqual([]);
    });

    test("checkI10 with non-mastered status returns empty", () => {
      expect(checkI10(baseNodeState)).toEqual([]);
    });

    test("assertInvariants with full context exercising all check delegates and throwInTests", () => {
      const violations = assertInvariants({
        state: baseNodeState,
        hardPrerequisiteStatuses: ["mastered"],
        priorState: baseNodeState,
        decision: { action: "serve_item", node_id: "N", item_id: "I", misconception_id: null, reason: "ok" },
        queue: { learner_id: "l", date: "2026-09-15", items: [], total_due: 0, cap: 8 },
        graph: {},
        attempts: [],
        outputA: { val: 1 },
        outputB: { val: 1 },
      });
      expect(violations).toEqual([]);

      // Test throwInTests with deliberate violation
      expect(() => {
        assertInvariants(
          {
            state: { ...baseNodeState, ability_elo: 100 }, // I-5 violation
          },
          { throwInTests: true }
        );
      }).toThrow(/Invariant violations: I-5/);
    });
  });

  describe("statemachine.ts edge cases", () => {
    test("computeAvailableNodes and computeFrontierNodes with Map and getNode", () => {
      const graphMap = new Map([
        ["N1", { node_id: "N1", subject: "MATH", prerequisites: [] }],
      ]);
      const availMap = computeAvailableNodes(graphMap, {});
      expect(availMap).toContain("N1");

      const graphObj = { getNode: () => undefined };
      expect(computeAvailableNodes(graphObj, {})).toEqual([]);

      const frontier = computeFrontierNodes(graphMap, {});
      expect(frontier).toContain("N1");
    });

    test("transition unlock on non-locked node returns unmodified node, and context prereqs", () => {
      const availNode: NodeState = { ...baseNodeState, status: "available" };
      expect(transition(availNode, { type: "unlock" }, "2026-09-15T00:00:00Z")).toBe(availNode);

      const lockedNode: NodeState = { ...baseNodeState, status: "locked" };
      const unlocked = transition(
        lockedNode,
        { type: "unlock" },
        "2026-09-15T00:00:00Z",
        { hardPrerequisiteStatuses: ["mastered"] }
      );
      expect(unlocked.status).toBe("available");

      // Unlock without context or evt prereqs defaults to [] (allSecured is true)
      const unlockedDefault = transition(lockedNode, { type: "unlock" }, "2026-09-15T00:00:00Z");
      expect(unlockedDefault.status).toBe("available");
    });

    test("transition check_due when now < due_at returns unmodified node", () => {
      const masteredNode: NodeState = {
        ...baseNodeState,
        status: "mastered",
        due_at: "2026-09-20T00:00:00Z",
      };
      const res = transition(masteredNode, { type: "check_due" }, "2026-09-15T00:00:00Z");
      expect(res.status).toBe("mastered");
    });

    test("transition falls through on unrecognized event", () => {
      const res = transition(baseNodeState, { type: "unknown" } as any, "2026-09-15T00:00:00Z");
      expect(res).toBe(baseNodeState);
    });

    test("transition with review attempt on mastered node routes to onReview, and handles undefined difficulty_elo", () => {
      const masteredNode: NodeState = {
        ...baseNodeState,
        status: "mastered",
        due_at: "2026-09-10T00:00:00Z",
      };
      const attempt: Attempt = {
        attempt_id: "rev-1",
        node_id: "NODE.COV",
        correct: true,
        hints_used: 0,
        difficulty_tier: 2,
        occurred_at: "2026-09-15T00:00:00Z",
        latency_ms: 3000,
        is_review: true,
      };
      const res = transition(masteredNode, attempt, "2026-09-15T00:00:00Z");
      expect(res.status).toBe("mastered");
      expect(res.stability).toBeGreaterThan(masteredNode.stability);

      // Attempt where is_review is false but mastered node is past due_at (doc 04 §3 implementation note)
      const nonReviewAttemptOnPastDue: Attempt = {
        attempt_id: "rev-2",
        node_id: "NODE.COV",
        correct: true,
        hints_used: 0,
        difficulty_tier: 2,
        occurred_at: "2026-09-15T00:00:00Z",
        latency_ms: 3000,
        is_review: false,
      };
      const resPastDue = transition(masteredNode, nonReviewAttemptOnPastDue, "2026-09-15T00:00:00Z");
      expect(resPastDue.status).toBe("mastered");

      const nodeNoDiff: NodeState = {
        ...baseNodeState,
        status: "in_progress",
        difficulty_elo: undefined,
      };
      const regularAttempt: Attempt = {
        attempt_id: "reg-1",
        node_id: "NODE.COV",
        correct: true,
        hints_used: 0,
        difficulty_tier: 1,
        occurred_at: "2026-09-15T00:00:00Z",
        latency_ms: 3000,
      };
      const res2 = transition(nodeNoDiff, regularAttempt, "2026-09-15T00:00:00Z");
      expect(res2.attempts_total).toBe(1);
    });
  });
});
