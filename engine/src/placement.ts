/**
 * engine/src/placement.ts
 *
 * Implementation of the pure, deterministic Placement algorithm for Questcademy.
 * Source of truth: docs/04-learning-engine-spec.md §7, §7.1, §7.2
 *
 * Implements the resumable step API (2026-07-29 note):
 *   1. initPlacementState(learnerId, subject, entryGradeHint, graph)
 *   2. nextProbeDepth(state)
 *   3. recordProbeResult(state, nodeId, correct, depth?)
 *   4. finalizePlacement(state, graph)
 *   5. backfillPrerequisites(state, frontier, graph, administerFn?)
 *   6. seedStateFromEvidence(evidence, frontier, graph)
 *   7. place(learner, subject, entryGradeHint, rng, options?) [convenience wrapper]
 */

import type {
  GraphLookup,
  LearnerPlacementContext,
  LearnerStateUpdate,
  NodeEvidence,
  NodeState,
  PlacementResult,
  PlacementState,
  ProbeResult,
  SkillNodeSummary,
} from "./state.js";
import { resolveGraphNode } from "./state.js";
import { nodeDifficultyFromGraph } from "./elo.js";

// ---------------------------------------------------------------------------
// 1. Grade Band to Depth Mapping
// ---------------------------------------------------------------------------

export const GRADE_DEPTH_MAP: Record<string, number> = {
  P1: 3,
  P2: 6,
  P3: 9,
  P4: 12,
  P5: 15,
  P6: 18,
  JSS1: 21,
  JSS2: 24,
  JSS3: 27,
  SSS1: 30,
  SSS2: 33,
  SSS3: 36,
};

export function depthForGrade(entryGradeHint: number | string): number {
  if (typeof entryGradeHint === "number") {
    return Math.round(entryGradeHint);
  }
  const clean = entryGradeHint.trim().toUpperCase();
  if (clean in GRADE_DEPTH_MAP) {
    return GRADE_DEPTH_MAP[clean]!;
  }
  const parsed = Number(clean);
  if (!Number.isNaN(parsed)) {
    return Math.round(parsed);
  }
  return 15; // default midpoint
}

// ---------------------------------------------------------------------------
// 2. Graph Depth & Topological Utilities
// ---------------------------------------------------------------------------

interface NodeWithExplicitDepth {
  readonly depth?: number;
}

export function getNodeDepth(graph: GraphLookup, nodeId: string): number {
  const node = resolveGraphNode(graph, nodeId);
  if (node && typeof (node as NodeWithExplicitDepth).depth === "number") {
    return (node as NodeWithExplicitDepth).depth!;
  }
  // Fall back to topological level derived from graph
  return Math.round((nodeDifficultyFromGraph(nodeId, graph) - 1200) / 25);
}

function getAllGraphNodes(graph: GraphLookup): SkillNodeSummary[] {
  if (graph instanceof Map) {
    return Array.from(graph.values());
  }
  if ("getNode" in graph && typeof graph.getNode === "function") {
    // If it's a SkillGraphLike without iteration, caller should provide Map or Record
    return [];
  }
  return Object.values(graph as Record<string, SkillNodeSummary>);
}

export function getGraphMinMaxDepth(graph: GraphLookup): { min: number; max: number } {
  const nodes = getAllGraphNodes(graph);
  if (nodes.length === 0) {
    return { min: 0, max: 30 };
  }
  let min = Infinity;
  let max = -Infinity;
  for (const n of nodes) {
    const d = getNodeDepth(graph, n.node_id);
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return { min, max };
}

export function getNodesAtDepth(graph: GraphLookup, depth: number): readonly string[] {
  const nodes = getAllGraphNodes(graph);
  const matched: string[] = [];
  for (const n of nodes) {
    if (getNodeDepth(graph, n.node_id) === depth) {
      matched.push(n.node_id);
    }
  }
  return matched;
}

function hasAnySuccess(history: readonly ProbeResult[]): boolean {
  return history.some((p) => p.correct);
}

function allSuccesses(history: readonly ProbeResult[]): boolean {
  return history.length > 0 && history.every((p) => p.correct);
}

// ---------------------------------------------------------------------------
// 3. Resumable Step API (docs/04-learning-engine-spec.md §7)
// ---------------------------------------------------------------------------

/**
 * Initializes placement state. Seeds lo and hi to a +-10 bracket around the
 * hinted grade depth, rather than the full graph range (2026-07 correction).
 */
export function initPlacementState(
  learnerId: string,
  subject: string,
  entryGradeHint: number | string,
  graph: GraphLookup
): PlacementState {
  const hintDepth = depthForGrade(entryGradeHint);
  const { min: graphMin, max: graphMax } = getGraphMinMaxDepth(graph);

  const lo = Math.max(graphMin, hintDepth - 10);
  const hi = Math.min(graphMax, hintDepth + 10);

  return {
    learner_id: learnerId,
    subject,
    entry_grade_hint: entryGradeHint,
    hint_depth: hintDepth,
    lo,
    hi,
    initial_lo: lo,
    initial_hi: hi,
    graph_min_depth: graphMin,
    graph_max_depth: graphMax,
    current_probe_depth: null,
    current_depth_probes: [],
    items_used: 0,
    evidence: {},
    history: [],
    widened: false,
    converged: false,
    frontier_depth: null,
  };
}

/**
 * Returns the next depth to probe, or null if the search has converged.
 * Converges when items_used >= 20 or hi - lo <= 1.
 */
export function nextProbeDepth(state: PlacementState): number | null {
  if (state.converged || state.items_used >= 20) {
    return null;
  }

  // If currently in the middle of a 3-probe round at a depth, continue probing that depth
  if (
    state.current_depth_probes.length > 0 &&
    state.current_depth_probes.length < 3 &&
    state.current_probe_depth !== null
  ) {
    return state.current_probe_depth;
  }

  // If bracket narrowed to <= 1 level, check if widening applies before converging
  if (state.hi - state.lo <= 1) {
    if (!state.widened) {
      if (
        state.lo === state.initial_lo &&
        state.lo > state.graph_min_depth &&
        !hasAnySuccess(state.history)
      ) {
        // Widen once downwards by 10
        const newLo = Math.max(state.graph_min_depth, state.lo - 10);
        if (state.hi - newLo > 1) {
          return Math.floor((newLo + state.hi) / 2);
        }
      } else if (
        state.hi === state.initial_hi &&
        state.hi < state.graph_max_depth &&
        allSuccesses(state.history)
      ) {
        // Widen once upwards by 10
        const newHi = Math.min(state.graph_max_depth, state.hi + 10);
        if (newHi - state.lo > 1) {
          return Math.floor((state.lo + newHi) / 2);
        }
      }
    }
    return null;
  }

  return Math.floor((state.lo + state.hi) / 2);
}

/**
 * Records a single probe result. When the depth's 3 probes are complete:
 *   - rate >= 2.0 / 3.0 advances lo = probeDepth (search upward)
 *   - rate <= 1.0 / 3.0 advances hi = probeDepth (search downward)
 *   - exactly 2/3 correct advances lo (middle case floor rule)
 */
export function recordProbeResult(
  state: PlacementState,
  nodeId: string,
  correct: boolean,
  depth?: number
): PlacementState {
  const probeDepth =
    depth ?? state.current_probe_depth ?? nextProbeDepth(state) ?? state.lo;

  const newCurrentProbes = [
    ...state.current_depth_probes,
    { node_id: nodeId, correct },
  ];
  const newItemsUsed = state.items_used + 1;

  // Update cumulative evidence for this node
  const prevEv = state.evidence[nodeId] ?? { correct: 0, total: 0, rate: 0 };
  const newCorrect = prevEv.correct + (correct ? 1 : 0);
  const newTotal = prevEv.total + 1;
  const newEvidence: Record<string, NodeEvidence> = {
    ...state.evidence,
    [nodeId]: {
      correct: newCorrect,
      total: newTotal,
      rate: newCorrect / newTotal,
    },
  };

  const newHistory: ProbeResult[] = [
    ...state.history,
    { node_id: nodeId, depth: probeDepth, correct },
  ];

  // If round not yet finished and under budget, retain current depth probes
  if (newCurrentProbes.length < 3 && newItemsUsed < 20) {
    return {
      ...state,
      current_probe_depth: probeDepth,
      current_depth_probes: newCurrentProbes,
      items_used: newItemsUsed,
      evidence: newEvidence,
      history: newHistory,
    };
  }

  // 3 probes completed (or reached item limit): advance search bounds
  const correctCount = newCurrentProbes.filter((p) => p.correct).length;
  const rate = correctCount / newCurrentProbes.length;

  let newLo = state.lo;
  let newHi = state.hi;
  let widened = state.widened;

  // Exactly 2/3 (or >= 2.0/3.0) advances lo
  if (rate >= 2.0 / 3.0 - 1e-9) {
    newLo = probeDepth;
  } else if (rate <= 1.0 / 3.0 + 1e-9) {
    newHi = probeDepth;
  } else {
    // 1/3 < rate < 2/3: frontier found, settle
    newLo = probeDepth;
    newHi = probeDepth;
  }

  // If bracket exhausted in one direction, widen once by 10
  if (!widened && newHi - newLo <= 1) {
    if (
      newLo === state.initial_lo &&
      newLo > state.graph_min_depth &&
      !hasAnySuccess(newHistory)
    ) {
      newLo = Math.max(state.graph_min_depth, newLo - 10);
      widened = true;
    } else if (
      newHi === state.initial_hi &&
      newHi < state.graph_max_depth &&
      allSuccesses(newHistory)
    ) {
      newHi = Math.min(state.graph_max_depth, newHi + 10);
      widened = true;
    }
  }

  const converged = newItemsUsed >= 20 || newHi - newLo <= 1;
  const frontierDepth = converged ? newLo : null;

  return {
    ...state,
    lo: newLo,
    hi: newHi,
    widened,
    current_probe_depth: null,
    current_depth_probes: [],
    items_used: newItemsUsed,
    evidence: newEvidence,
    history: newHistory,
    converged,
    frontier_depth: frontierDepth,
  };
}

/**
 * Derives initial ability Elo from probe evidence and node baseline.
 */
export function eloFromEvidence(
  ev: { correct: number; total: number; rate?: number },
  baseElo: number = 1200
): number {
  const rate = ev.total > 0 ? ev.correct / ev.total : 0.5;
  let delta = 0;
  if (rate >= 1.0) delta = 200;
  else if (rate >= 0.75) delta = 150;
  else if (rate >= 0.66) delta = 50;
  else if (rate >= 0.5) delta = 0;
  else if (rate >= 0.33) delta = -50;
  else delta = -150;

  return Math.max(400, Math.min(2800, Math.round(baseElo + delta)));
}

/**
 * Propagates provisional mastery down the prerequisite DAG for all unverified
 * prerequisites of mastered nodes (§7.1).
 */
export function propagateMasteryDown(
  masteredNodeIds: readonly string[],
  graph: GraphLookup,
  evidence: Record<string, NodeEvidence> = {}
): readonly string[] {
  const provisionallyMastered = new Set<string>();
  const queue = [...masteredNodeIds];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = resolveGraphNode(graph, currentId);
    if (!node || !node.prerequisites) continue;

    for (const prereq of node.prerequisites) {
      const prereqId = prereq.node_id;
      // An unverified node is one not failing in evidence
      const ev = evidence[prereqId];
      const isFailed = ev && ev.total > 0 && ev.rate < 0.75;

      if (!isFailed && !provisionallyMastered.has(prereqId)) {
        provisionallyMastered.add(prereqId);
        queue.push(prereqId);
      }
    }
  }

  return Array.from(provisionallyMastered);
}

/**
 * Seeds initial learner state from placement evidence and prerequisite propagation.
 * Nodes with evidence.rate >= 0.75 or reached via propagateMasteryDown are marked
 * provisionally mastered with mastered_at = null.
 */
export function seedStateFromEvidence(
  evidence: Record<string, NodeEvidence>,
  frontier: readonly string[],
  graph: GraphLookup
): LearnerStateUpdate {
  const nodeStates: Record<string, Partial<NodeState>> = {};
  const directlyMastered: string[] = [];

  // 1. Evidence from directly probed nodes
  for (const [nodeId, ev] of Object.entries(evidence)) {
    const isMastered = ev.rate >= 0.75;
    if (isMastered) {
      directlyMastered.push(nodeId);
    }
    const nodeDifficulty = nodeDifficultyFromGraph(nodeId, graph);
    const ability = eloFromEvidence(ev, nodeDifficulty);

    nodeStates[nodeId] = {
      learner_id: "",
      node_id: nodeId,
      status: isMastered ? "mastered" : "available",
      mastered_at: null, // Provisional mastery carries mastered_at = null (§7.1)
      ability_elo: ability,
      attempts_total: ev.total,
      recent_window: [],
      distinct_days: [],
      max_tier_correct: isMastered ? 2 : 0,
      stability: 3.0,
      difficulty_fsrs: 5.0,
      due_at: null,
      lapses: 0,
    };
  }

  // 2. Propagate mastery down from frontier and directly mastered nodes
  const nodesToPropagate = Array.from(new Set([...frontier, ...directlyMastered]));
  const downMastered = propagateMasteryDown(nodesToPropagate, graph, evidence);

  for (const prereqId of downMastered) {
    if (!nodeStates[prereqId]) {
      const nodeDifficulty = nodeDifficultyFromGraph(prereqId, graph);
      nodeStates[prereqId] = {
        learner_id: "",
        node_id: prereqId,
        status: "mastered",
        mastered_at: null,
        ability_elo: nodeDifficulty,
        attempts_total: 0,
        recent_window: [],
        distinct_days: [],
        max_tier_correct: 0,
        stability: 3.0,
        difficulty_fsrs: 5.0,
        due_at: null,
        lapses: 0,
      };
    }
  }

  return { node_states: nodeStates };
}

/**
 * Backfills prerequisites of the identified frontier with Tier 1 items
 * within the remaining budget (up to 25 items total).
 */
export function backfillPrerequisites(
  state: PlacementState,
  frontier: readonly string[],
  graph: GraphLookup,
  administerFn?: (nodeId: string) => boolean
): PlacementState {
  if (!administerFn || state.items_used >= 25) {
    return state;
  }

  // Collect all prerequisites of frontier nodes
  const unverifiedPrereqs: string[] = [];
  const visited = new Set<string>();
  const queue = [...frontier];

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const node = resolveGraphNode(graph, currentId);
    if (!node || !node.prerequisites) continue;

    for (const prereq of node.prerequisites) {
      const prereqId = prereq.node_id;
      if (!visited.has(prereqId)) {
        visited.add(prereqId);
        queue.push(prereqId);
        if (!state.evidence[prereqId] || state.evidence[prereqId]!.total === 0) {
          unverifiedPrereqs.push(prereqId);
        }
      }
    }
  }

  let currentState = state;
  for (const prereqId of unverifiedPrereqs) {
    if (currentState.items_used >= 25) break;

    const correct = administerFn(prereqId);
    const prevEv = currentState.evidence[prereqId] ?? { correct: 0, total: 0, rate: 0 };
    const newCorrect = prevEv.correct + (correct ? 1 : 0);
    const newTotal = prevEv.total + 1;

    currentState = {
      ...currentState,
      items_used: currentState.items_used + 1,
      evidence: {
        ...currentState.evidence,
        [prereqId]: {
          correct: newCorrect,
          total: newTotal,
          rate: newCorrect / newTotal,
        },
      },
      history: [
        ...currentState.history,
        {
          node_id: prereqId,
          depth: getNodeDepth(graph, prereqId),
          correct,
          is_backfill: true,
        },
      ],
    };
  }

  return currentState;
}

/**
 * Finalizes placement. Computes the frontier as the last confirmed successful
 * depth (state.lo), NOT probeDepth on the final iteration (2026-07 correction).
 */
export function finalizePlacement(
  state: PlacementState,
  graph: GraphLookup
): PlacementResult {
  const frontierDepth = state.lo;
  const frontierNodes = getNodesAtDepth(graph, frontierDepth);
  const stateUpdate = seedStateFromEvidence(state.evidence, frontierNodes, graph);
  const atGraphFloor = frontierDepth <= state.graph_min_depth;

  return {
    learner_id: state.learner_id,
    subject: state.subject,
    frontier_depth: frontierDepth,
    frontier_nodes: frontierNodes,
    items_used: state.items_used,
    evidence: state.evidence,
    state_update: stateUpdate,
    history: state.history,
    at_graph_floor: atGraphFloor,
  };
}

/**
 * Convenience wrapper that drives the four placement steps in sequence.
 * Exists for the uninterrupted case; the step API is the real contract.
 */
export function place(
  learner: string | LearnerPlacementContext,
  subject: string,
  entryGradeHint: number | string,
  rng: () => number,
  options: {
    graph?: GraphLookup;
    administer?: (nodeId: string, tier: 1 | 2 | 3) => boolean;
  } = {}
): PlacementResult {
  const learnerId = typeof learner === "string" ? learner : learner.learner_id;
  const graph: GraphLookup = options.graph ?? {};
  const learnerContext = typeof learner !== "string" ? learner : undefined;

  const administerItem = (nodeId: string, tier: 1 | 2 | 3): boolean => {
    if (options.administer) {
      return options.administer(nodeId, tier);
    }
    if (learnerContext?.administer) {
      return learnerContext.administer(nodeId, tier);
    }
    if (typeof learnerContext?.true_ability === "number") {
      const nodeDiff = nodeDifficultyFromGraph(nodeId, graph);
      const itemDiff = nodeDiff + (tier === 1 ? -285 : -115);
      const expectedP = 1 / (1 + Math.pow(10, (itemDiff - learnerContext.true_ability) / 400));
      return rng() < expectedP;
    }
    return rng() >= 0.35;
  };

  // Step 1: Initialize
  let state = initPlacementState(learnerId, subject, entryGradeHint, graph);

  // Step 2: Binary Search Probe Loop
  while (nextProbeDepth(state) !== null) {
    const probeDepth = nextProbeDepth(state)!;
    const candidates = getNodesAtDepth(graph, probeDepth);

    for (let i = 0; i < 3 && state.items_used < 20; i++) {
      const nodeId =
        candidates.length > 0
          ? candidates[Math.floor(rng() * candidates.length)]!
          : `NODE_D${probeDepth}_${i}`;
      const correct = administerItem(nodeId, 2); // Tier 2 for probing (§7.1)
      state = recordProbeResult(state, nodeId, correct, probeDepth);
    }
  }

  // Step 3: Backfill unverified prerequisites of identified frontier
  const frontierNodes = getNodesAtDepth(graph, state.lo);
  state = backfillPrerequisites(state, frontierNodes, graph, (nodeId) =>
    administerItem(nodeId, 1)
  );

  // Step 4: Finalize and seed state
  return finalizePlacement(state, graph);
}
