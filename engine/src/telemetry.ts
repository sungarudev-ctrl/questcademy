/**
 * engine/src/telemetry.ts
 *
 * Telemetry event definitions for the Questcademy learning engine.
 * Source of truth: docs/04-learning-engine-spec.md §14.
 *
 * Not for product analytics dashboards — for debugging the engine itself.
 * The engine defines and constructs these typed events; the caller dispatches them.
 */

import type { Decision, DecisionReason } from "./state.js";
import type { InvariantId } from "./invariants.js";

// ---------------------------------------------------------------------------
// Telemetry Events
// ---------------------------------------------------------------------------

/** Emitted on every item / lesson / remediation / escalation decision */
export interface DecisionReasonEvent {
  readonly event_type: "decision_reason";
  readonly learner_id: string;
  readonly node_id: string | null;
  readonly item_id: string | null;
  readonly action: Decision["action"];
  readonly reason: DecisionReason;
  readonly timestamp: string;
}

/** Emitted after an attempt is evaluated, comparing expected Elo probability to actual outcome */
export interface SelectionAccuracyEvent {
  readonly event_type: "expected_vs_actual_success";
  readonly learner_id: string;
  readonly node_id: string;
  readonly item_id: string;
  readonly ability_elo: number;
  readonly item_difficulty_elo: number;
  readonly expected_p: number;
  readonly actual_correct: boolean;
  readonly timestamp: string;
}

/** Emitted when the item selection pool ladder engages (doc 04 §6.3) */
export interface PoolExhaustionEvent {
  readonly event_type: "pool_exhaustion_level";
  readonly learner_id: string;
  readonly node_id: string;
  readonly level: 0 | 1 | 2 | 3;
  readonly usable_items_count: number;
  readonly timestamp: string;
}

/** Emitted when an escalation to tutor occurs per doc 04 §9 */
export interface EscalationRateEvent {
  readonly event_type: "escalation_rate";
  readonly learner_id: string;
  readonly node_id: string;
  readonly attempts_count: number;
  readonly misconception_id: string | null;
  readonly timestamp: string;
}

/** Emitted when a node has fewer than 8 usable items (content pipeline alert) */
export interface ContentGapEvent {
  readonly event_type: "content_gap";
  readonly node_id: string;
  readonly total_items: number;
  readonly usable_items: number;
  readonly timestamp: string;
}

/** Emitted when a provisionally mastered node fails review and is demoted (placement quality) */
export interface ProvisionalMasteryFailureEvent {
  readonly event_type: "provisional_mastery_failure_rate";
  readonly learner_id: string;
  readonly node_id: string;
  readonly days_since_placement: number;
  readonly timestamp: string;
}

/** Emitted when an invariant violation occurs (always 0; page on non-zero) */
export interface InvariantViolationEvent {
  readonly event_type: "invariant_violation";
  readonly invariant_id: InvariantId;
  readonly description: string;
  readonly node_id?: string;
  readonly timestamp: string;
}

/** Emitted when placement settles at or below graph_min_depth (doc 04 §14, v2) */
export interface PlacementAtGraphFloorEvent {
  readonly event_type: "placement_at_graph_floor";
  readonly learner_id: string;
  readonly subject: string;
  readonly frontier_depth: number;
  readonly timestamp: string;
}

/** Emitted when total_due > cap during an exam window (doc 04 §8.2, §14, v2) */
export interface ReviewBacklogInExamWindowEvent {
  readonly event_type: "review_backlog_in_exam_window";
  readonly learner_id: string;
  readonly backlogged_count: number;
  readonly cap: number;
  readonly timestamp: string;
}

/** Emitted when an optional tutor offer is made (doc 04 §9.1, §14, v2) */
export interface TutorOfferEvent {
  readonly event_type: "tutor_offer";
  readonly learner_id: string;
  readonly node_id: string;
  readonly reason: string;
  readonly timestamp: string;
}

/** Union of all engine telemetry events */
export type EngineTelemetryEvent =
  | DecisionReasonEvent
  | SelectionAccuracyEvent
  | PoolExhaustionEvent
  | EscalationRateEvent
  | ContentGapEvent
  | ProvisionalMasteryFailureEvent
  | InvariantViolationEvent
  | PlacementAtGraphFloorEvent
  | ReviewBacklogInExamWindowEvent
  | TutorOfferEvent;
