/**
 * engine/src/state.ts
 *
 * Core data contracts for the Questcademy learning engine.
 * Source of truth: docs/04-learning-engine-spec.md §2
 *
 * CRITICAL: §2.2's field comments are descriptive; §4's pseudocode is normative.
 * Where they have historically disagreed, §4 was correct (2026-08-09 correction).
 * Do not treat a comment here as a rule — treat it as a pointer to the owning section.
 */

// ---------------------------------------------------------------------------
// Attempt — append-only, immutable event (doc 04 §2.1)
// ---------------------------------------------------------------------------

export type DifficultyTier = 1 | 2 | 3;
export type HintsUsed = 0 | 1 | 2 | 3;

export interface Attempt {
  readonly attempt_id: string;        // UUID — idempotency key (I-8)
  readonly learner_id: string;        // UUID
  readonly node_id: string;
  readonly item_id: string;
  readonly difficulty_tier: DifficultyTier;
  readonly correct: boolean;
  readonly partial_credit: number;    // 0.0–1.0, for multi-part items
  readonly selected_option: string | null;   // MCQ choice → distractor mapping
  readonly misconception_id: string | null;  // resolved from selected_option
  readonly latency_ms: number;
  readonly hints_used: HintsUsed;
  readonly session_id: string;        // UUID
  readonly occurred_at: string;       // ISO-8601 UTC timestamp — client clock
  readonly is_review: boolean;        // served from the review queue
  readonly is_placement: boolean;
  readonly is_exam: boolean;
}

/**
 * A "qualifying attempt" for the mastery predicate (§4):
 *   is_placement === false AND is_exam === false
 *
 * Reviews ARE qualifying — nothing excludes them here.
 * Hinted attempts enter recent_window but count as INCORRECT in the mastery tally.
 * (§2.2 original comment was wrong on both counts; corrected 2026-08-09.)
 */
export function isQualifying(a: Attempt): boolean {
  return !a.is_placement && !a.is_exam;
}

// ---------------------------------------------------------------------------
// NodeStatus — states of the node state machine (doc 04 §3)
// ---------------------------------------------------------------------------

export type NodeStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "mastered"
  | "needs_review"
  | "relearning";

/**
 * The "secured" set used by I-1 and by the ability-seed mean (§5.1, corrected 2026-08-14).
 * A node in any of these states has been mastered at some point — its ability_elo
 * reflects real evidence, not just a cold-start seed.
 */
export const SECURED_STATUSES = new Set<NodeStatus>([
  "mastered",
  "needs_review",
  "relearning",
]);

// ---------------------------------------------------------------------------
// NodeState — persistent state per (learner, node) (doc 04 §2.2)
// ---------------------------------------------------------------------------

export interface NodeState {
  readonly learner_id: string;
  readonly node_id: string;
  readonly status: NodeStatus;
  readonly ability_elo: number;       // learner ability on this node (§5)
  readonly difficulty_elo?: number;    // difficulty of node/item updated by engine (§5)
  readonly attempts_total: number;
  /**
   * Last 5 qualifying attempts (is_placement=false, is_exam=false), chronological.
   * Hinted attempts enter this window but count as INCORRECT in the mastery tally.
   * (§2.2's original description said "non-hinted" — that was wrong; §4 is normative.)
   */
  readonly recent_window: readonly Attempt[];
  /**
   * Days with ≥1 correct attempt. Descriptive cache only — the mastery predicate
   * derives its spacing check from recent_window directly (filtered by correct &&
   * hints_used===0), NOT from this field. (§2.2 correction, 2026-08-09.)
   * Reading this field to answer "has the learner practised on enough days?" is wrong.
   */
  readonly distinct_days: readonly string[];  // ISO-8601 date strings, capped at 10
  readonly max_tier_correct: 0 | 1 | 2 | 3;
  readonly mastered_at: string | null;        // ISO-8601 UTC; null = not yet mastered or provisional
  readonly stability: number;                 // FSRS memory stability, days (§8)
  readonly difficulty_fsrs: number;           // FSRS difficulty, 1–10 (§8)
  readonly due_at: string | null;             // ISO-8601 UTC; null = not yet scheduled
  readonly lapses: number;
  readonly last_escalated_at?: string | null; // ISO-8601 UTC timestamp of last escalation (doc 04 §9)
  // NOTE: misconception_hits removed 2026-08-16 — see §2.2 erratum.
  // dominant_misconception() reads recent_window directly (§6 step 2).
}

// ---------------------------------------------------------------------------
// Decision — engine outputs (doc 04 §2.3)
// ---------------------------------------------------------------------------

export type DecisionAction =
  | "serve_item"
  | "serve_lesson"
  | "serve_remediation"
  | "node_mastered"
  | "queue_empty"
  | "escalate_to_tutor";

/**
 * Every Decision MUST carry a reason. Undebuggable adaptive systems are unmaintainable.
 */
export type DecisionReason =
  | "mastery_gate_passed"
  | "mastery_gate_not_met"
  | "interleave_review"
  | "remediation_override"
  | "target_band"
  | "pool_exhaustion_relax_window"
  | "pool_exhaustion_widen_sigma"
  | "pool_exhaustion_least_recent"
  | "content_gap"
  | "escalation_trigger"
  | "placement_probe"
  | "placement_backfill"
  | "review_due";

export interface Decision {
  readonly action: DecisionAction;
  readonly node_id: string | null;
  readonly item_id: string | null;
  readonly misconception_id: string | null;  // when action = serve_remediation
  readonly reason: DecisionReason;
}

// ---------------------------------------------------------------------------
// EngineContext — injected dependencies (satisfies E-1: no clock/random in engine)
// ---------------------------------------------------------------------------

/**
 * All external dependencies are injected so the engine remains pure (E-1).
 * `now` is an explicit parameter, never read from system clock. `rng` is a seeded deterministic PRNG.
 */
export interface EngineContext {
  /** Current time as ISO-8601 UTC string. Never read inside the engine directly. */
  readonly now: string;
  /** Seeded deterministic PRNG returning a float in [0, 1). Must be reproducible. */
  readonly rng: () => number;
  /**
   * Days until exam date. Used by SRS exam compression (§8.3).
   * undefined/null → no exam → compression = 1.0 (no error).
   * Engine behaviour MUST NOT branch on this beyond passing to examCompression().
   */
  readonly daysUntilExam?: number | null;
  /**
   * Framework identifier. For telemetry only — engine logic MUST NOT depend on this
   * to remain deterministic across frameworks (E-5, §2.4).
   */
  readonly frameworkId?: string | null;
}

// ---------------------------------------------------------------------------
// Graph & Lookup contracts (doc 02 §2, doc 04 §5.1)
// ---------------------------------------------------------------------------

export type PrerequisiteType = "hard" | "soft";

export interface PrerequisiteRef {
  readonly node_id: string;
  readonly type: PrerequisiteType;
}

export interface SkillNodeSummary {
  readonly node_id: string;
  readonly difficulty_elo?: number;
  readonly prerequisites: readonly PrerequisiteRef[];
}

export interface SkillGraphLike {
  getNode(nodeId: string): SkillNodeSummary | undefined;
}

export type GraphLookup =
  | SkillGraphLike
  | Map<string, SkillNodeSummary>
  | Record<string, SkillNodeSummary>;

export function resolveGraphNode(
  graph: GraphLookup,
  nodeId: string
): SkillNodeSummary | undefined {
  if ("getNode" in graph && typeof graph.getNode === "function") {
    return graph.getNode(nodeId);
  }
  if (graph instanceof Map) {
    return graph.get(nodeId);
  }
  return (graph as Record<string, SkillNodeSummary>)[nodeId];
}

export type NodeStateLookup =
  | ((nodeId: string) => NodeState | undefined)
  | Map<string, NodeState>
  | Record<string, NodeState>;

export function resolveNodeState(
  lookup: NodeStateLookup,
  nodeId: string
): NodeState | undefined {
  if (typeof lookup === "function") {
    return lookup(nodeId);
  }
  if (lookup instanceof Map) {
    return lookup.get(nodeId);
  }
  return (lookup as Record<string, NodeState>)[nodeId];
}

// ---------------------------------------------------------------------------
// Placement Data Contracts (doc 04 §7)
// ---------------------------------------------------------------------------

export interface ProbeResult {
  readonly node_id: string;
  readonly depth: number;
  readonly correct: boolean;
  readonly is_backfill?: boolean;
}

export interface NodeEvidence {
  readonly correct: number;
  readonly total: number;
  readonly rate: number;
}

export interface PlacementState {
  readonly learner_id: string;
  readonly subject: string;
  readonly entry_grade_hint: number | string;
  readonly hint_depth: number;
  readonly lo: number;
  readonly hi: number;
  readonly initial_lo: number;
  readonly initial_hi: number;
  readonly graph_min_depth: number;
  readonly graph_max_depth: number;
  readonly current_probe_depth: number | null;
  readonly current_depth_probes: readonly { readonly node_id: string; readonly correct: boolean }[];
  readonly items_used: number;
  readonly evidence: Record<string, NodeEvidence>;
  readonly history: readonly ProbeResult[];
  readonly widened: boolean;
  readonly converged: boolean;
  readonly frontier_depth: number | null;
}

export interface LearnerStateUpdate {
  readonly node_states: Record<string, Partial<NodeState>>;
}

export interface PlacementResult {
  readonly learner_id: string;
  readonly subject: string;
  readonly frontier_depth: number;
  readonly frontier_nodes: readonly string[];
  readonly items_used: number;
  readonly evidence: Record<string, NodeEvidence>;
  readonly state_update: LearnerStateUpdate;
  readonly history: readonly ProbeResult[];
  /**
   * True when the learner's frontier is at or below graph_min_depth —
   * i.e., the graph cannot probe any lower (§7.1 v2).
   * Telemetry: emit placement_at_graph_floor when true.
   */
  readonly at_graph_floor: boolean;
}

export interface LearnerPlacementContext {
  readonly learner_id: string;
  readonly true_ability?: number;
  readonly administer?: (nodeId: string, tier: DifficultyTier) => boolean;
}

// ---------------------------------------------------------------------------
// Review Queue Data Contracts (doc 04 §8)
// ---------------------------------------------------------------------------

export type ReviewPriorityTier =
  | "relearning"
  | "overdue"
  | "exam_critical"
  | "due_today";

export interface ReviewQueueItem {
  readonly node_id: string;
  readonly status: NodeStatus;
  readonly due_at: string;
  readonly overdue_days: number;
  readonly priority_tier: ReviewPriorityTier;
  readonly is_exam_critical?: boolean;
}

export interface ReviewQueue {
  readonly learner_id: string;
  readonly date: string;
  readonly items: readonly ReviewQueueItem[];
  readonly total_due: number;
  readonly cap: number;
  /** Emitted when total_due > cap during an exam window (§8.2 v2, C4). */
  readonly telemetry?: Readonly<Record<string, number>>;
}

export interface LearnerReviewContext {
  readonly learner_id: string;
  readonly node_states: readonly NodeState[] | Record<string, NodeState> | Map<string, NodeState>;
  readonly exam_date?: string | null;
  readonly days_until_exam?: number | null;
  readonly reviews_completed_today?: number;
}

export interface ReviewQueueOptions {
  readonly cap?: number;
  readonly maxOverdueBacklog?: number;
  readonly examCriticalNodes?: ReadonlySet<string> | readonly string[];
  readonly daysUntilExam?: number | null;
  readonly examWindowDays?: number | null;
}



