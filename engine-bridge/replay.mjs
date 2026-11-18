// Replays attempts through the real engine. Pure: no clock, no I/O except stdin/stdout in cli.mjs.
import { transition } from "../engine/dist/index.js";
import { canonicalJson, stateHash } from "./canonical.mjs";

export const ORDER_VERSION = 1;

export function initialNodeState(learnerId, nodeId) {
  return {
    learner_id: learnerId,
    node_id: nodeId,
    status: "available",
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
}

// Sync contract §12.1: order by (occurred_at, attempt_id), plain code-unit comparison, never locale.
export function compareAttempts(a, b) {
  const ta = Date.parse(a.occurred_at);
  const tb = Date.parse(b.occurred_at);
  if (ta !== tb) return ta - tb;
  return a.attempt_id < b.attempt_id ? -1 : a.attempt_id > b.attempt_id ? 1 : 0;
}

/**
 * request: { attempts: Attempt[], initial_states?: NodeState[] , excluded_attempt_ids?: string[] }
 * Excluded attempts (retired item, flagged >30d) are NOT replayed: they never touch Elo or mastery.
 * Duplicate attempt_ids are ignored after the first in sorted order (I-8).
 * response: { learners: { [learner_id]: { nodes: {[node_id]: NodeState}, hash } }, hash, applied: string[], skipped_duplicates: string[] }
 */
export function replay(request) {
  const excluded = new Set(request.excluded_attempt_ids ?? []);
  const sorted = [...request.attempts].sort(compareAttempts);
  const states = new Map();
  for (const s of request.initial_states ?? []) states.set(s.learner_id + "\u0000" + s.node_id, s);
  const seen = new Set();
  const applied = [];
  const skippedDuplicates = [];
  for (const attempt of sorted) {
    if (seen.has(attempt.attempt_id)) {
      skippedDuplicates.push(attempt.attempt_id);
      continue;
    }
    seen.add(attempt.attempt_id);
    if (excluded.has(attempt.attempt_id)) continue;
    const key = attempt.learner_id + "\u0000" + attempt.node_id;
    const prior = states.get(key) ?? initialNodeState(attempt.learner_id, attempt.node_id);
    states.set(key, transition(prior, attempt, attempt.occurred_at));
    applied.push(attempt.attempt_id);
  }
  const learners = {};
  for (const state of [...states.values()].sort((x, y) =>
    (x.learner_id + x.node_id) < (y.learner_id + y.node_id) ? -1 : 1)) {
    learners[state.learner_id] ??= { nodes: {} };
    learners[state.learner_id].nodes[state.node_id] = state;
  }
  for (const id of Object.keys(learners)) learners[id].hash = stateHash(learners[id].nodes);
  return { learners, hash: stateHash(learners), applied, skipped_duplicates: skippedDuplicates };
}

export { canonicalJson, stateHash };
