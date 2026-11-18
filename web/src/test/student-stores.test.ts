import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../lib/stores/useAuthStore";
import { useLearnerStore } from "../lib/stores/useLearnerStore";
import { useNodeStateStore } from "../lib/stores/useNodeStateStore";
import { useSessionStore } from "../lib/stores/useSessionStore";
import { useSyncStore } from "../lib/stores/useSyncStore";
import { checkAuthoritativeMastery, toEngineNodeState } from "../lib/engine/engineClient";

describe("Student Stores & Engine Client Integration", () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    useSessionStore.getState().endSession();
    useSyncStore.getState().clearQueue();
  });

  describe("useAuthStore", () => {
    it("logs in and sets learner credentials", () => {
      const { login } = useAuthStore.getState();
      login("mock-token-abc", "learner-42", "learner");

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.learnerId).toBe("learner-42");
      expect(state.token).toBe("mock-token-abc");
    });

    it("logs out and clears learner credentials", () => {
      const { login, logout } = useAuthStore.getState();
      login("mock-token-abc", "learner-42");
      logout();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.token).toBeNull();
    });
  });

  describe("useLearnerStore", () => {
    it("updates framework pin and exam date", () => {
      const { setFramework, setExamDate, addMinutes } = useLearnerStore.getState();
      setFramework("GH-BECE-2024", "GH");
      setExamDate("2026-07-01");
      addMinutes(15);

      const state = useLearnerStore.getState();
      expect(state.frameworkId).toBe("GH-BECE-2024");
      expect(state.countryCode).toBe("GH");
      expect(state.examDate).toBe("2026-07-01");
      expect(state.weeklyMinutes).toBeGreaterThanOrEqual(15);
    });

    it("updates accessibility preferences", () => {
      const { updatePreferences } = useLearnerStore.getState();
      updatePreferences({ dyslexiaFont: true, textScale: 1.15 });

      const state = useLearnerStore.getState();
      expect(state.preferences.dyslexiaFont).toBe(true);
      expect(state.preferences.textScale).toBe(1.15);
    });
  });

  describe("useNodeStateStore & Engine Authoritative Mastery", () => {
    it("retrieves initialized curriculum nodes", () => {
      const { getNode } = useNodeStateStore.getState();
      const node = getNode("MATH.FRAC.EQUIV");
      expect(node).toBeDefined();
      expect(node?.status).toBe("mastered");
      expect(node?.topic).toBe("Fractions & Decimals");
    });

    it("records attempts and satisfies engine mastery predicate across distinct dates", () => {
      const { setNodeState, recordAttempt, getNode } = useNodeStateStore.getState();

      const testNodeId = "MATH.TEST.MASTERY";
      setNodeState(testNodeId, {
        node_id: testNodeId,
        learner_title: "Test Node",
        topic: "Testing",
        status: "in_progress",
        prerequisites: [],
        est_minutes: 10,
        recent_window: [
          { correct: true, hints_used: 0, tier: 3, date: "2026-09-10" },
          { correct: true, hints_used: 0, tier: 3, date: "2026-09-11" },
          { correct: true, hints_used: 0, tier: 3, date: "2026-09-12" },
        ],
        max_tier_correct: 3,
        stability: 3.0,
        difficulty_fsrs: 5.0,
        due_at: null,
      });

      // 4th unhinted correct attempt on today
      recordAttempt(testNodeId, { correct: true, hints_used: 0, tier: 3 });

      const updated = getNode(testNodeId);
      expect(updated?.status).toBe("mastered");

      // Verify with engine authoritative function
      if (updated) {
        const isMasteredByEngine = checkAuthoritativeMastery(updated);
        expect(isMasteredByEngine).toBe(true);
      }
    });
  });

  describe("useSessionStore", () => {
    it("tracks turn increments and triggers interleaved review every 4th turn", () => {
      const { startSession, nextTurn, isReviewTurn } = useSessionStore.getState();
      startSession("MATH.FRAC.ADD_UNLIKE", "practice");

      expect(isReviewTurn()).toBe(false);

      nextTurn(); // turn 1
      nextTurn(); // turn 2
      nextTurn(); // turn 3
      nextTurn(); // turn 4

      expect(isReviewTurn()).toBe(true);
    });
  });

  describe("useSyncStore (Offline attempt queue & replay)", () => {
    it("enqueues attempts when offline and replays queue", async () => {
      const { setOnline, enqueueAttempt } = useSyncStore.getState();
      setOnline(false);

      enqueueAttempt({
        node_id: "MATH.FRAC.ADD_UNLIKE",
        item_id: "ITEM-01",
        selected_option_id: "OPT-A",
        correct: true,
        hints_used: 0,
        latency_ms: 1200,
      });

      expect(useSyncStore.getState().pendingAttempts.length).toBe(1);

      const replayResult = await useSyncStore.getState().replayQueue();
      expect(replayResult.success).toBe(true);
      expect(replayResult.replayed).toBe(1);
      expect(useSyncStore.getState().pendingAttempts.length).toBe(0);
    });
  });
});
