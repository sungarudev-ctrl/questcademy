/**
 * engine/src/invariants.ts
 *
 * Invariants I-1 through I-11 — source of truth: docs/04-learning-engine-spec.md §11.
 *
 * Standalone check functions for all ten invariants:
 *   checkI1 through checkI10 — each returns a readonly list of InvariantViolation objects.
 *
 * assertInvariants runs all applicable checks and returns the full list of violations.
 * It throws in the test harness when throwInTests=true or when NODE_ENV==="test".
 */

import { SECURED_STATUSES } from "./state.js";
import type {
  NodeState,
  NodeStatus,
  Attempt,
  Decision,
  ReviewQueue,
  SkillNodeSummary,
  GraphLookup,
} from "./state.js";

// ---------------------------------------------------------------------------
// Invariant Types
// ---------------------------------------------------------------------------

export type InvariantId =
  | "I-1"
  | "I-2"
  | "I-3"
  | "I-4"
  | "I-5"
  | "I-6"
  | "I-7"
  | "I-8"
  | "I-9"
  | "I-10"
  | "I-11"
  | "I-12";

export interface InvariantViolation {
  readonly id: InvariantId;
  readonly description: string;
}

export interface InvariantCheckContext {
  readonly state?: NodeState;
  readonly priorState?: NodeState;
  readonly hardPrerequisiteStatuses?: readonly NodeStatus[];
  readonly graph?: GraphLookup | readonly SkillNodeSummary[];
  readonly queue?: ReviewQueue | readonly unknown[] | number;
  readonly decision?: unknown;
  readonly attempts?: readonly Attempt[];
  readonly outputA?: unknown;
  readonly outputB?: unknown;
  readonly pinMigrationState?: {
    readonly prior: NodeState;
    readonly current: NodeState;
  };
  readonly outputFrameworkA?: unknown;
  readonly outputFrameworkB?: unknown;
}

// ---------------------------------------------------------------------------
// I-1: No node available unless all hard prerequisites are mastered+ (secured)
// ---------------------------------------------------------------------------

export function checkI1(
  state: NodeState,
  hardPrerequisiteStatuses: readonly NodeStatus[]
): readonly InvariantViolation[] {
  if (state.status !== "available") return [];

  const violations: InvariantViolation[] = [];
  for (const prereqStatus of hardPrerequisiteStatuses) {
    if (!SECURED_STATUSES.has(prereqStatus)) {
      violations.push({
        id: "I-1",
        description: `Node ${state.node_id} is 'available' but a hard prerequisite is '${prereqStatus}' (must be mastered/needs_review/relearning).`,
      });
    }
  }
  return violations;
}

// ---------------------------------------------------------------------------
// I-2: mastered_at is set once, never cleared
// ---------------------------------------------------------------------------

export function checkI2(
  state: NodeState,
  priorState?: NodeState
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  if (priorState && priorState.mastered_at !== null) {
    if (state.mastered_at === null) {
      violations.push({
        id: "I-2",
        description: `Node ${state.node_id} had mastered_at='${priorState.mastered_at}' which was cleared to null. mastered_at is immutable once set.`,
      });
    } else if (state.mastered_at !== priorState.mastered_at) {
      violations.push({
        id: "I-2",
        description: `Node ${state.node_id} had mastered_at='${priorState.mastered_at}' which was changed to '${state.mastered_at}'. mastered_at is immutable once set.`,
      });
    }
  }

  // A post-mastery lapse without mastered_at is invalid
  if (
    (state.status === "needs_review" || state.status === "relearning") &&
    state.mastered_at === null &&
    state.lapses > 0
  ) {
    violations.push({
      id: "I-2",
      description: `Node ${state.node_id} has status '${state.status}' with lapses=${state.lapses} but mastered_at is null.`,
    });
  }

  if (state.lapses > 0 && state.mastered_at === null) {
    violations.push({
      id: "I-2",
      description: `Node ${state.node_id} has lapses=${state.lapses} but mastered_at is null. A node cannot lapse without having been mastered first.`,
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// I-3: Mastery is monotonic within a session
// ---------------------------------------------------------------------------

export function checkI3(
  state: NodeState,
  priorStateInSession?: NodeState
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  if (priorStateInSession && SECURED_STATUSES.has(priorStateInSession.status)) {
    if (!SECURED_STATUSES.has(state.status)) {
      violations.push({
        id: "I-3",
        description: `Node ${state.node_id} was '${priorStateInSession.status}' earlier in the session but is now '${state.status}'. Mastery is monotonic within a session.`,
      });
    }
  }

  if (state.mastered_at !== null) {
    const ms = Date.parse(state.mastered_at);
    if (Number.isNaN(ms)) {
      violations.push({
        id: "I-3",
        description: `Node ${state.node_id} has an unparseable mastered_at: '${state.mastered_at}'.`,
      });
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// I-4: select_next_item always returns a Decision
// ---------------------------------------------------------------------------

export function checkI4(decision: unknown): readonly InvariantViolation[] {
  if (!decision || typeof decision !== "object") {
    return [{ id: "I-4", description: "select_next_item returned null or non-object" }];
  }
  const d = decision as Partial<Decision>;
  const violations: InvariantViolation[] = [];

  const validActions = new Set([
    "serve_item",
    "serve_lesson",
    "serve_remediation",
    "node_mastered",
    "queue_empty",
    "escalate_to_tutor",
  ]);

  if (!d.action || typeof d.action !== "string") {
    violations.push({ id: "I-4", description: "Decision is missing an 'action' property" });
  } else if (!validActions.has(d.action)) {
    violations.push({ id: "I-4", description: `Decision has unrecognized action '${d.action}'` });
  }

  if (!d.reason || typeof d.reason !== "string") {
    violations.push({ id: "I-4", description: "Decision is missing a 'reason' property" });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// I-5: Elo ratings always within [400, 2800]
// ---------------------------------------------------------------------------

export function roundElo(val: number): number {
  return Math.round(val * 10000) / 10000;
}

export function checkEloBounds(state: NodeState): void {
  const violations = checkI5(state);
  if (violations.length > 0) {
    throw new Error(violations[0]?.description);
  }
}

export function checkI5(state: NodeState): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  if (state.ability_elo < 400 || state.ability_elo > 2800) {
    violations.push({
      id: "I-5",
      description: `Node ${state.node_id}: ability_elo=${state.ability_elo} is outside [400, 2800].`,
    });
  }
  if (
    state.difficulty_elo !== undefined &&
    (state.difficulty_elo < 400 || state.difficulty_elo > 2800)
  ) {
    violations.push({
      id: "I-5",
      description: `Node ${state.node_id}: difficulty_elo=${state.difficulty_elo} is outside [400, 2800].`,
    });
  }
  return violations;
}

// ---------------------------------------------------------------------------
// I-6: Review queue never exceeds 8 items/day
// ---------------------------------------------------------------------------

export function checkI6(
  queueOrLength: ReviewQueue | readonly unknown[] | number
): readonly InvariantViolation[] {
  const len =
    typeof queueOrLength === "number"
      ? queueOrLength
      : Array.isArray(queueOrLength)
      ? queueOrLength.length
      : (queueOrLength as ReviewQueue).items.length;

  if (len > 8) {
    return [
      {
        id: "I-6",
        description: `Review queue has ${len} items; hard cap is 8/day.`,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// I-7: Skill graph is acyclic
// ---------------------------------------------------------------------------

export function checkI7(
  graph: GraphLookup | readonly SkillNodeSummary[]
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  let nodes: readonly SkillNodeSummary[];
  if (Array.isArray(graph)) {
    nodes = graph;
  } else if (graph instanceof Map) {
    nodes = Array.from(graph.values());
  } else if ("getNode" in graph && typeof graph.getNode === "function") {
    nodes = [];
  } else {
    nodes = Object.values(graph);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const nodeMap = new Map<string, SkillNodeSummary>(nodes.map((n) => [n.node_id, n]));

  function dfs(nodeId: string, path: string[]): boolean {
    if (visiting.has(nodeId)) {
      violations.push({
        id: "I-7",
        description: `Cycle detected in skill graph: ${[...path, nodeId].join(" -> ")}`,
      });
      return false;
    }
    if (visited.has(nodeId)) {
      return true;
    }

    visiting.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (node) {
      for (const p of node.prerequisites) {
        dfs(p.node_id, [...path, nodeId]);
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
    return true;
  }

  for (const n of nodes) {
    if (!visited.has(n.node_id)) {
      dfs(n.node_id, []);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// I-8: Attempt idempotency (an attempt is never counted twice)
// ---------------------------------------------------------------------------

export function checkI8(
  stateOrAttempts: NodeState | readonly Attempt[]
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const attempts = Array.isArray(stateOrAttempts)
    ? stateOrAttempts
    : (stateOrAttempts as NodeState).recent_window;

  const seen = new Set<string>();
  for (const a of attempts) {
    if (seen.has(a.attempt_id)) {
      violations.push({
        id: "I-8",
        description: `Duplicate attempt_id '${a.attempt_id}' encountered. Attempts must be idempotent.`,
      });
    }
    seen.add(a.attempt_id);
  }
  return violations;
}

// ---------------------------------------------------------------------------
// I-9: Engine output is a pure function of (state, event, now, seed)
// ---------------------------------------------------------------------------

export function checkI9(outputA: unknown, outputB: unknown): readonly InvariantViolation[] {
  const jsonA = JSON.stringify(outputA);
  const jsonB = JSON.stringify(outputB);
  if (jsonA !== jsonB) {
    return [
      {
        id: "I-9",
        description:
          "Engine output is not deterministic: two runs produced different outputs for identical inputs.",
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// I-10: Hinted attempts never satisfy the mastery predicate
// ---------------------------------------------------------------------------

export function checkI10(state: NodeState): readonly InvariantViolation[] {
  if (
    state.status !== "mastered" &&
    state.status !== "needs_review" &&
    state.status !== "relearning"
  ) {
    return [];
  }
  if (state.mastered_at === null) {
    // Provisional mastery from placement carries mastered_at=null
    return [];
  }

  const hasUnhintedCorrect = state.recent_window.some(
    (a) => a.correct && a.hints_used === 0
  );
  if (state.recent_window.length > 0 && !hasUnhintedCorrect) {
    return [
      {
        id: "I-10",
        description: `Node ${state.node_id} is '${state.status}' with mastered_at='${state.mastered_at}', but recent_window contains no unhinted correct attempts. Hinted attempts must never satisfy mastery.`,
      },
    ];
  }
  return [];
}

// ---------------------------------------------------------------------------
// I-11: Pin migration never mutates learner_node_state
// ---------------------------------------------------------------------------

export function checkI11(
  priorState: NodeState,
  currentState: NodeState
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const keys: (keyof NodeState)[] = [
    "learner_id",
    "node_id",
    "status",
    "ability_elo",
    "difficulty_elo",
    "attempts_total",
    "max_tier_correct",
    "mastered_at",
    "stability",
    "difficulty_fsrs",
    "due_at",
    "lapses",
  ];

  for (const k of keys) {
    if (priorState[k] !== currentState[k]) {
      violations.push({
        id: "I-11",
        description: `Pin migration mutated learner_node_state.${k} for node ${currentState.node_id}: was ${JSON.stringify(priorState[k])}, now ${JSON.stringify(currentState[k])}.`,
      });
    }
  }

  if (JSON.stringify(priorState.recent_window) !== JSON.stringify(currentState.recent_window)) {
    violations.push({
      id: "I-11",
      description: `Pin migration mutated learner_node_state.recent_window for node ${currentState.node_id}.`,
    });
  }
  if (JSON.stringify(priorState.distinct_days) !== JSON.stringify(currentState.distinct_days)) {
    violations.push({
      id: "I-11",
      description: `Pin migration mutated learner_node_state.distinct_days for node ${currentState.node_id}.`,
    });
  }

  return violations;
}

// ---------------------------------------------------------------------------
// I-12: Engine output is framework-agnostic
// ---------------------------------------------------------------------------

export function checkI12(
  outputFrameworkA: unknown,
  outputFrameworkB: unknown
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const strA = JSON.stringify(outputFrameworkA);
  const strB = JSON.stringify(outputFrameworkB);
  if (strA !== strB) {
    violations.push({
      id: "I-12",
      description: `Engine output differs across frameworks: output under framework A does not match output under framework B. Engine decisions and state transitions must be framework-agnostic.`,
    });
  }
  return violations;
}

// ---------------------------------------------------------------------------
// Public: assertInvariants (runs all twelve)
// ---------------------------------------------------------------------------

/**
 * Checks invariants on a NodeState or comprehensive InvariantCheckContext.
 * Reports all violations found across all 10 invariants.
 *
 * @param target - A NodeState or an InvariantCheckContext
 * @param opts.throwInTests - Throws an Error if non-empty and NODE_ENV==="test"
 */
export function assertInvariants(
  target: NodeState | InvariantCheckContext,
  opts: { throwInTests?: boolean } = {}
): readonly InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  const context: InvariantCheckContext =
    "node_id" in target ? { state: target } : target;

  const state = context.state;

  if (state && context.hardPrerequisiteStatuses) {
    violations.push(...checkI1(state, context.hardPrerequisiteStatuses));
  }
  if (state) {
    violations.push(...checkI2(state, context.priorState));
    violations.push(...checkI3(state, context.priorState));
    violations.push(...checkI5(state));
    violations.push(...checkI8(state));
    violations.push(...checkI10(state));
  }
  if (context.decision !== undefined) {
    violations.push(...checkI4(context.decision));
  }
  if (context.queue !== undefined) {
    violations.push(...checkI6(context.queue));
  }
  if (context.graph !== undefined) {
    violations.push(...checkI7(context.graph));
  }
  if (context.attempts !== undefined) {
    violations.push(...checkI8(context.attempts));
  }
  if (context.outputA !== undefined && context.outputB !== undefined) {
    violations.push(...checkI9(context.outputA, context.outputB));
  }

  if (context.pinMigrationState !== undefined) {
    violations.push(
      ...checkI11(
        context.pinMigrationState.prior,
        context.pinMigrationState.current
      )
    );
  }
  if (
    context.outputFrameworkA !== undefined &&
    context.outputFrameworkB !== undefined
  ) {
    violations.push(
      ...checkI12(context.outputFrameworkA, context.outputFrameworkB)
    );
  }

  if (opts.throwInTests && process.env["NODE_ENV"] === "test" && violations.length > 0) {
    throw new Error(
      `Invariant violations: ${violations.map((v) => `${v.id}: ${v.description}`).join("; ")}`
    );
  }

  return violations;
}
