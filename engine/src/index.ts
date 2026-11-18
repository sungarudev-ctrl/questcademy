/**
 * engine/src/index.ts
 *
 * Public surface of the engine module.
 * Only export what callers (backend, client) need — keep internals private.
 */

export type {
  Attempt,
  DifficultyTier,
  HintsUsed,
  NodeState,
  NodeStatus,
  Decision,
  DecisionAction,
  DecisionReason,
  EngineContext,
  PrerequisiteType,
  PrerequisiteRef,
  SkillNodeSummary,
  SkillGraphLike,
  GraphLookup,
  NodeStateLookup,
  ProbeResult,
  NodeEvidence,
  PlacementState,
  LearnerStateUpdate,
  PlacementResult,
  LearnerPlacementContext,
  ReviewPriorityTier,
  ReviewQueueItem,
  ReviewQueue,
  LearnerReviewContext,
  ReviewQueueOptions,
} from "./state.js";

export {
  isQualifying,
  SECURED_STATUSES,
  resolveGraphNode,
  resolveNodeState,
} from "./state.js";

export { isMastered } from "./mastery.js";

export {
  TIER_OFFSETS,
  tierOffset,
  itemInitialElo,
  nodeDifficultyFromGraph,
  abilitySeed,
  updateElo,
} from "./elo.js";

export {
  assertInvariants,
  checkI1,
  checkI2,
  checkI3,
  checkI4,
  checkI5,
  checkI6,
  checkI7,
  checkI8,
  checkI9,
  checkI10,
  checkI11,
  checkI12,
  checkEloBounds,
  roundElo,
} from "./invariants.js";
export type { InvariantId, InvariantViolation, InvariantCheckContext } from "./invariants.js";

export {
  selectNextItem,
  dominantMisconception,
  tierIsReachable,
  applyAdaptiveAdjustment,
  poolExhaustionLadder,
} from "./selection.js";
export type {
  Item,
  LearnerSelectionContext,
  SelectionNodeContext,
} from "./selection.js";

export {
  initPlacementState,
  nextProbeDepth,
  recordProbeResult,
  finalizePlacement,
  backfillPrerequisites,
  seedStateFromEvidence,
  place,
  depthForGrade,
  getNodeDepth,
  getGraphMinMaxDepth,
  getNodesAtDepth,
  propagateMasteryDown,
  eloFromEvidence,
  GRADE_DEPTH_MAP,
} from "./placement.js";

export {
  FSRS5_DEFAULTS,
  DAILY_REVIEW_CAP,
  MAX_OVERDUE_BACKLOG,
  retrievability,
  examCompression,
  onMastery,
  onReview,
  buildReviewQueue,
} from "./srs.js";

export {
  shouldEscalate,
  escalateToTutor,
  recordEscalation,
} from "./escalation.js";
export type { EscalationCheckResult } from "./escalation.js";

export {
  checkAvailability,
  computeAvailableNodes,
  computeFrontierNodes,
  transition,
} from "./statemachine.js";
export type { StateTransitionEvent } from "./statemachine.js";

export type {
  DecisionReasonEvent,
  SelectionAccuracyEvent,
  PoolExhaustionEvent,
  EscalationRateEvent,
  ContentGapEvent,
  ProvisionalMasteryFailureEvent,
  InvariantViolationEvent,
  PlacementAtGraphFloorEvent,
  ReviewBacklogInExamWindowEvent,
  TutorOfferEvent,
  EngineTelemetryEvent,
} from "./telemetry.js";
