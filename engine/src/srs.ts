/**
 * engine/src/srs.ts
 *
 * Implementation of the pure, deterministic FSRS-5 Review Scheduler for Questcademy.
 * Source of truth: docs/04-learning-engine-spec.md §8, §3, §11 (I-6)
 *
 * Implements:
 *   1. onMastery(node, now, examWindow?)
 *   2. onReview(node, correct, now, examWindow?, hintsUsed?)
 *   3. buildReviewQueue(learner, now, graph?, options?)
 *   4. examCompression(now, examWindow?)
 *   5. retrievability(stability, elapsedDays)
 */

import type {
  Attempt,
  GraphLookup,
  HintsUsed,
  LearnerReviewContext,
  NodeState,
  ReviewQueue,
  ReviewQueueItem,
  ReviewQueueOptions,
} from "./state.js";
import { SECURED_STATUSES } from "./state.js";

// ---------------------------------------------------------------------------
// 1. FSRS-5 Weights & Constants (doc 04 §8.1)
// ---------------------------------------------------------------------------

/**
 * Published FSRS-5 default weights for stability update on review.
 * Per spec, refit from real Questcademy response data at Phase 3 (>= 500k reviews).
 */
export const FSRS5_DEFAULTS = {
  w1: -0.1449,
  w2: 0.27,
  w3: 0.44,
  w4: 0.3, // lapse multiplier
} as const;

export const DAILY_REVIEW_CAP = 8; // Invariant I-6
export const MAX_OVERDUE_BACKLOG = 3; // §8.2 decay rule (>60 days overdue)

// ---------------------------------------------------------------------------
// 2. Date & Memory Utilities
// ---------------------------------------------------------------------------

function addDays(isoString: string, days: number): string {
  const ms = Date.parse(isoString) + days * 86400000;
  return new Date(ms).toISOString();
}

/**
 * Retrievability formula from FSRS (§8.1):
 *   R = exp(ln(0.9) * elapsed_days / stability)
 */
export function retrievability(stability: number, elapsedDays: number): number {
  if (elapsedDays <= 0) return 1.0;
  const s = Math.max(0.1, stability);
  return Math.exp((Math.log(0.9) * elapsedDays) / s);
}

/**
 * Exam-aware interval compression (§8.3):
 *   None / > 90 days  => 1.0
 *   > 30 days         => 0.75
 *   > 14 days         => 0.5
 *   <= 14 days        => 0.35
 */
export function examCompression(
  now: string,
  examWindow?: number | string | null
): number {
  if (examWindow === undefined || examWindow === null) {
    return 1.0;
  }

  let daysUntil: number;
  if (typeof examWindow === "number") {
    daysUntil = examWindow;
  } else {
    const examMs = Date.parse(examWindow);
    const nowMs = Date.parse(now);
    if (Number.isNaN(examMs) || Number.isNaN(nowMs)) {
      return 1.0;
    }
    daysUntil = (examMs - nowMs) / 86400000;
  }

  if (daysUntil > 90) return 1.0;
  if (daysUntil > 30) return 0.75;
  if (daysUntil > 14) return 0.5;
  return 0.35;
}

// ---------------------------------------------------------------------------
// 3. Scheduling on Mastery (doc 04 §8.1)
// ---------------------------------------------------------------------------

/**
 * Schedules review on transition to 'mastered' (§8.1):
 *   stability       = 3.0 days (initial)
 *   difficulty_fsrs = clamp(5.0 - 0.8 * (ability_elo - 1200) / 200, 1.0, 10.0)
 *   due_at          = now + stability * exam_compression(now)
 */
export function onMastery(
  node: NodeState,
  now: string,
  examWindow?: number | string | null
): NodeState {
  const initialStability = 3.0;
  const rawDiff = 5.0 - (0.8 * (node.ability_elo - 1200)) / 200;
  const difficultyFsrs = Math.max(1.0, Math.min(10.0, Math.round(rawDiff * 10000) / 10000));
  const compression = examCompression(now, examWindow);
  const dueAt = addDays(now, initialStability * compression);

  return {
    ...node,
    status: "mastered",
    mastered_at: node.mastered_at ?? now, // I-2: set once, never cleared
    stability: initialStability,
    difficulty_fsrs: difficultyFsrs,
    due_at: dueAt,
  };
}

// ---------------------------------------------------------------------------
// 4. Scheduling on Review (doc 04 §8.1 & §3)
// ---------------------------------------------------------------------------

/**
 * Updates node state on a review attempt.
 *
 * Implements doc 04 §3 implementation note:
 *   A review attempt can legitimately arrive while `status` still reads 'mastered'
 *   because the transition to 'needs_review' is time-triggered. It is treated
 *   identically to 'needs_review' receiving a review attempt.
 */
export function onReview(
  node: NodeState,
  correct: boolean,
  now: string,
  examWindow?: number | string | null,
  hintsUsed: number = 0
): NodeState {
  const nowMs = Date.parse(now);
  const dueMs = node.due_at ? Date.parse(node.due_at) : nowMs;

  // Calculate elapsed days since scheduled start or last review
  const lastStartMs = dueMs - node.stability * 86400000;
  const elapsedDays = Math.max(0, (nowMs - lastStartMs) / 86400000);
  const r = retrievability(node.stability, elapsedDays);

  const isCleanCorrect = correct && hintsUsed === 0;

  const newAttempt: Attempt = {
    attempt_id: `rev-${now}-${node.attempts_total + 1}`,
    learner_id: node.learner_id,
    node_id: node.node_id,
    item_id: `item-rev-${node.node_id}`,
    difficulty_tier: 2,
    correct,
    partial_credit: correct ? 1.0 : 0.0,
    selected_option: null,
    misconception_id: null,
    latency_ms: 0,
    hints_used: hintsUsed as HintsUsed,
    session_id: `sess-${now.slice(0, 10)}`,
    occurred_at: now,
    is_review: true,
    is_placement: false,
    is_exam: false,
  };
  const newWindow = [...node.recent_window.slice(-4), newAttempt];
  const newAttemptsTotal = node.attempts_total + 1;

  // Branch 1: Node is currently in 'relearning'
  if (node.status === "relearning") {
    if (isCleanCorrect) {
      // Recovery check (§3): 2 consecutive unhinted correct attempts recover to 'mastered'
      // If the immediate prior qualifying attempt was also unhinted correct during relearning:
      const priorAttempts = node.recent_window;
      const lastAttempt = priorAttempts.length > 0 ? priorAttempts[priorAttempts.length - 1]! : null;
      const hadPriorCorrect = lastAttempt !== null && lastAttempt.correct && lastAttempt.hints_used === 0;

      if (hadPriorCorrect) {
        // 2 consecutive correct achieved: recovers to 'mastered'!
        const compression = examCompression(now, examWindow);
        const newStability = Math.max(node.stability, 3.0);
        const dueAt = addDays(now, newStability * compression);

        return {
          ...node,
          status: "mastered",
          stability: newStability,
          due_at: dueAt,
          attempts_total: newAttemptsTotal,
          recent_window: newWindow,
        };
      } else {
        // 1st correct in relearning: remain in relearning
        const compression = examCompression(now, examWindow);
        const dueAt = addDays(now, 1.0 * compression);
        return {
          ...node,
          status: "relearning",
          due_at: dueAt,
          attempts_total: newAttemptsTotal,
          recent_window: newWindow,
        };
      }
    } else {
      // Incorrect while relearning: remains in relearning, lapse increments
      const newStability = Math.max(1.0, Math.round(node.stability * 0.3 * 10000) / 10000);
      const newDiff = Math.max(1.0, Math.min(10.0, Math.round((node.difficulty_fsrs + 0.6) * 10000) / 10000));
      const compression = examCompression(now, examWindow);
      const dueAt = addDays(now, newStability * compression);

      return {
        ...node,
        status: "relearning",
        lapses: node.lapses + 1,
        stability: newStability,
        difficulty_fsrs: newDiff,
        due_at: dueAt,
        attempts_total: newAttemptsTotal,
        recent_window: newWindow,
      };
    }
  }

  // Branch 2: Node is in 'needs_review' OR 'mastered' (per §3 implementation note)
  if (isCleanCorrect) {
    // FSRS-5 Correct Stability Update Formula (§8.1):
    // stability *= 1 + exp(w1) * (11 - difficulty_fsrs) * stability^(-w2) * (exp(w3*(1-R)) - 1)
    const factor =
      1 +
      Math.exp(FSRS5_DEFAULTS.w1) *
        (11 - node.difficulty_fsrs) *
        Math.pow(node.stability, -FSRS5_DEFAULTS.w2) *
        (Math.exp(FSRS5_DEFAULTS.w3 * (1 - r)) - 1);

    const newStability = Math.round(node.stability * factor * 10000) / 10000;
    const newDiff = Math.max(
      1.0,
      Math.min(10.0, Math.round((node.difficulty_fsrs - 0.1) * 10000) / 10000)
    );
    const compression = examCompression(now, examWindow);
    const dueAt = addDays(now, newStability * compression);

    return {
      ...node,
      status: "mastered",
      stability: newStability,
      difficulty_fsrs: newDiff,
      due_at: dueAt,
      attempts_total: newAttemptsTotal,
      recent_window: newWindow,
    };
  } else {
    // Incorrect: lapse (§8.1)
    const newStability = Math.max(1.0, Math.round(node.stability * 0.3 * 10000) / 10000);
    const newDiff = Math.max(
      1.0,
      Math.min(10.0, Math.round((node.difficulty_fsrs + 0.6) * 10000) / 10000)
    );
    const compression = examCompression(now, examWindow);
    const dueAt = addDays(now, newStability * compression);

    return {
      ...node,
      status: "relearning",
      lapses: node.lapses + 1,
      stability: newStability,
      difficulty_fsrs: newDiff,
      due_at: dueAt,
      attempts_total: newAttemptsTotal,
      recent_window: newWindow,
    };
  }
}

// ---------------------------------------------------------------------------
// 5. Daily Review Queue Construction (doc 04 §8.2, Invariant I-6)
// ---------------------------------------------------------------------------

export function extractNodeStates(
  learner: LearnerReviewContext | readonly NodeState[] | Record<string, NodeState> | Map<string, NodeState>
): { learnerId: string; nodes: readonly NodeState[]; completedToday: number } {
  if (Array.isArray(learner)) {
    return {
      learnerId: learner[0]?.learner_id ?? "learner",
      nodes: learner,
      completedToday: 0,
    };
  }
  if (learner instanceof Map) {
    const arr = Array.from(learner.values());
    return {
      learnerId: arr[0]?.learner_id ?? "learner",
      nodes: arr,
      completedToday: 0,
    };
  }
  if ("node_states" in learner) {
    const ctx = learner as LearnerReviewContext;
    let nodes: readonly NodeState[];
    if (Array.isArray(ctx.node_states)) {
      nodes = ctx.node_states;
    } else if (ctx.node_states instanceof Map) {
      nodes = Array.from(ctx.node_states.values());
    } else {
      nodes = Object.values(ctx.node_states);
    }
    return {
      learnerId: ctx.learner_id,
      nodes,
      completedToday: ctx.reviews_completed_today ?? 0,
    };
  }
  const nodes = Object.values(learner as Record<string, NodeState>);
  return {
    learnerId: nodes[0]?.learner_id ?? "learner",
    nodes,
    completedToday: 0,
  };
}

/**
 * Builds the daily review queue according to doc 04 §8.2:
 *   - Priority: relearning > overdue (largest now - due_at first) > exam-critical > due today
 *   - Daily cap of 8, hard (Invariant I-6)
 *   - Overdue decay: nodes overdue by > 60 days are admitted at a max of 3/day
 *   - Relearning nodes not yet due are excluded, even if there are empty slots
 */
export function buildReviewQueue(
  learner:
    | LearnerReviewContext
    | readonly NodeState[]
    | Record<string, NodeState>
    | Map<string, NodeState>,
  now: string,
  _graph?: GraphLookup,
  options: ReviewQueueOptions = {}
): ReviewQueue {
  const { learnerId, nodes, completedToday } = extractNodeStates(learner);

  const cap = options.cap ?? DAILY_REVIEW_CAP;
  const remainingBudget = Math.max(0, cap - completedToday);
  const maxOverdueBacklog = options.maxOverdueBacklog ?? MAX_OVERDUE_BACKLOG;

  const nowMs = Date.parse(now);

  const examCriticalSet = new Set<string>(
    options.examCriticalNodes
      ? Array.from(options.examCriticalNodes)
      : []
  );

  // Group candidates into priority categories
  const relearningItems: ReviewQueueItem[] = [];
  const overdueDeepItems: ReviewQueueItem[] = []; // > 60 days overdue
  const overdueNormalItems: ReviewQueueItem[] = []; // <= 60 days overdue
  const examCriticalItems: ReviewQueueItem[] = [];
  const dueTodayItems: ReviewQueueItem[] = [];

  let totalDueCount = 0;

  for (const node of nodes) {
    // Only nodes that have been mastered at least once can be reviewed
    if (!SECURED_STATUSES.has(node.status)) {
      continue;
    }

    if (!node.due_at) {
      continue;
    }

    const dueMs = Date.parse(node.due_at);
    const isDue = dueMs <= nowMs;
    const overdueDays = Math.max(0, (nowMs - dueMs) / 86400000);

    if (node.status === "relearning") {
      // Relearning nodes not yet due are strictly excluded (§8.2)
      if (!isDue) {
        continue;
      }
      totalDueCount++;
      relearningItems.push({
        node_id: node.node_id,
        status: node.status,
        due_at: node.due_at,
        overdue_days: overdueDays,
        priority_tier: "relearning",
      });
      continue;
    }

    // For mastered / needs_review nodes:
    if (!isDue) {
      continue;
    }

    totalDueCount++;

    const isExamCritical = examCriticalSet.has(node.node_id);

    if (overdueDays > 60) {
      overdueDeepItems.push({
        node_id: node.node_id,
        status: node.status,
        due_at: node.due_at,
        overdue_days: overdueDays,
        priority_tier: "overdue",
        is_exam_critical: isExamCritical,
      });
    } else if (overdueDays > 0) {
      overdueNormalItems.push({
        node_id: node.node_id,
        status: node.status,
        due_at: node.due_at,
        overdue_days: overdueDays,
        priority_tier: "overdue",
        is_exam_critical: isExamCritical,
      });
    } else if (isExamCritical) {
      examCriticalItems.push({
        node_id: node.node_id,
        status: node.status,
        due_at: node.due_at,
        overdue_days: 0,
        priority_tier: "exam_critical",
        is_exam_critical: true,
      });
    } else {
      dueTodayItems.push({
        node_id: node.node_id,
        status: node.status,
        due_at: node.due_at,
        overdue_days: 0,
        priority_tier: "due_today",
      });
    }
  }

  // Deterministic sorting within each tier:
  // Relearning: tie-break by node_id alphabetical
  relearningItems.sort((a, b) => a.node_id.localeCompare(b.node_id));

  // Overdue: largest overdue_days first, tie-break by node_id
  const sortOverdue = (a: ReviewQueueItem, b: ReviewQueueItem) => {
    if (Math.abs(b.overdue_days - a.overdue_days) > 1e-4) {
      return b.overdue_days - a.overdue_days;
    }
    return a.node_id.localeCompare(b.node_id);
  };
  overdueDeepItems.sort(sortOverdue);
  overdueNormalItems.sort(sortOverdue);

  // Exam critical: tie-break by node_id
  examCriticalItems.sort((a, b) => a.node_id.localeCompare(b.node_id));

  // Due today: tie-break by node_id
  dueTodayItems.sort((a, b) => a.node_id.localeCompare(b.node_id));

  // Assemble the queue up to remainingBudget (I-6)
  const queue: ReviewQueueItem[] = [];

  // 1. Relearning (due only)
  for (const item of relearningItems) {
    if (queue.length >= remainingBudget) break;
    queue.push(item);
  }

  // 2. Overdue deep (>60 days overdue) — capped at maxOverdueBacklog (default 3)
  let overdueDeepAdmitted = 0;
  for (const item of overdueDeepItems) {
    if (queue.length >= remainingBudget || overdueDeepAdmitted >= maxOverdueBacklog) break;
    queue.push(item);
    overdueDeepAdmitted++;
  }

  // 3. Overdue normal (<=60 days overdue)
  for (const item of overdueNormalItems) {
    if (queue.length >= remainingBudget) break;
    queue.push(item);
  }

  // 4. Exam-critical due today
  for (const item of examCriticalItems) {
    if (queue.length >= remainingBudget) break;
    queue.push(item);
  }

  // 5. Due today
  for (const item of dueTodayItems) {
    if (queue.length >= remainingBudget) break;
    queue.push(item);
  }

  // Exam-window backlog telemetry (§8.2 v2, Task C4)
  // When inside an exam window (<= 90 days) and backlog exceeds cap, emit review_backlog_in_exam_window.
  let isExamWindow = false;
  const daysUntilExam =
    options.daysUntilExam ??
    options.examWindowDays ??
    (learner && typeof learner === "object" && "days_until_exam" in learner
      ? (learner as LearnerReviewContext).days_until_exam
      : undefined);

  if (typeof daysUntilExam === "number" && daysUntilExam <= 90) {
    isExamWindow = true;
  } else if (
    learner &&
    typeof learner === "object" &&
    "exam_date" in learner &&
    (learner as LearnerReviewContext).exam_date
  ) {
    const examMs = Date.parse((learner as LearnerReviewContext).exam_date!);
    const nowMs = Date.parse(now);
    if (!Number.isNaN(examMs) && !Number.isNaN(nowMs) && (examMs - nowMs) / 86400000 <= 90) {
      isExamWindow = true;
    }
  }

  const examWindowBacklog = isExamWindow && totalDueCount > cap ? totalDueCount - cap : 0;

  return {
    learner_id: learnerId,
    date: now.slice(0, 10),
    items: queue,
    total_due: totalDueCount,
    cap,
    ...(examWindowBacklog > 0
      ? { telemetry: { review_backlog_in_exam_window: examWindowBacklog } }
      : {}),
  };
}
