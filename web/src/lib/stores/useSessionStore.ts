import { create } from "zustand";

interface SessionState {
  activeNodeId: string | null;
  sessionType: "practice" | "placement" | "exam" | "reader";
  turnIndex: number;
  interleaveCounter: number;
  sessionStartTime: number;
  currentTurnStartTime: number;

  startSession: (nodeId: string | null, type: "practice" | "placement" | "exam" | "reader") => void;
  nextTurn: () => number; // returns latencyMs for previous turn
  isReviewTurn: () => boolean; // every 4th practice item is interleaved review
  endSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  activeNodeId: "MATH.FRAC.ADD_UNLIKE",
  sessionType: "practice",
  turnIndex: 0,
  interleaveCounter: 0,
  sessionStartTime: Date.now(),
  currentTurnStartTime: Date.now(),

  startSession: (nodeId, type) =>
    set({
      activeNodeId: nodeId,
      sessionType: type,
      turnIndex: 0,
      interleaveCounter: 0,
      sessionStartTime: Date.now(),
      currentTurnStartTime: Date.now(),
    }),

  nextTurn: () => {
    const now = Date.now();
    const latencyMs = Math.max(0, now - get().currentTurnStartTime);
    const nextTurnIndex = get().turnIndex + 1;
    const nextInterleave = (get().interleaveCounter + 1) % 4;

    set({
      turnIndex: nextTurnIndex,
      interleaveCounter: nextInterleave,
      currentTurnStartTime: now,
    });

    return latencyMs;
  },

  isReviewTurn: () => {
    // Every 4th item in a practice session comes from the review queue
    return get().sessionType === "practice" && get().turnIndex > 0 && get().turnIndex % 4 === 0;
  },

  endSession: () =>
    set({
      activeNodeId: null,
      turnIndex: 0,
      interleaveCounter: 0,
    }),
}));
