/**
 * web/src/lib/engine/engineClient.ts
 *
 * Client adapter bridging client state to pure deterministic @questcademy/engine functions.
 * Per specification §10.1: Client never reimplements mastery or scheduling rules.
 */

import {
  isMastered,
  updateElo,
  selectNextItem,
  retrievability,
  onReview,
  onMastery,
  type Attempt,
  type NodeState,
  type Item,
  type DifficultyTier,
  type HintsUsed,
} from "@questcademy/engine";
import type { ClientNodeState } from "../stores/useNodeStateStore";

/**
 * Converts a ClientNodeState into an engine-compatible NodeState.
 */
export function toEngineNodeState(clientState: ClientNodeState): NodeState {
  const engineAttempts: Attempt[] = clientState.recent_window.map((snap, i) => ({
    attempt_id: `client-att-${i}-${snap.date}`,
    learner_id: "client-learner",
    node_id: clientState.node_id,
    item_id: `item-${i}`,
    difficulty_tier: snap.tier as DifficultyTier,
    correct: snap.correct,
    partial_credit: snap.correct ? 1.0 : 0.0,
    selected_option: null,
    misconception_id: null,
    latency_ms: 1000,
    hints_used: snap.hints_used as HintsUsed,
    session_id: "session-client",
    occurred_at: `${snap.date}T12:00:00Z`,
    is_review: false,
    is_placement: false,
    is_exam: false,
  }));

  const distinctDays = Array.from(
    new Set(
      clientState.recent_window
        .filter((a) => a.correct && a.hints_used === 0)
        .map((a) => a.date)
    )
  );

  return {
    learner_id: "client-learner",
    node_id: clientState.node_id,
    status: clientState.status,
    ability_elo: 1200,
    attempts_total: engineAttempts.length,
    recent_window: engineAttempts,
    distinct_days: distinctDays,
    max_tier_correct: (clientState.max_tier_correct || 0) as 0 | 1 | 2 | 3,
    mastered_at: clientState.status === "mastered" ? "2026-09-12T00:00:00Z" : null,
    stability: clientState.stability,
    difficulty_fsrs: clientState.difficulty_fsrs,
    due_at: clientState.due_at,
    lapses: engineAttempts.filter((a) => !a.correct).length,
  };
}

/**
 * Evaluates mastery using the authoritative engine predicate.
 */
export function checkAuthoritativeMastery(clientState: ClientNodeState): boolean {
  const engineState = toEngineNodeState(clientState);
  return isMastered(engineState);
}

/**
 * Updates learner ability_elo using engine math.
 */
export function computeEloChange(
  state: NodeState,
  attempt: Attempt,
  nodeElo = 1200,
  itemResponseCount = 100
): NodeState {
  return updateElo(state, attempt, nodeElo, itemResponseCount);
}

/**
 * Client-side item selection adapter from available node item pool.
 */
export function pickNextPracticeItem(
  items: Item[],
  nodeState: NodeState,
  rng: () => number = Math.random
): string | null {
  if (!items || items.length === 0) return null;

  try {
    const decision = selectNextItem(
      {
        learner_id: nodeState.learner_id,
        items_since_review: 0,
        itemPool: items,
      },
      {
        ...nodeState,
        items,
      },
      new Date().toISOString(),
      rng
    );

    if (decision.item_id) {
      return decision.item_id;
    }
  } catch {
    // Fallback: pick first item
  }

  return items[0]?.item_id ?? null;
}

/**
 * Computes memory retrievability for a given node.
 */
export function getMemoryRetrievability(stability: number, elapsedDays: number): number {
  return retrievability(stability, elapsedDays);
}

/**
 * Computes next review schedule on attempt.
 */
export function computeReviewSchedule(
  node: NodeState,
  correct: boolean,
  now: string = new Date().toISOString()
): NodeState {
  return onReview(node, correct, now);
}
