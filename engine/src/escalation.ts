/**
 * engine/src/escalation.ts
 *
 * Escalation to tutor per docs/04-learning-engine-spec.md §9.
 *
 * The engine decides when to escalate; it never talks to a model (Tier 0 commitment).
 * Triggers when:
 *   - recent_window has at least 4 attempts
 *   - the last 4 attempts are all incorrect
 *   - at least one of the last 4 attempts used 3 hints (exhausted Tier 1 hints)
 *   - node was not escalated within the last 24 hours
 *
 * Emits Decision with action="escalate_to_tutor", node_id, and misconception_id.
 */

import type { NodeState, Decision } from "./state.js";

export interface EscalationCheckResult {
  readonly escalate: boolean;
  readonly misconceptionId?: string;
}

/**
 * Checks whether the learner on a given node should escalate to a human/AI tutor.
 * Pure function: takes the node state and current timestamp.
 *
 * @param node - The current NodeState
 * @param now  - Current ISO-8601 UTC timestamp
 */
export function shouldEscalate(
  node: NodeState,
  now: string
): EscalationCheckResult {
  const recent = node.recent_window;
  if (recent.length < 4) {
    return { escalate: false };
  }

  const last4 = recent.slice(-4);
  const allIncorrect = last4.every((a) => !a.correct);
  if (!allIncorrect) {
    return { escalate: false };
  }

  // Exhausted Tier 1 hints on at least one attempt in the last 4
  const anyExhaustedHints = last4.some((a) => a.hints_used === 3);
  if (!anyExhaustedHints) {
    return { escalate: false };
  }

  // 24-hour cooldown per node
  if (node.last_escalated_at) {
    const lastEscalatedMs = Date.parse(node.last_escalated_at);
    const nowMs = Date.parse(now);
    if (!Number.isNaN(lastEscalatedMs) && !Number.isNaN(nowMs)) {
      const hoursSince = (nowMs - lastEscalatedMs) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        return { escalate: false };
      }
    }
  }

  // Resolve misconception_id: latest non-null misconception from the last 4 attempts
  let misconceptionId: string | undefined = undefined;
  for (let i = last4.length - 1; i >= 0; i--) {
    const item = last4[i];
    if (item && item.misconception_id) {
      misconceptionId = item.misconception_id;
      break;
    }
  }

  return {
    escalate: true,
    ...(misconceptionId ? { misconceptionId } : {}),
  };
}

/**
 * Creates an `escalate_to_tutor` Decision.
 *
 * @param node - The NodeState triggering escalation
 * @param now  - Current ISO-8601 UTC timestamp
 * @param misconceptionId - Optional identified misconception
 */
export function escalateToTutor(
  node: NodeState,
  now: string,
  misconceptionId?: string
): Decision {
  void now;
  return {
    action: "escalate_to_tutor",
    node_id: node.node_id,
    item_id: null,
    misconception_id: misconceptionId ?? null,
    reason: "escalation_trigger",
  };
}

/**
 * Records an escalation on a NodeState, updating `last_escalated_at`.
 */
export function recordEscalation(
  node: NodeState,
  now: string
): NodeState {
  return {
    ...node,
    last_escalated_at: now,
  };
}
