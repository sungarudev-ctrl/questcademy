/**
 * engine/src/statemachine.ts
 *
 * Node state machine transitions and availability checks.
 * Source of truth: docs/04-learning-engine-spec.md §3, §4, §8, §11 (I-1).
 *
 * Every transition is a pure function of NodeState and the triggering event.
 * locked -> available enforces I-1: all hard prerequisites must be in SECURED_STATUSES
 * (mastered, needs_review, relearning). Soft prerequisites never gate.
 */

import {
  SECURED_STATUSES,
  resolveNodeState,
  isQualifying,
} from "./state.js";
import type {
  NodeState,
  NodeStatus,
  Attempt,
  SkillNodeSummary,
  GraphLookup,
  NodeStateLookup,
} from "./state.js";
import { isMastered } from "./mastery.js";
import { updateElo } from "./elo.js";
import { onMastery, onReview } from "./srs.js";

// ---------------------------------------------------------------------------
// Availability Checks (I-1)
// ---------------------------------------------------------------------------

/**
 * Checks whether a node's prerequisites are met under I-1.
 * Returns true if ALL hard prerequisites are in the secured set
 * (mastered | needs_review | relearning).
 *
 * - An unsecured hard prerequisite gates availability.
 * - Missing state for a hard prerequisite gates availability.
 * - Soft prerequisites never gate availability.
 * - Nodes with no hard prerequisites are always available.
 */
export function checkAvailability(
  node: SkillNodeSummary,
  prerequisiteStates: NodeStateLookup
): boolean {
  const hardPrereqs = node.prerequisites.filter((p) => p.type === "hard");
  if (hardPrereqs.length === 0) {
    return true;
  }

  for (const prereq of hardPrereqs) {
    const state = resolveNodeState(prerequisiteStates, prereq.node_id);
    if (!state) {
      return false;
    }
    if (!SECURED_STATUSES.has(state.status)) {
      return false;
    }
  }

  return true;
}

/**
 * Computes all available nodes in a graph for a given learner state.
 * A node is available if all its hard prerequisites are satisfied (I-1).
 *
 * @param graph - The skill graph
 * @param stateLookup - Lookup for learner node states
 */
export function computeAvailableNodes(
  graph: GraphLookup,
  stateLookup: NodeStateLookup
): readonly string[] {
  const available: string[] = [];

  let nodeSummaries: readonly SkillNodeSummary[];
  if ("getNode" in graph && typeof graph.getNode === "function") {
    // If SkillGraphLike without iteration, caller will need a known list of IDs or map
    // We handle Map or Record iteration directly
    nodeSummaries = [];
  } else if (graph instanceof Map) {
    nodeSummaries = Array.from(graph.values());
  } else {
    nodeSummaries = Object.values(graph);
  }

  for (const node of nodeSummaries) {
    if (checkAvailability(node, stateLookup)) {
      available.push(node.node_id);
    }
  }

  return available;
}

/**
 * Computes the learner's frontier nodes per doc 01 §3.2 and doc 04 §12:
 *   frontier = available_nodes \ secured_nodes
 *
 * The frontier contains available nodes that have not yet been mastered/secured.
 */
export function computeFrontierNodes(
  graph: GraphLookup,
  stateLookup: NodeStateLookup
): readonly string[] {
  const available = computeAvailableNodes(graph, stateLookup);
  return available.filter((nodeId) => {
    const state = resolveNodeState(stateLookup, nodeId);
    if (!state) return true;
    return !SECURED_STATUSES.has(state.status);
  });
}

// ---------------------------------------------------------------------------
// Transition Events & Pure State Transitions
// ---------------------------------------------------------------------------

export type StateTransitionEvent =
  | { readonly type: "attempt"; readonly attempt: Attempt }
  | { readonly type: "check_due" }
  | { readonly type: "placement_override"; readonly targetStatus?: NodeStatus }
  | { readonly type: "unlock"; readonly hardPrerequisiteStatuses?: readonly NodeStatus[] };

/**
 * Executes a pure state machine transition per doc 04 §3.
 *
 * @param node  - Current NodeState
 * @param event - The triggering event (Attempt or explicit trigger)
 * @param now   - Current ISO-8601 UTC timestamp
 * @param context - Optional context (e.g. prerequisite statuses for unlocking)
 */
export function transition(
  node: NodeState,
  event: Attempt | StateTransitionEvent,
  now: string,
  context?: { readonly hardPrerequisiteStatuses?: readonly NodeStatus[] }
): NodeState {
  // Normalize event
  const isAttemptEvent = "attempt_id" in event;
  const evt: StateTransitionEvent = isAttemptEvent
    ? { type: "attempt", attempt: event }
    : event;

  // 1. Placement override: re-diagnosis explicitly demotes/sets status (doc 04 §3)
  if (evt.type === "placement_override") {
    return {
      ...node,
      status: evt.targetStatus ?? "available",
    };
  }

  // 2. Unlock: locked -> available
  if (evt.type === "unlock") {
    if (node.status !== "locked") {
      return node;
    }
    const prereqs = evt.hardPrerequisiteStatuses ?? context?.hardPrerequisiteStatuses ?? [];
    const allSecured = prereqs.every((s) => SECURED_STATUSES.has(s));
    if (allSecured) {
      return {
        ...node,
        status: "available",
      };
    }
    return node;
  }

  // 3. Time-triggered due check: mastered -> needs_review (doc 04 §3)
  if (evt.type === "check_due") {
    if (node.status === "mastered" && node.due_at !== null) {
      const nowMs = Date.parse(now);
      const dueMs = Date.parse(node.due_at);
      if (!Number.isNaN(nowMs) && !Number.isNaN(dueMs) && nowMs >= dueMs) {
        return {
          ...node,
          status: "needs_review",
        };
      }
    }
    return node;
  }

  // 4. Attempt-driven transitions
  if (evt.type === "attempt") {
    const attempt = evt.attempt;

    // Review / post-mastery states: needs_review, relearning, and mastered (per doc 04 §3 note)
    if (
      node.status === "needs_review" ||
      node.status === "relearning" ||
      (node.status === "mastered" && (attempt.is_review || (node.due_at && Date.parse(now) >= Date.parse(node.due_at))))
    ) {
      return onReview(node, attempt.correct, now, undefined, attempt.hints_used);
    }

    // Available -> in_progress (on first non-placement attempt)
    let currentStatus: NodeStatus = node.status;
    if (currentStatus === "available" && !attempt.is_placement) {
      currentStatus = "in_progress";
    }

    // Update attempts window and metadata
    let newWindow = node.recent_window;
    if (isQualifying(attempt)) {
      newWindow = [...node.recent_window.slice(-4), attempt];
    }

    // Update distinct days cache
    let newDistinctDays = node.distinct_days;
    if (attempt.correct && attempt.hints_used === 0) {
      const day = attempt.occurred_at.slice(0, 10);
      if (!node.distinct_days.includes(day)) {
        newDistinctDays = [...node.distinct_days, day].slice(-10);
      }
    }

    // Update max tier correct (§2.1 v2: only qualifying attempts with hints_used === 0)
    let newMaxTier = node.max_tier_correct;
    if (
      attempt.correct &&
      attempt.hints_used === 0 &&
      isQualifying(attempt) &&
      attempt.difficulty_tier > newMaxTier
    ) {
      newMaxTier = attempt.difficulty_tier;
    }

    // Update Elo (§5)
    const nodeDifficulty = node.difficulty_elo ?? 1200;
    const eloUpdated = updateElo(
      node,
      attempt,
      nodeDifficulty,
      node.attempts_total
    );

    const updatedNode: NodeState = {
      ...eloUpdated,
      status: currentStatus,
      attempts_total: node.attempts_total + 1,
      recent_window: newWindow,
      distinct_days: newDistinctDays,
      max_tier_correct: newMaxTier,
    };

    // Check mastery predicate (§4)
    if (currentStatus === "in_progress" && isMastered(updatedNode)) {
      return onMastery(updatedNode, now);
    }

    return updatedNode;
  }

  return node;
}
