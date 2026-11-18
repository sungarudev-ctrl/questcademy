/**
 * engine/test/mastery.test.ts
 *
 * Conformance tests for is_mastered() against the five golden vectors from doc 04 §12.
 * Tests are written from the vectors before the implementation (doc 04 §task-1 rule).
 *
 * These tests assert WHAT the predicate must compute, not HOW it computes it.
 * Every expected value is derived by hand from the spec, not from an implementation run.
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { NodeState } from "../src/state.js";
import { isMastered } from "../src/mastery.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadVector(name: string): { state: NodeState; expected_is_mastered: boolean; failure_reason?: string; notes?: string } {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as {
    state: NodeState;
    expected_is_mastered: boolean;
    failure_reason?: string;
    notes?: string;
  };
}

// ---------------------------------------------------------------------------
// Vector 1: mastery_same_day_grind
// Asserts: 8 correct in one session ⇒ NOT mastered (spacing gate; span=0)
// ---------------------------------------------------------------------------

describe("mastery_same_day_grind", () => {
  test("5 correct, all on the same day → NOT mastered (span_days=0 < 2)", () => {
    const { state, expected_is_mastered, failure_reason } = loadVector("mastery_same_day_grind");
    const result = isMastered(state);
    expect(result).toBe(expected_is_mastered);
    // Explicitly document the requirement being tested
    expect(result).toBe(false);
    void failure_reason; // documented in the JSON
  });
});

// ---------------------------------------------------------------------------
// Vector 2: mastery_two_day_clean
// Asserts: 4/5 correct, Mon+Wed (span=2), Tier 3 present ⇒ mastered
// ---------------------------------------------------------------------------

describe("mastery_two_day_clean", () => {
  test("4 of 5 correct, 1 wrong, across Mon+Wed with Tier 3 → mastered", () => {
    const { state, expected_is_mastered } = loadVector("mastery_two_day_clean");
    const result = isMastered(state);
    expect(result).toBe(expected_is_mastered);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Vector 3: mastery_hint_farm
// Asserts: all attempts hinted ⇒ NOT mastered (filtered correct count = 0)
// Tests Invariant I-10: hinted attempts never satisfy the mastery predicate.
// ---------------------------------------------------------------------------

describe("mastery_hint_farm", () => {
  test("5 correct all hinted → NOT mastered (I-10)", () => {
    const { state, expected_is_mastered } = loadVector("mastery_hint_farm");
    const result = isMastered(state);
    expect(result).toBe(expected_is_mastered);
    expect(result).toBe(false);
  });

  test("hint-farmed state with Tier 3 and multi-day still fails — mastery gate is not satisfiable via hints", () => {
    // The hint_farm vector has max_tier_correct=3 and distinct_days across 3 days
    // to confirm neither Tier 3 nor multi-day presence rescues a hinted window
    const { state } = loadVector("mastery_hint_farm");
    expect(state.max_tier_correct).toBe(3);
    expect(state.distinct_days.length).toBeGreaterThanOrEqual(2);
    // Still not mastered
    expect(isMastered(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Vector 4: mastery_boundary_consecutive
// Asserts: correct on Mon AND Tue (span=1) ⇒ NOT mastered
// This is the exact case the 2026-07 erratum exists to catch.
// The old max_gap < 1 condition would have passed Mon+Tue (1 < 1 = false → no rejection).
// ---------------------------------------------------------------------------

describe("mastery_boundary_consecutive", () => {
  test("4 correct Mon+Tue (span=1 day) → NOT mastered (non-consecutive requirement)", () => {
    const { state, expected_is_mastered } = loadVector("mastery_boundary_consecutive");
    const result = isMastered(state);
    expect(result).toBe(expected_is_mastered);
    expect(result).toBe(false);
  });

  test("span=1 fails but span=2 (Mon+Wed) passes — boundary is inclusive at 2", () => {
    // Derive the Wed state from the two_day_clean vector (span=2)
    const { state: cleanState } = loadVector("mastery_two_day_clean");
    const { state: consecutiveState } = loadVector("mastery_boundary_consecutive");
    expect(isMastered(consecutiveState)).toBe(false); // span=1
    expect(isMastered(cleanState)).toBe(true);         // span=2
  });
});

// ---------------------------------------------------------------------------
// Vector 5: mastery_hinted_day_bridge
// Asserts: 4 clean corrects in one session + 1 hinted correct days later ⇒ NOT mastered
// This is the case the 2026-08-09 simulation harness correction was written to catch.
// The WRONG pre-correction filter (days from w.filter(|a| a.correct)) would have
// included the hinted Thursday attempt's date, giving span=3 → incorrectly mastered.
// The CORRECT filter (days from w.filter(|a| a.correct && a.hints_used === 0)) excludes it.
// ---------------------------------------------------------------------------

describe("mastery_hinted_day_bridge", () => {
  test("4 clean corrects Mon + 1 hinted correct Thu → NOT mastered (hinted day excluded from spacing)", () => {
    const { state, expected_is_mastered } = loadVector("mastery_hinted_day_bridge");
    const result = isMastered(state);
    expect(result).toBe(expected_is_mastered);
    expect(result).toBe(false);
  });

  test("the state has max_tier_correct=3 and window=5 — the only failing gate is days.len<2", () => {
    // Confirm the vector is actually testing the days filter, not accidentally
    // failing at an earlier gate (window length or correct count)
    const { state } = loadVector("mastery_hinted_day_bridge");
    // recent_window has 5 attempts (4 unhinted correct + 1 hinted correct)
    expect(state.recent_window.length).toBe(5);
    // max_tier_correct is 3 (Tier 3 was unhinted on Mon)
    expect(state.max_tier_correct).toBe(3);
    // correct count (hints_used===0) = 4 — passes the 4/5 gate
    const unhintedCorrect = state.recent_window.filter(
      (a) => a.correct && a.hints_used === 0
    );
    expect(unhintedCorrect.length).toBe(4); // ≥ 4, passes
    // But distinct days from those 4 = only Monday
    const days = new Set(unhintedCorrect.map((a) => a.occurred_at.slice(0, 10)));
    expect(days.size).toBe(1); // Only 1 day → fails spacing gate
    // Full predicate still false
    expect(isMastered(state)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Edge case: window too small
// Not in §12's named vectors but required by the predicate (w.len() < 4 → false)
// ---------------------------------------------------------------------------

describe("is_mastered — window size guards", () => {
  const baseState = loadVector("mastery_two_day_clean").state;

  test("empty recent_window → NOT mastered", () => {
    const s: NodeState = { ...baseState, recent_window: [] };
    expect(isMastered(s)).toBe(false);
  });

  test("3-attempt window → NOT mastered (requires len >= 4)", () => {
    const s: NodeState = { ...baseState, recent_window: baseState.recent_window.slice(0, 3) };
    expect(isMastered(s)).toBe(false);
  });

  test("4-attempt window with all gates met → mastered (minimum valid window)", () => {
    // Take the first 4 of the two_day_clean window: b1(Mon), b2(Mon-T3), b3(wrong), b4(Wed)
    // correct=[b1,b2,b4]=3 — wait, that's only 3. We need 4. Use all 5.
    // The two_day_clean vector with 5 in window is the minimal passing case already tested above.
    // Instead, construct a 4-attempt window that passes: 4 unhinted correct, Mon+Wed, Tier 3
    const attempt = (id: string, date: string, tier: 1|2|3): import("../src/state.js").Attempt => ({
      attempt_id: id,
      learner_id: baseState.learner_id,
      node_id: baseState.node_id,
      item_id: `item-${id}`,
      difficulty_tier: tier,
      correct: true,
      partial_credit: 0,
      selected_option: null,
      misconception_id: null,
      latency_ms: 8000,
      hints_used: 0,
      session_id: `sess-${id}`,
      occurred_at: `${date}T09:00:00Z`,
      is_review: false,
      is_placement: false,
      is_exam: false,
    });
    const s: NodeState = {
      ...baseState,
      max_tier_correct: 3,
      recent_window: [
        attempt("x1", "2024-03-04", 2),
        attempt("x2", "2024-03-04", 3),
        attempt("x3", "2024-03-06", 2),
        attempt("x4", "2024-03-06", 2),
      ],
    };
    expect(isMastered(s)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// v2 Vectors: mastery_hinted_tier3 & mastery_blockers
// ---------------------------------------------------------------------------

describe("v2 Conformance Vectors: Mastery", () => {
  test("mastery_hinted_tier3: hinted Tier-3 correct does not advance max_tier_correct", () => {
    const p = join(__dirname, "..", "testdata", "mastery_hinted_tier3.json");
    const vector = JSON.parse(readFileSync(p, "utf-8"));
    const { transition } = require("../src/statemachine.js");
    const updated = transition(vector.state, vector.attempt, "2026-09-02T10:00:00Z");
    expect(updated.max_tier_correct).toBe(vector.expected.max_tier_correct);
    expect(isMastered(updated)).toBe(vector.expected.is_mastered);
  });

  test.skip("mastery_blockers: reports each unmet clause (pending DR-003)", () => {
    const p = join(__dirname, "..", "testdata", "mastery_blockers.json");
    const vector = JSON.parse(readFileSync(p, "utf-8"));
    expect(vector.skip).toContain("pending DR-003");
  });
});
