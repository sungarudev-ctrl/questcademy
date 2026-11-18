/**
 * engine/test/escalation.test.ts
 *
 * Conformance tests for escalation to tutor per docs/04-learning-engine-spec.md §9.
 */

import { readFileSync } from "fs";
import { join } from "path";
import type { NodeState, Decision } from "../src/state.js";
import {
  shouldEscalate,
  escalateToTutor,
  recordEscalation,
} from "../src/escalation.js";

function loadVector<T>(name: string): T {
  const p = join(__dirname, "..", "testdata", `${name}.json`);
  return JSON.parse(readFileSync(p, "utf-8")) as T;
}

interface EscalationVectorCase {
  readonly name: string;
  readonly node: NodeState;
  readonly now: string;
  readonly expected_escalate: boolean;
  readonly expected_misconception_id?: string;
  readonly expected_decision?: Decision;
}

interface EscalationVector {
  readonly cases: readonly EscalationVectorCase[];
}

describe("escalation_trigger golden vector", () => {
  const vec = loadVector<EscalationVector>("escalation_trigger");

  for (const c of vec.cases) {
    it(`evaluates case: ${c.name}`, () => {
      const result = shouldEscalate(c.node, c.now);
      expect(result.escalate).toBe(c.expected_escalate);

      if (c.expected_misconception_id) {
        expect(result.misconceptionId).toBe(c.expected_misconception_id);
      }

      if (c.expected_decision) {
        const decision = escalateToTutor(c.node, c.now, result.misconceptionId);
        expect(decision).toEqual(c.expected_decision);
      }
    });
  }
});

describe("recordEscalation", () => {
  it("records last_escalated_at on node state", () => {
    const node: NodeState = {
      learner_id: "learn-esc-1",
      node_id: "NODE_TEST",
      status: "in_progress",
      ability_elo: 1200,
      attempts_total: 4,
      recent_window: [],
      distinct_days: [],
      max_tier_correct: 0,
      mastered_at: null,
      stability: 3.0,
      difficulty_fsrs: 5.0,
      due_at: null,
      lapses: 0,
    };

    const recorded = recordEscalation(node, "2026-09-15T12:00:00Z");
    expect(recorded.last_escalated_at).toBe("2026-09-15T12:00:00Z");
  });

  test.skip("tutor_offer_triggers: triggers tutor offer when conditions met (pending DR-003)", () => {
    const v = loadVector<{ skip: string }>("tutor_offer_triggers");
    expect(v.skip).toContain("pending DR-003");
  });
});
