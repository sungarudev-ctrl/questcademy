/**
 * engine/src/mastery.ts
 *
 * Mastery predicate — doc 04 §4.
 *
 * HAND-VERIFIED. Do not modify without:
 *   1. Reading doc 04 §4 and every correction note therein.
 *   2. Updating the conformance vectors in engine/testdata/.
 *   3. Re-running the simulation harness and committing the baseline diff.
 *
 * Corrections incorporated (read §4 for the full rationale on each):
 *   2026-07 — span check: was max_gap < 1 (wrong); now (max - min).days >= 2.
 *   2026-08-09 — days filter: was w.filter(a.correct); now w.filter(a.correct && a.hints_used===0).
 *                The asymmetry between the correct tally and the days filter allowed a hinted
 *                correct to supply a distinct day without contributing to the 4/5 tally.
 *                Invariant I-10 was right; §4 was wrong; §4 is now corrected.
 */

import type { Attempt, NodeState } from "./state.js";

// ---------------------------------------------------------------------------
// isMastered — the predicate (doc 04 §4)
// ---------------------------------------------------------------------------

/**
 * Returns true iff the learner has demonstrated mastery of the node.
 *
 * The predicate (verbatim from doc 04 §4, with corrected filters):
 *
 *   let w = recent_window (last 5 qualifying attempts)
 *   if w.len() < 4 → false
 *
 *   let correct = w.filter(a.correct && a.hints_used === 0).count()
 *   if correct < 4 → false
 *
 *   if max_tier_correct < 3 → false
 *
 *   let days = distinct_dates(w.filter(a.correct && a.hints_used === 0))
 *   if days.len() < 2 → false
 *   let span_days = (days.max - days.min).days
 *   if span_days < 2 → false   // Mon+Wed passes (span=2); Mon+Tue fails (span=1)
 *
 *   → true
 *
 * @pure — no side effects, no I/O
 */
export function isMastered(s: NodeState): boolean {
  const w = s.recent_window;

  // Gate 1: minimum window size
  // §4: "if w.len() < 4 { return false }"
  // recent_window holds up to 5 qualifying attempts. We need at least 4.
  if (w.length < 4) {
    return false;
  }

  // Gate 2: unhinted correct count
  // §4: "let correct = w.filter(|a| a.correct && a.hints_used == 0).count()"
  // §4: "if correct < 4 { return false }"
  // Hinted attempts enter the window but count as incorrect (§2.1, I-10).
  const unhintedCorrect = filterUnhintedCorrect(w);
  if (unhintedCorrect.length < 4) {
    return false;
  }

  // Gate 3: Tier 3 reached
  // §4: "if s.max_tier_correct < 3 { return false }"
  // max_tier_correct is maintained by apply_attempt (§5); we read it here.
  if (s.max_tier_correct < 3) {
    return false;
  }

  // Gate 4: spacing effect — at least 2 distinct correct days, non-consecutive
  // §4: "let days = distinct_dates(w.filter(|a| a.correct && a.hints_used == 0))"
  //
  // CRITICAL: the filter is the SAME as Gate 2 (correct && hints_used===0).
  // Pre-2026-08-09: this was w.filter(a.correct) — wrong. A hinted correct could supply
  // a distinct day without contributing to the 4/5 tally, making the gate satisfiable
  // by a single unhinted correct day. See §4's 2026-08-09 correction note.
  const correctDays = distinctDates(unhintedCorrect);

  if (correctDays.length < 2) {
    return false;
  }

  // Gate 5: span ≥ 2 calendar days (non-consecutive)
  // §4: "let span_days = (days.max() - days.min()).days"
  // §4: "if span_days < 2 { return false }"
  //
  // Mon+Tue: span=1 → fails. Mon+Wed: span=2 → passes.
  // The comment in §4: "non-consecutive: Mon+Tue (span=1) fails; Mon+Wed (span=2) passes"
  //
  // CRITICAL: span is between the EARLIEST and LATEST correct day in the window,
  // not the maximum gap between adjacent days. The 2026-07 correction replaced
  // max_gap_days < 1 (which incorrectly accepted Mon+Tue because gap=1 and 1<1=false)
  // with this span check.
  const spanDays = calendarDaySpan(correctDays);
  if (spanDays < 2) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Internal helpers (not exported — engine is a pure function, not a library)
// ---------------------------------------------------------------------------

/**
 * Returns the subset of attempts that are both correct and unhinted.
 * This is the filter applied in BOTH the correct tally and the days derivation.
 * (§4, corrected 2026-08-09 — same filter in both places, deliberately.)
 */
function filterUnhintedCorrect(window: readonly Attempt[]): readonly Attempt[] {
  return window.filter((a) => a.correct && a.hints_used === 0);
}

/**
 * Returns the set of distinct calendar dates (UTC, YYYY-MM-DD) represented
 * by the given attempts' occurred_at timestamps.
 *
 * occurred_at is an ISO-8601 UTC string; taking the first 10 chars gives the date.
 * Sorted ascending so calendarDaySpan can use index 0 and index length-1.
 */
function distinctDates(attempts: readonly Attempt[]): readonly string[] {
  const seen = new Set<string>();
  for (const a of attempts) {
    // occurred_at: "2024-03-04T09:00:00Z" → "2024-03-04"
    const date = a.occurred_at.slice(0, 10);
    seen.add(date);
  }
  // Sort ascending — deterministic, required by E-2
  return Array.from(seen).sort();
}

/**
 * Returns the number of calendar days between the earliest and latest dates.
 *
 * E.g.:
 *   ["2024-03-04", "2024-03-06"] → 2   (passes)
 *   ["2024-03-04", "2024-03-05"] → 1   (fails)
 *   ["2024-03-04"]               → 0   (fails — but we check days.length < 2 first)
 *
 * Uses UTC midnight arithmetic to avoid DST edge cases (dates are already UTC).
 * The input is sorted ascending; first = min, last = max.
 */
export function calendarDaySpan(sortedDates: readonly string[]): number {
  if (sortedDates.length < 2) {
    // Defensive — caller checks length first, but we must not throw (E-5)
    return 0;
  }
  const first = sortedDates[0];
  const last = sortedDates[sortedDates.length - 1];

  // Both are non-null: we checked length >= 2 above, so these exist.
  // TypeScript's noUncheckedIndexedAccess would flag these — assert non-null explicitly.
  if (first === undefined || last === undefined) {
    // Unreachable given length >= 2, but TypeScript strict requires this branch.
    return 0;
  }

  const msPerDay = 86_400_000;
  const minMs = Date.parse(`${first}T00:00:00Z`);
  const maxMs = Date.parse(`${last}T00:00:00Z`);
  // Integer division — both values are at UTC midnight, so the difference is exact.
  return Math.round((maxMs - minMs) / msPerDay);
}
