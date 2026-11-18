import { create } from "zustand";

export type NodeStatus =
  | "locked"
  | "available"
  | "in_progress"
  | "mastered"
  | "needs_review"
  | "relearning";

export interface AttemptSnapshot {
  correct: boolean;
  hints_used: number;
  tier: number;
  date: string; // YYYY-MM-DD
}

export interface ClientNodeState {
  node_id: string;
  learner_title: string;
  topic: string;
  status: NodeStatus;
  prerequisites: string[]; // blocking prerequisites
  est_minutes: number;
  recent_window: AttemptSnapshot[];
  max_tier_correct: number;
  stability: number;
  difficulty_fsrs: number;
  due_at: string | null;
}

interface NodeStateStore {
  nodes: Record<string, ClientNodeState>;
  abilityElo: number;

  setNodeState: (nodeId: string, partial: Partial<ClientNodeState>) => void;
  recordAttempt: (nodeId: string, attempt: { correct: boolean; hints_used: number; tier: number }) => void;
  evaluateMastery: (nodeId: string) => boolean;
  getNode: (nodeId: string) => ClientNodeState | undefined;
}

// Initial curriculum node states with topics and prerequisite relationships
const INITIAL_NODES: Record<string, ClientNodeState> = {
  "MATH.FRAC.EQUIV": {
    node_id: "MATH.FRAC.EQUIV",
    learner_title: "Equivalent Fractions",
    topic: "Fractions & Decimals",
    status: "mastered",
    prerequisites: [],
    est_minutes: 10,
    recent_window: [
      { correct: true, hints_used: 0, tier: 2, date: "2026-09-10" },
      { correct: true, hints_used: 0, tier: 2, date: "2026-09-10" },
      { correct: true, hints_used: 0, tier: 3, date: "2026-09-12" },
      { correct: true, hints_used: 0, tier: 3, date: "2026-09-13" },
      { correct: true, hints_used: 0, tier: 3, date: "2026-09-13" },
    ],
    max_tier_correct: 3,
    stability: 7.2,
    difficulty_fsrs: 4.5,
    due_at: "2026-09-20T00:00:00Z",
  },
  "MATH.FRAC.COMPARE": {
    node_id: "MATH.FRAC.COMPARE",
    learner_title: "Comparing Fractions",
    topic: "Fractions & Decimals",
    status: "mastered",
    prerequisites: ["MATH.FRAC.EQUIV"],
    est_minutes: 12,
    recent_window: [
      { correct: true, hints_used: 0, tier: 2, date: "2026-09-11" },
      { correct: true, hints_used: 0, tier: 3, date: "2026-09-13" },
      { correct: true, hints_used: 0, tier: 3, date: "2026-09-14" },
      { correct: true, hints_used: 0, tier: 3, date: "2026-09-14" },
    ],
    max_tier_correct: 3,
    stability: 5.8,
    difficulty_fsrs: 4.8,
    due_at: "2026-09-19T00:00:00Z",
  },
  "MATH.FRAC.ADD_UNLIKE": {
    node_id: "MATH.FRAC.ADD_UNLIKE",
    learner_title: "Adding Unlike Fractions",
    topic: "Fractions & Decimals",
    status: "in_progress",
    prerequisites: ["MATH.FRAC.COMPARE"],
    est_minutes: 14,
    recent_window: [
      { correct: true, hints_used: 0, tier: 2, date: "2026-09-15" },
      { correct: false, hints_used: 1, tier: 2, date: "2026-09-15" },
      { correct: true, hints_used: 0, tier: 2, date: "2026-09-15" },
    ],
    max_tier_correct: 2,
    stability: 3.0,
    difficulty_fsrs: 5.0,
    due_at: "2026-09-16T00:00:00Z",
  },
  "MATH.FRAC.SUBTRACT": {
    node_id: "MATH.FRAC.SUBTRACT",
    learner_title: "Subtracting Unlike Fractions",
    topic: "Fractions & Decimals",
    status: "available",
    prerequisites: ["MATH.FRAC.ADD_UNLIKE"],
    est_minutes: 14,
    recent_window: [],
    max_tier_correct: 0,
    stability: 3.0,
    difficulty_fsrs: 5.0,
    due_at: null,
  },
  "MATH.DEC.CONVERT_FRAC": {
    node_id: "MATH.DEC.CONVERT_FRAC",
    learner_title: "Converting Decimals to Fractions",
    topic: "Fractions & Decimals",
    status: "available",
    prerequisites: ["MATH.FRAC.EQUIV"],
    est_minutes: 12,
    recent_window: [],
    max_tier_correct: 0,
    stability: 3.0,
    difficulty_fsrs: 4.8,
    due_at: null,
  },
  "MATH.ALG.LINEAR_ONE_VAR": {
    node_id: "MATH.ALG.LINEAR_ONE_VAR",
    learner_title: "Linear Equations in One Variable",
    topic: "Algebra & Equations",
    status: "locked",
    prerequisites: ["MATH.FRAC.ADD_UNLIKE", "MATH.FRAC.SUBTRACT"],
    est_minutes: 18,
    recent_window: [],
    max_tier_correct: 0,
    stability: 3.0,
    difficulty_fsrs: 5.5,
    due_at: null,
  },
  "MATH.GEO.PYTHAGORAS": {
    node_id: "MATH.GEO.PYTHAGORAS",
    learner_title: "Pythagorean Theorem",
    topic: "Geometry & Measurement",
    status: "locked",
    prerequisites: ["MATH.ALG.LINEAR_ONE_VAR"],
    est_minutes: 20,
    recent_window: [],
    max_tier_correct: 0,
    stability: 3.0,
    difficulty_fsrs: 5.2,
    due_at: null,
  },
};

export const useNodeStateStore = create<NodeStateStore>((set, get) => ({
  nodes: INITIAL_NODES,
  abilityElo: 1240,

  setNodeState: (nodeId, partial) =>
    set((state) => {
      const existing = state.nodes[nodeId];
      const base: ClientNodeState = existing || {
        node_id: nodeId,
        learner_title: nodeId,
        topic: "General",
        status: "available",
        prerequisites: [],
        est_minutes: 10,
        recent_window: [],
        max_tier_correct: 0,
        stability: 3.0,
        difficulty_fsrs: 5.0,
        due_at: null,
      };
      return {
        nodes: {
          ...state.nodes,
          [nodeId]: { ...base, ...partial },
        },
      };
    }),

  recordAttempt: (nodeId, { correct, hints_used, tier }) => {
    const today = new Date().toISOString().split("T")[0];
    const node = get().nodes[nodeId];
    if (!node) return;

    const newWindow = [...node.recent_window, { correct, hints_used, tier, date: today }].slice(-5);
    const newMaxTier = correct ? Math.max(node.max_tier_correct, tier) : node.max_tier_correct;

    const updatedNode: ClientNodeState = {
      ...node,
      recent_window: newWindow,
      max_tier_correct: newMaxTier,
      status: node.status === "available" ? "in_progress" : node.status,
    };

    set((state) => ({
      nodes: { ...state.nodes, [nodeId]: updatedNode },
    }));

    // Check if attempt triggers mastery
    get().evaluateMastery(nodeId);
  },

  evaluateMastery: (nodeId) => {
    const node = get().nodes[nodeId];
    if (!node) return false;

    // Doc 04 §4 Mastery Predicate:
    // |recent_window| >= 4
    // AND count(correct && hints_used == 0) >= 4
    // AND max_tier_correct >= 3
    // AND distinct_dates >= 2
    // AND (max_day - min_day) >= 2 days (non-consecutive)
    const window = node.recent_window;
    if (window.length < 4) return false;

    const unhintedCorrect = window.filter((a) => a.correct && a.hints_used === 0);
    if (unhintedCorrect.length < 4) return false;
    if (node.max_tier_correct < 3) return false;

    const dates = Array.from(new Set(unhintedCorrect.map((a) => a.date))).sort();
    if (dates.length < 2) return false;

    const firstDate = new Date(dates[0]).getTime();
    const lastDate = new Date(dates[dates.length - 1]).getTime();
    const daySpan = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
    if (daySpan < 2) return false;

    // All mastery predicates met!
    set((state) => ({
      nodes: {
        ...state.nodes,
        [nodeId]: {
          ...state.nodes[nodeId],
          status: "mastered",
          stability: 3.0,
          due_at: new Date(Date.now() + 3 * 86400000).toISOString(),
        },
      },
    }));

    return true;
  },

  getNode: (nodeId) => get().nodes[nodeId],
}));
