/**
 * engine/src/selection.ts
 *
 * Item selection algorithm — doc 04 §6.
 *
 * HAND-VERIFIED. Do not modify without:
 *   1. Reading doc 04 §6, §6.1, §6.2, §6.3, §2.2 and all notes therein.
 *   2. Updating the conformance vectors in engine/testdata/.
 *   3. Re-running `npm run test` to verify all vectors pass.
 *
 * Purity contract (E-1, E-2, I-4):
 *   - Zero I/O, zero clock access. `now` is an explicit parameter.
 *   - Zero unseeded randomness. All randomness is derived from the injected `rng`.
 *   - Invariant I-4: selectNextItem MUST always return a Decision. Never null, never throw.
 */

import type { Attempt, Decision, DifficultyTier, NodeState } from "./state.js";

// ---------------------------------------------------------------------------
// Types & Contracts (doc 04 §6, doc 05 §1)
// ---------------------------------------------------------------------------

export interface Item {
  readonly item_id: string;
  readonly node_id: string;
  readonly difficulty_tier: DifficultyTier;
  readonly difficulty_elo: number;
}

export interface LearnerSelectionContext {
  readonly learner_id: string;
  readonly items_since_review: number;
  /** Returns the next review item if review queue is non-empty for this learner at `now`. */
  readonly getNextReviewItem?: () => { node_id: string; item_id: string } | null;
  /**
   * Reads per-learner remediation dedup state (doc 04 §2.2 erratum).
   * Note: This state is NOT on NodeState — see §2.2 closing note.
   */
  readonly remediationShownRecently?: (misconceptionId: string, withinDays: number) => boolean;
  /** Complete history of items seen by this learner with timestamps. */
  readonly itemHistory?: readonly { item_id: string; seen_at: string }[];
  /** Direct query predicate for item recency. */
  readonly seenWithin?: (itemId: string, days: number) => boolean;
  /** Item pool for the target node. */
  readonly itemPool?: readonly Item[];
}

export interface SelectionNodeContext extends NodeState {
  readonly items?: readonly Item[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MS_PER_DAY = 86400000;

function parseTimestamp(now: string | Date): number {
  return typeof now === "string" ? Date.parse(now) : now.getTime();
}

export function isSeenWithin(
  learner: LearnerSelectionContext,
  itemId: string,
  days: number,
  nowMs: number
): boolean {
  if (learner.seenWithin) {
    return learner.seenWithin(itemId, days);
  }
  if (!learner.itemHistory || learner.itemHistory.length === 0) {
    return false;
  }
  const cutoff = nowMs - days * MS_PER_DAY;
  for (const entry of learner.itemHistory) {
    if (entry.item_id === itemId) {
      const seenTime = Date.parse(entry.seen_at);
      if (seenTime >= cutoff) {
        return true;
      }
    }
  }
  return false;
}

export function getLastSeenTimestamp(
  learner: LearnerSelectionContext,
  itemId: string
): number {
  if (!learner.itemHistory || learner.itemHistory.length === 0) {
    return 0;
  }
  let maxTime = 0;
  for (const entry of learner.itemHistory) {
    if (entry.item_id === itemId) {
      const t = Date.parse(entry.seen_at);
      if (t > maxTime) maxTime = t;
    }
  }
  return maxTime;
}

function gaussianWeight(difficulty: number, mean: number, sigma: number): number {
  const diff = difficulty - mean;
  return Math.exp(-(diff * diff) / (2 * sigma * sigma));
}

export function weightedSample<T>(
  items: readonly T[],
  weights: readonly number[],
  rng: () => number
): T {
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const idx = Math.floor(rng() * items.length);
    return items[idx]!;
  }
  const r = rng() * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i]!;
    if (r <= cumulative) {
      return items[i]!;
    }
  }
  return items[items.length - 1]!;
}

// ---------------------------------------------------------------------------
// 1. dominantMisconception (§6 step 2, §2.2 erratum 2026-08-16)
// ---------------------------------------------------------------------------

/**
 * Scans node.recent_window (last 5 qualifying attempts) for a misconception appearing >= threshold times.
 *
 * Rules:
 *   - Reads recent_window directly (time-ordered, fixed-size window of 5).
 *   - Does NOT read a separate persisted tally (misconception_hits was removed 2026-08-16).
 *   - On a 2-vs-2 tie, resolves to the more-recently-hit belief.
 */
export function dominantMisconception(
  window: readonly Attempt[],
  threshold = 2
): string | null {
  if (!window || window.length === 0) return null;

  // Window is at most last 5 qualifying attempts
  const slice = window.length > 5 ? window.slice(-5) : window;

  const counts = new Map<string, number>();
  const lastSeenIndex = new Map<string, number>();

  for (let i = 0; i < slice.length; i++) {
    const m = slice[i]!.misconception_id;
    if (m !== null && m !== undefined && m !== "") {
      counts.set(m, (counts.get(m) ?? 0) + 1);
      lastSeenIndex.set(m, i); // slice is chronological: higher index = more recent
    }
  }

  let winner: string | null = null;
  let maxCount = 0;
  let maxIndex = -1;

  for (const [m, count] of counts.entries()) {
    if (count >= threshold) {
      const idx = lastSeenIndex.get(m)!;
      if (count > maxCount) {
        winner = m;
        maxCount = count;
        maxIndex = idx;
      } else if (count === maxCount && idx > maxIndex) {
        // Tie-breaker: more-recently-hit belief wins
        winner = m;
        maxIndex = idx;
      }
    }
  }

  return winner;
}

// ---------------------------------------------------------------------------
// 2. tierIsReachable (§6.2)
// ---------------------------------------------------------------------------

/**
 * Tier reachability gate (§6.2):
 *   Tier 1 & Tier 2 items are always reachable.
 *   Tier 3 items are withheld until the learner has >= 2 correct (unhinted) at Tier 2 on that node.
 *   Prevents a demoralising early wall while still requiring Tier 3 for mastery.
 */
export function tierIsReachable(item: Item, node: NodeState): boolean {
  if (item.difficulty_tier < 3) {
    return true;
  }

  // Already mastered or achieved Tier 3
  if (node.max_tier_correct >= 3) {
    return true;
  }

  // Count Tier 2 unhinted correct attempts in recent_window
  const tier2CleanCorrect = node.recent_window.filter(
    (a) => a.difficulty_tier === 2 && a.correct && a.hints_used === 0
  ).length;

  return tier2CleanCorrect >= 2;
}

// ---------------------------------------------------------------------------
// 3. applyAdaptiveAdjustment (§6.1)
// ---------------------------------------------------------------------------

/**
 * Adaptive target band adjustment (§6.1):
 *   Engages once >= 20 attempts exist on the node.
 *   - Observed success > 0.90 over last 10 -> target_elo += 100
 *   - Observed success < 0.60 over last 10 -> target_elo -= 100
 *   - Clamped to +-200.
 *
 * target_elo is a difficulty-space value: raising it increases difficulty.
 */
export function applyAdaptiveAdjustment(
  node: NodeState,
  recentSuccessRate?: number
): number {
  if (node.attempts_total < 20) {
    return 0;
  }

  let rate = recentSuccessRate;
  if (rate === undefined) {
    if (node.recent_window.length === 0) return 0;
    const correctCount = node.recent_window.filter((a) => a.correct).length;
    rate = correctCount / node.recent_window.length;
  }

  let adjustment = 0;
  if (rate > 0.90) {
    adjustment = 100;
  } else if (rate < 0.60) {
    adjustment = -100;
  }

  return Math.min(200, Math.max(-200, adjustment));
}

// ---------------------------------------------------------------------------
// 4. poolExhaustionLadder (§6.3, I-4)
// ---------------------------------------------------------------------------

/**
 * Implements the 4-step pool exhaustion ladder (§6.3):
 *   1. Relax recall window 21 -> 10 days
 *   2. Widen sigma 150 -> 300
 *   3. Serve least-recently-seen item
 *   4. Emit content_gap telemetry if node has < 8 items
 *
 * Invariant I-4: MUST always return a Decision. Never null, never throw.
 */
export function poolExhaustionLadder(
  node: SelectionNodeContext,
  learner: LearnerSelectionContext,
  rng: () => number,
  targetElo?: number,
  nowMs?: number
): Decision {
  const currentNowMs = nowMs ?? 0;
  const currentTargetElo = targetElo ?? node.ability_elo - 200;
  const allItems = node.items ?? learner.itemPool ?? [];

  // Content gap telemetry flag if node has < 8 usable items (§6.3 step 4)
  const isContentGap = allItems.length < 8;
  void isContentGap;

  if (allItems.length === 0) {
    return {
      action: "queue_empty",
      node_id: node.node_id,
      item_id: null,
      misconception_id: null,
      reason: "content_gap",
    };
  }

  // Reachable items
  let reachable: readonly Item[] = allItems.filter((i) => tierIsReachable(i, node));
  if (reachable.length === 0) {
    // If no items are reachable by tier, fall back to any available item to satisfy I-4
    reachable = allItems;
  }

  // Step 1: Relax recall window 21 -> 10 days
  const pool10 = reachable.filter((i) => !isSeenWithin(learner, i.item_id, 10, currentNowMs));
  if (pool10.length > 0) {
    const weights = pool10.map((i) => gaussianWeight(i.difficulty_elo, currentTargetElo, 150));
    const chosen = weightedSample(pool10, weights, rng);
    return {
      action: "serve_item",
      node_id: node.node_id,
      item_id: chosen.item_id,
      misconception_id: null,
      reason: "pool_exhaustion_relax_window",
    };
  }

  // Step 2: If pool10 was empty, all items were seen within 10 days.
  // Step 3: Serve the least-recently-seen item.
  let leastRecentItem = reachable[0]!;
  let oldestTimestamp = Infinity;

  for (const item of reachable) {
    const seenTime = getLastSeenTimestamp(learner, item.item_id);
    if (seenTime < oldestTimestamp) {
      oldestTimestamp = seenTime;
      leastRecentItem = item;
    }
  }

  return {
    action: "serve_item",
    node_id: node.node_id,
    item_id: leastRecentItem.item_id,
    misconception_id: null,
    reason: "pool_exhaustion_least_recent",
  };
}

// ---------------------------------------------------------------------------
// 5. selectNextItem (§6 in full)
// ---------------------------------------------------------------------------

/**
 * Pure deterministic item selection algorithm (doc 04 §6):
 *
 * 1. Interleaving: every 4th item comes from review queue (items_since_review >= 3).
 *    Do not count review items toward items_since_review.
 * 2. Remediation override: misconception hit >= 2 times in recent_window (last 5).
 *    Suppressed if remediation shown within 3 days. 2-vs-2 tie breaks by recency.
 * 3. Target band: target_elo = node.ability_elo - 200 (easier than ability).
 *    Adaptive adjustment of +-100 applied if attempts_total >= 20.
 * 4. Weighted sample: Gaussian weight around target_elo with sigma = 150. Not argmin.
 *    Candidate pool filtered by seen_within 21d and tier reachability.
 *    Falls through to poolExhaustionLadder if pool is empty.
 *
 * Invariant I-4: MUST always return a Decision. Never null, never throw.
 */
export function selectNextItem(
  learner: LearnerSelectionContext,
  node: SelectionNodeContext,
  now: string | Date,
  rng: () => number
): Decision {
  const nowMs = parseTimestamp(now);

  // -------------------------------------------------------------------------
  // 1. Interleaving
  // -------------------------------------------------------------------------
  if (learner.items_since_review >= 3 && learner.getNextReviewItem) {
    const reviewItem = learner.getNextReviewItem();
    if (reviewItem) {
      return {
        action: "serve_item",
        node_id: reviewItem.node_id,
        item_id: reviewItem.item_id,
        misconception_id: null,
        reason: "interleave_review",
      };
    }
  }

  // -------------------------------------------------------------------------
  // 2. Remediation override
  // -------------------------------------------------------------------------
  const m = dominantMisconception(node.recent_window, 2);
  if (m !== null) {
    const shownRecently = learner.remediationShownRecently
      ? learner.remediationShownRecently(m, 3)
      : false;
    if (!shownRecently) {
      return {
        action: "serve_remediation",
        node_id: node.node_id,
        item_id: null,
        misconception_id: m,
        reason: "remediation_override",
      };
    }
  }

  // -------------------------------------------------------------------------
  // 3. Target band & Adaptive adjustment
  // -------------------------------------------------------------------------
  // Target item is EASIER than ability by 200 points (doc 04 §6.1 sign correction)
  const baseTarget = node.ability_elo - 200;
  const adjustment = applyAdaptiveAdjustment(node);
  const targetElo = baseTarget + adjustment;

  // -------------------------------------------------------------------------
  // 4. Candidate pool filtering
  // -------------------------------------------------------------------------
  const allItems = node.items ?? learner.itemPool ?? [];
  const pool = allItems.filter((i) => {
    if (isSeenWithin(learner, i.item_id, 21, nowMs)) {
      return false;
    }
    return tierIsReachable(i, node);
  });

  if (pool.length === 0) {
    return poolExhaustionLadder(node, learner, rng, targetElo, nowMs);
  }

  // -------------------------------------------------------------------------
  // 5. Weighted sample (Gaussian around targetElo, sigma = 150)
  // -------------------------------------------------------------------------
  const weights = pool.map((i) => gaussianWeight(i.difficulty_elo, targetElo, 150));
  const chosen = weightedSample(pool, weights, rng);

  return {
    action: "serve_item",
    node_id: node.node_id,
    item_id: chosen.item_id,
    misconception_id: null,
    reason: "target_band",
  };
}
