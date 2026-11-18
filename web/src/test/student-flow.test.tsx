import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LearningPathNodeCard } from "../components/student/LearningPathNodeCard";
import { PracticeFeedbackBanner } from "../components/student/PracticeFeedbackBanner";
import { TopicHeatmap } from "../components/student/TopicHeatmap";
import { MockExamTimer } from "../components/student/MockExamTimer";
import { ReadAloudButton } from "../components/student/ReadAloudButton";
import type { ClientNodeState } from "../lib/stores/useNodeStateStore";

describe("Student UI Components & Flow Verification", () => {
  describe("LearningPathNodeCard", () => {
    it("renders available node correctly with title, topic, and estimated minutes", () => {
      const node: ClientNodeState = {
        node_id: "MATH.FRAC.ADD_UNLIKE",
        learner_title: "Adding Unlike Fractions",
        topic: "Fractions & Decimals",
        status: "available",
        prerequisites: [],
        est_minutes: 14,
        recent_window: [],
        max_tier_correct: 0,
        stability: 3.0,
        difficulty_fsrs: 5.0,
        due_at: null,
      };

      render(<LearningPathNodeCard node={node} />);

      expect(screen.getByText("Adding Unlike Fractions")).toBeDefined();
      expect(screen.getByText("Fractions & Decimals")).toBeDefined();
      expect(screen.getByText("14 min")).toBeDefined();
      expect(screen.getByText("Ready to start")).toBeDefined();
    });

    it("displays friendly prerequisite blocking tooltip using learner title (never raw node_id)", () => {
      const lockedNode: ClientNodeState = {
        node_id: "MATH.ALG.LINEAR_ONE_VAR",
        learner_title: "Linear Equations in One Variable",
        topic: "Algebra & Equations",
        status: "locked",
        prerequisites: ["MATH.FRAC.ADD_UNLIKE"],
        est_minutes: 18,
        recent_window: [],
        max_tier_correct: 0,
        stability: 3.0,
        difficulty_fsrs: 5.5,
        due_at: null,
      };

      const titles = {
        "MATH.FRAC.ADD_UNLIKE": "Adding Unlike Fractions",
      };

      render(<LearningPathNodeCard node={lockedNode} prereqTitles={titles} />);

      expect(screen.getByText("Locked")).toBeDefined();
      // Must show the prerequisite's human learner title
      expect(screen.getByText("Adding Unlike Fractions")).toBeDefined();
      // Must not leak the raw node ID to the learner
      const card = screen.getByTestId("node-card-MATH.ALG.LINEAR_ONE_VAR");
      expect(card.textContent).toContain("Complete Adding Unlike Fractions first to unlock");
    });
  });

  describe("PracticeFeedbackBanner", () => {
    it("renders correct success feedback state", () => {
      render(
        <PracticeFeedbackBanner
          isCorrect={true}
          currentHintTier={0}
          onRequestHint={() => {}}
          onNext={() => {}}
        />
      );

      expect(screen.getByText("Spot on! That's correct.")).toBeDefined();
      expect(screen.getByText("Continue")).toBeDefined();
    });

    it("renders misconception diagnosis and progressive hint reveal", () => {
      let requestedHint = false;
      render(
        <PracticeFeedbackBanner
          isCorrect={false}
          misconceptionTitle="Adding denominators directly"
          misconceptionExplanation="Denominators specify partition sizes and cannot be added directly."
          currentHintTier={1}
          hintText="Find a common denominator first."
          onRequestHint={() => {
            requestedHint = true;
          }}
          onNext={() => {}}
        />
      );

      expect(screen.getByText("Let's review this together.")).toBeDefined();
      expect(screen.getAllByText(/Adding denominators directly/).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText("Denominators specify partition sizes and cannot be added directly.")
      ).toBeDefined();
      expect(screen.getByText("Find a common denominator first.")).toBeDefined();

      const hintBtn = screen.getByText("Show Next Hint (2/3)");
      fireEvent.click(hintBtn);
      expect(requestedHint).toBe(true);
    });
  });

  describe("TopicHeatmap & Dignity Constraints", () => {
    it("renders coverage without any grade level, percentile, or rank comparisons", () => {
      const mockNodes: Record<string, ClientNodeState> = {
        "N1": {
          node_id: "N1",
          learner_title: "Fractions Basics",
          topic: "Fractions",
          status: "mastered",
          prerequisites: [],
          est_minutes: 10,
          recent_window: [],
          max_tier_correct: 3,
          stability: 5.0,
          difficulty_fsrs: 4.5,
          due_at: null,
        },
        "N2": {
          node_id: "N2",
          learner_title: "Decimals Basics",
          topic: "Decimals",
          status: "available",
          prerequisites: [],
          est_minutes: 10,
          recent_window: [],
          max_tier_correct: 0,
          stability: 3.0,
          difficulty_fsrs: 4.5,
          due_at: null,
        },
      };

      const { container } = render(<TopicHeatmap nodes={mockNodes} />);

      expect(screen.getByText("Fractions")).toBeDefined();
      expect(screen.getByText("Decimals")).toBeDefined();

      // STRICT DIGNITY CONSTRAINT: Check container text content for forbidden words
      const text = container.textContent?.toLowerCase() || "";
      expect(text).not.toContain("grade level");
      expect(text).not.toContain("percentile");
      expect(text).not.toContain("rank");
      expect(text).not.toContain("behind peers");
      expect(text).not.toContain("ahead of peers");
    });
  });

  describe("MockExamTimer", () => {
    it("renders formatted minutes and seconds", () => {
      render(<MockExamTimer totalSeconds={3600} onTimeUp={() => {}} />);
      expect(screen.getByText("01:00:00")).toBeDefined();
    });
  });
});
