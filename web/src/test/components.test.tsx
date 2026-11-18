import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoverageGauge } from "@/components/admin/CoverageGauge";
import { QualityCheckPanel } from "@/components/admin/QualityCheckPanel";
import { DistractorTable } from "@/components/admin/DistractorTable";
import { ItemRenderer } from "@/components/render/ItemRenderer";
import { BlockRenderer } from "@/components/render/BlockRenderer";
import { AssessmentItem, ContentBlock } from "@/types";

describe("Content Studio Component Suite", () => {
  it("renders CoverageGauge and highlights the 80% activation gate", () => {
    const { container, rerender } = render(<CoverageGauge percentage={75} threshold={80} size={140} />);
    expect(screen.getByText(/75(\.0)?%/)).toBeInTheDocument();
    expect(screen.getByText(/80% Gate/)).toBeInTheDocument();
    expect(container.querySelector("[data-testid='coverage-gauge']")).toBeInTheDocument();

    // Rerender above threshold
    rerender(<CoverageGauge percentage={85} threshold={80} size={140} />);
    expect(screen.getByText(/85(\.0)?%/)).toBeInTheDocument();
  });

  it("renders QualityCheckPanel displaying SymPy invariance and readability metrics", () => {
    render(
      <QualityCheckPanel
        readingLevel={4.2}
        readingLevelTarget="Grade 4–5"
        mathInvariancePass={true}
        katexValid={true}
        workedExamplesCount={3}
        dedupSimilarity={0.12}
      />
    );

    expect(screen.getByText(/Automated Quality Gate Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Reading Level: Grade 4.2/i)).toBeInTheDocument();
    expect(screen.getByText(/SymPy Invariance Verified/i)).toBeInTheDocument();
    expect(screen.getByText("KaTeX Validated")).toBeInTheDocument();
  });

  it("renders DistractorTable displaying options and misconception tags", () => {
    const options = [
      { id: "opt-1", content: "13/20", correct: true },
      {
        id: "opt-2",
        content: "3/9",
        correct: false,
        misconception_id: "MATH.MISC.ADD_NUM_DENOM",
        learner_facing_name: "Adding numerators across",
      },
      {
        id: "opt-3",
        content: "3/20",
        correct: false,
        misconception_id: "untagged",
      },
    ];

    render(<DistractorTable options={options} />);
    expect(screen.getByText(/Distractor Misconception Audit/)).toBeInTheDocument();
    expect(screen.getByText("3/9")).toBeInTheDocument();
    expect(screen.getByText("MATH.MISC.ADD_NUM_DENOM")).toBeInTheDocument();
  });

  it("renders canonical ItemRenderer with math prompt and choices", () => {
    const sampleItem: AssessmentItem = {
      item_id: "test-item-1",
      node_id: "MATH.FRAC.ADD",
      type: "multiple_choice",
      difficulty_tier: 2,
      difficulty_elo: 1200,
      stem: "What is 1/2 + 1/3?",
      payload: {
        options: [
          { id: "o1", content: "5/6", correct: true },
          { id: "o2", content: "2/5", correct: false },
        ],
      },
      hints: [{ level: 1, text: "Find common denominator" }],
      worked_solution: { text: "1/2 + 1/3 = 3/6 + 2/6 = 5/6" },
      status: "tagged",
    };

    render(<ItemRenderer item={sampleItem} />);
    expect(screen.getByText("What is 1/2 + 1/3?")).toBeInTheDocument();
    expect(screen.getByText("5/6")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toBeInTheDocument();
  });

  it("renders canonical BlockRenderer with headings, text, and worked examples", () => {
    const blocks: ContentBlock[] = [
      {
        block_id: "b1",
        type: "heading",
        payload: { level: 2, text: "Fractions Fundamentals" },
      },
      {
        block_id: "b2",
        type: "text",
        payload: { text: "Fractions represent parts of a whole unit." },
      },
      {
        block_id: "b3",
        type: "worked_example",
        payload: {
          problem: "Simplify 4/8",
          steps: ["Divide numerator and denominator by 4", "4/4 = 1, 8/4 = 2"],
          final_answer: "1/2",
        },
      },
    ];

    render(<BlockRenderer blocks={blocks} />);
    expect(screen.getByText("Fractions Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("Fractions represent parts of a whole unit.")).toBeInTheDocument();
    expect(screen.getByText("Simplify 4/8")).toBeInTheDocument();
    expect(screen.getByText(/Final Answer/)).toBeInTheDocument();
  });
});
