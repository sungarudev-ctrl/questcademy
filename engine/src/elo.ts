/**
 * engine/src/elo.ts
 *
 * Elo rating system — doc 04 §5.
 *
 * HAND-VERIFIED. Do not modify without:
 *   1. Reading doc 04 §5, §5.1, §5.2, §5.3, §5.4 and every correction note therein.
 *   2. Updating the conformance vectors in engine/testdata/.
 *   3. Re-running `npm run test` to verify all 6 vectors pass.
 *
 * Purity contract (E-1, E-2):
 *   - Zero I/O, zero clock access, zero randomness.
 *   - No Math.log10, Math.log, or Math.pow(10, x) at module load or inside tierOffset (2026-07-29 note).
 *   - Fixed 4-decimal precision rounding immediately after every Elo update.
 */

import {
  SECURED_STATUSES,
  resolveGraphNode,
  resolveNodeState,
} from "./state.js";
import type {
  Attempt,
  DifficultyTier,
  GraphLookup,
  NodeState,
  NodeStateLookup,
} from "./state.js";

// ---------------------------------------------------------------------------
// Constants (§5.1, §5.3, §5.4)
//
// Baked as module constants rather than computed at runtime (doc 04 §5.1, §5.2).
// log10 is transcendental: V8 and Hermes may differ in last bits, breaking E-2 determinism.
// ---------------------------------------------------------------------------

/**
 * Midpoint offsets in Elo space from doc 05 §2 target p-values (§5.1 table):
 *   Tier 1 (Recognition, p=0.75–0.90) → -285
 *   Tier 2 (Fluency,     p=0.55–0.75) → -115
 *   Tier 3 (Transfer,    p=0.35–0.60) → +20
 */
export const TIER_OFFSETS: Readonly<Record<DifficultyTier, number>> = Object.freeze({
  1: -285,
  2: -115,
  3: 20,
});

export const ELO_MIN = 400;
export const ELO_MAX = 2800;
export const ELO_BASE = 1200;
export const ELO_PER_LEVEL = 25;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Rounds to 4 decimal places per doc 04 §5.2 (2026-07-29 determinism rule).
 */
export function round4(val: number): number {
  return Math.round(val * 10000) / 10000;
}

/**
 * Clamps Elo rating to [400, 2800] (§5.4).
 */
export function clampElo(val: number): number {
  return Math.min(ELO_MAX, Math.max(ELO_MIN, val));
}

// ---------------------------------------------------------------------------
// 1. tierOffset (§5.1)
// ---------------------------------------------------------------------------

/**
 * Returns the baked Elo offset for a difficulty tier.
 * Never computed dynamically via Math.log10.
 */
export function tierOffset(tier: DifficultyTier): number {
  return TIER_OFFSETS[tier];
}

// ---------------------------------------------------------------------------
// 2. itemInitialElo (§5.1)
// ---------------------------------------------------------------------------

/**
 * Initial item difficulty relative to its node (§5.1):
 *   item.difficulty_elo = node.difficulty_elo + tier_offset(tier)
 */
export function itemInitialElo(nodeElo: number, tier: DifficultyTier): number {
  return nodeElo + tierOffset(tier);
}

// ---------------------------------------------------------------------------
// 3. nodeDifficultyFromGraph (§5.1)
// ---------------------------------------------------------------------------

/**
 * Computes node difficulty derived from prerequisite graph position:
 *   level(n)          = 0 if n has no prerequisites, else 1 + max(level(p) for p in prerequisites(n))
 *   difficulty_elo(n) = 1200 + 25 * level(n)
 *
 * Rules:
 *   - Base 1200 equals cold-start ability fallback.
 *   - Soft prerequisites count (ordering recommendations and level is an ordering).
 *   - Cycle is an error: throws if detected (doc 02 §2.2 acyclicity / I-7).
 */
export function nodeDifficultyFromGraph(
  nodeId: string,
  graph: GraphLookup
): number {
  const visited = new Map<string, number>();
  const visiting = new Set<string>();

  function computeLevel(id: string): number {
    if (visiting.has(id)) {
      throw new Error(`Cycle detected in prerequisite graph involving node: ${id}`);
    }
    if (visited.has(id)) {
      return visited.get(id)!;
    }

    const node = resolveGraphNode(graph, id);
    if (!node || !node.prerequisites || node.prerequisites.length === 0) {
      visited.set(id, 0);
      return 0;
    }

    visiting.add(id);

    let maxPrereqLevel = 0;
    for (const prereq of node.prerequisites) {
      const prereqLevel = computeLevel(prereq.node_id);
      if (prereqLevel > maxPrereqLevel) {
        maxPrereqLevel = prereqLevel;
      }
    }

    visiting.delete(id);

    const level = 1 + maxPrereqLevel;
    visited.set(id, level);
    return level;
  }

  const level = computeLevel(nodeId);
  return ELO_BASE + ELO_PER_LEVEL * level;
}

// ---------------------------------------------------------------------------
// 4. abilitySeed (§5.1, corrected 2026-08-14)
// ---------------------------------------------------------------------------

/**
 * Seeds ability for a learner on a fresh node (§5.1):
 *   "else from the mean ability of mastered prerequisites, else 1200."
 *
 * Corrected 2026-08-14: "mastered" means I-1's secured set (mastered, needs_review, relearning),
 * NOT the literal status string 'mastered'.
 * Soft prerequisites do NOT count (hard prerequisites gate availability).
 * If no hard prerequisites are secured, returns 1200.
 */
export function abilitySeed(
  learnerId: string,
  nodeId: string,
  stateLookup: NodeStateLookup,
  graph: GraphLookup
): number {
  void learnerId;
  const node = resolveGraphNode(graph, nodeId);
  if (!node || !node.prerequisites || node.prerequisites.length === 0) {
    return ELO_BASE;
  }

  // Hard prerequisites only
  const hardPrereqs = node.prerequisites.filter((p) => p.type === "hard");
  if (hardPrereqs.length === 0) {
    return ELO_BASE;
  }

  let totalAbility = 0;
  let securedCount = 0;

  for (const prereq of hardPrereqs) {
    const prereqState = resolveNodeState(stateLookup, prereq.node_id);
    if (prereqState && SECURED_STATUSES.has(prereqState.status)) {
      totalAbility += prereqState.ability_elo;
      securedCount++;
    }
  }

  if (securedCount === 0) {
    return ELO_BASE;
  }

  return round4(totalAbility / securedCount);
}

// ---------------------------------------------------------------------------
// 5. updateElo (§5.2, §5.3, §5.4)
// ---------------------------------------------------------------------------

/**
 * Updates learner ability_elo and item difficulty_elo per doc 04 §5.2.
 *
 * Expected score:
 *   expected = 1 / (1 + 10^((difficulty - ability) / 400))
 *
 * Actual score:
 *   score = 1.0 (correct && unhinted)
 *         | 0.5 (correct && hinted)
 *         | 0.0 (otherwise)
 *
 * K-factors:
 *   Learner K (by attempts_total):
 *     < 10      → 40
 *     10 .. <30 → 24
 *     >= 30     → 16
 *   Item K (by itemResponseCount):
 *     < 50      → 32 (uncalibrated)
 *     50 .. <200→ 16
 *     >= 200    → 8  (calibrated)
 *
 * Guards (§5.4):
 *   - Review attempts update ability at half K (retention, not acquisition).
 *   - Exam attempts update ability at half K and NEVER update item difficulty.
 *   - Latency < 1500ms on Tier 3 flagged suspicious_fast; excluded from item difficulty update.
 *   - Both ratings clamped to [400, 2800].
 *   - Both ratings rounded to 4 decimals immediately before returning.
 */
export function updateElo(
  state: NodeState,
  attempt: Attempt,
  nodeElo: number,
  itemResponseCount: number
): NodeState {
  const itemDifficulty = itemInitialElo(nodeElo, attempt.difficulty_tier);
  const ability = state.ability_elo;

  // 1. Expected score
  const expected = 1 / (1 + Math.pow(10, (itemDifficulty - ability) / 400));

  // 2. Actual score (§5.2)
  let score = 0.0;
  if (attempt.correct && attempt.hints_used === 0) {
    score = 1.0;
  } else if (attempt.correct && attempt.hints_used > 0) {
    score = 0.5;
  } else {
    score = 0.0;
  }

  // 3. Learner K-factor (§5.3)
  let kLearner: number;
  if (state.attempts_total < 10) {
    kLearner = 40;
  } else if (state.attempts_total < 30) {
    kLearner = 24;
  } else {
    kLearner = 16;
  }

  // Review attempts at half K (§5.4)
  if (attempt.is_review) {
    kLearner /= 2;
  }
  // Exam attempts at half K (§5.4)
  if (attempt.is_exam) {
    kLearner /= 2;
  }

  // 4. Item K-factor (§5.3)
  let kItem: number;
  if (itemResponseCount < 50) {
    kItem = 32;
  } else if (itemResponseCount < 200) {
    kItem = 16;
  } else {
    kItem = 8;
  }

  // Exam attempts never update item difficulty (§5.4)
  if (attempt.is_exam) {
    kItem = 0;
  }

  // Latency guard: latency < 1500ms on Tier 3 excluded from item difficulty update (§5.4)
  if (attempt.difficulty_tier === 3 && attempt.latency_ms < 1500) {
    kItem = 0;
  }

  // 5. Updates
  const rawNewAbility = ability + kLearner * (score - expected);
  const rawNewDifficulty = itemDifficulty + kItem * (expected - score);

  // 6. Rounding to 4 decimals & clamping to [400, 2800]
  const roundedAbility = round4(clampElo(rawNewAbility));
  const roundedDifficulty = round4(clampElo(rawNewDifficulty));

  return {
    ...state,
    ability_elo: roundedAbility,
    difficulty_elo: roundedDifficulty,
    attempts_total: state.attempts_total + 1,
  };
}
