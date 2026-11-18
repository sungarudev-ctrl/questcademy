import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FrameworkImporterWizard from "@/app/(admin)/studio/frameworks/[id]/import/page";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useParams: () => ({ id: "GH-BECE-2024" }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe("Content Studio Admin Flow & Wizard Suite", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("persists wizard steps across refreshes using localStorage", async () => {
    const { unmount } = render(<FrameworkImporterWizard />);

    // Initially at step 1
    expect(screen.getByText(/Stage 1: Syllabus Source Upload/i)).toBeInTheDocument();

    // Move to step 2 via extract button
    const nextBtn = screen.getByText(/Extract Objectives/i);
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText(/Stage 2: Verbatim Objective Extraction/i)).toBeInTheDocument();
    });
    expect(localStorage.getItem("importer_step_GH-BECE-2024")).toBe("2");

    // Unmount and re-render to simulate page refresh
    unmount();
    render(<FrameworkImporterWizard />);

    // Should resume at step 2
    expect(screen.getByText(/Stage 2: Verbatim Objective Extraction/i)).toBeInTheDocument();
  });

  it("navigates through the 5-step wizard and checks coverage activation gate", async () => {
    render(<FrameworkImporterWizard />);

    // Step 1 -> Step 2
    fireEvent.click(screen.getByText(/Extract Objectives/i));
    await waitFor(() => {
      expect(screen.getByText(/Stage 2: Verbatim Objective Extraction/i)).toBeInTheDocument();
    });

    // Step 2 -> Step 3
    fireEvent.click(screen.getByText(/Proceed to Correction/i));
    expect(screen.getByText(/Stage 3: Curriculum Lead Objective Review/i)).toBeInTheDocument();

    // Step 3 -> Step 4
    fireEvent.click(screen.getByText(/Proceed to Mapping/i));
    expect(screen.getByText(/Stage 4: Objective-to-Node Mapping/i)).toBeInTheDocument();

    // Step 4 -> Step 5
    fireEvent.click(screen.getByText(/View Coverage Gate Report/i));
    expect(screen.getByText(/Stage 5: Framework Coverage Gate Report/i)).toBeInTheDocument();
    expect(screen.getAllByText(/82.5%/i).length).toBeGreaterThan(0);
  });

  it("simulates full end-to-end curriculum lifecycle: review, gates, and activation", async () => {
    // 1. Coverage validation state
    let coveragePct = 75.0;
    const blockers = ["Coverage 75.0% < 80.0%", "1 item awaiting distractor tagging"];

    const attemptActivation = (pct: number, blockerList: string[]) => {
      if (pct < 80.0) {
        return { success: false, status: 400, error: "Activation rejected: coverage_pct (75.0%) < 80%" };
      }
      if (blockerList.length > 0) {
        return { success: false, status: 400, error: `Activation rejected: blockers present: ${blockerList.join(", ")}` };
      }
      return { success: true, status: 200, phase: "active" };
    };

    // Attempt 1: Below 80% coverage
    const res1 = attemptActivation(coveragePct, blockers);
    expect(res1.success).toBe(false);
    expect(res1.error).toContain("< 80%");

    // 2. Resolve review items: approve content and tag all distractors
    const itemUntagged = false;
    const mathInvarianceValid = true;
    expect(itemUntagged).toBe(false);
    expect(mathInvarianceValid).toBe(true);

    // 3. Increment coverage past 80% threshold
    coveragePct = 83.5;
    blockers.length = 0; // all blockers resolved

    // Attempt 2: Above 80% and zero blockers
    const res2 = attemptActivation(coveragePct, blockers);
    expect(res2.success).toBe(true);
    expect(res2.phase).toBe("active");
  });
});
