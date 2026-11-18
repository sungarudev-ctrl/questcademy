"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Play,
  RotateCcw,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { submitStudentAttempt } from "@/lib/api/studentClient";
import { MockExamTimer } from "@/components/student/MockExamTimer";
import { ItemRenderer } from "@/components/render/ItemRenderer";
import type { AssessmentItem } from "@/types";

interface MockExamPaper {
  id: string;
  title: string;
  durationMinutes: number;
  totalQuestions: number;
  topicsCovered: string[];
}

const AVAILABLE_MOCKS: MockExamPaper[] = [
  {
    id: "MOCK-BECE-2024-P1",
    title: "BECE Mathematics Paper 1 (Objective Core)",
    durationMinutes: 60,
    totalQuestions: 4,
    topicsCovered: ["Fractions & Decimals", "Algebra & Equations", "Geometry & Measurement"],
  },
  {
    id: "MOCK-BECE-2024-P2",
    title: "BECE Mathematics Paper 2 (Structured Problem Solving)",
    durationMinutes: 90,
    totalQuestions: 4,
    topicsCovered: ["Algebra & Equations", "Geometry & Measurement"],
  },
];

const MOCK_QUESTIONS: AssessmentItem[] = [
  {
    item_id: "EXAM-Q1",
    node_id: "MATH.FRAC.ADD_UNLIKE",
    stem: "Question 1: Find the value of $\\frac{3}{8} + \\frac{1}{4}$ expressed as a single fraction in lowest terms.",
    type: "mcq_single",
    difficulty_tier: 2,
    difficulty_elo: 1210,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "$\\frac{5}{8}$", correct: true, is_correct: true },
        { id: "B", option_id: "B", content: "$\\frac{4}{12}$", correct: false, is_correct: false },
        { id: "C", option_id: "C", content: "$\\frac{1}{2}$", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "$\\frac{7}{8}$", correct: false, is_correct: false },
      ],
    },
  },
  {
    item_id: "EXAM-Q2",
    node_id: "MATH.ALG.LINEAR_ONE_VAR",
    stem: "Question 2: If $4x - 7 = 21$, determine the value of $x$.",
    type: "mcq_single",
    difficulty_tier: 2,
    difficulty_elo: 1240,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "$x = 7$", correct: true, is_correct: true },
        { id: "B", option_id: "B", content: "$x = 5$", correct: false, is_correct: false },
        { id: "C", option_id: "C", content: "$x = 28$", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "$x = 3.5$", correct: false, is_correct: false },
      ],
    },
  },
  {
    item_id: "EXAM-Q3",
    node_id: "MATH.DEC.CONVERT_FRAC",
    stem: "Question 3: Express $0.375$ as a fraction in simplest form.",
    type: "mcq_single",
    difficulty_tier: 2,
    difficulty_elo: 1220,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "$\\frac{3}{8}$", correct: true, is_correct: true },
        { id: "B", option_id: "B", content: "$\\frac{37}{100}$", correct: false, is_correct: false },
        { id: "C", option_id: "C", content: "$\\frac{3}{4}$", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "$\\frac{7}{20}$", correct: false, is_correct: false },
      ],
    },
  },
  {
    item_id: "EXAM-Q4",
    node_id: "MATH.GEO.PYTHAGORAS",
    stem: "Question 4: A right-angled triangle has legs of lengths 6 cm and 8 cm. What is the length of its hypotenuse?",
    type: "mcq_single",
    difficulty_tier: 3,
    difficulty_elo: 1290,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "10 cm", correct: true, is_correct: true },
        { id: "B", option_id: "B", content: "14 cm", correct: false, is_correct: false },
        { id: "C", option_id: "C", content: "12 cm", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "48 cm", correct: false, is_correct: false },
      ],
    },
  },
];

export default function MockExamsPage() {
  const { frameworkId } = useLearnerStore();

  const [activeExam, setActiveExam] = useState<MockExamPaper | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const handleStartExam = (paper: MockExamPaper) => {
    setActiveExam(paper);
    setCurrentQIndex(0);
    setAnswers({});
    setIsCompleted(false);
  };

  const handleSelectOption = (optId: string) => {
    setAnswers((prev) => ({ ...prev, [currentQIndex]: optId }));
  };

  const handleFinishExam = async () => {
    setIsCompleted(true);

    // Record exam attempts with is_exam: true so they DO NOT pollute daily mastery window
    for (let i = 0; i < MOCK_QUESTIONS.length; i++) {
      const q = MOCK_QUESTIONS[i];
      const selected = answers[i];
      const options = Array.isArray(q.payload?.options) ? q.payload.options : [];
      const correct = options.find((o) => (o.id || o.option_id) === selected)?.correct ?? false;

      await submitStudentAttempt({
        node_id: q.node_id,
        item_id: q.item_id,
        selected_option_id: selected,
        correct,
        hints_used: 0,
        latency_ms: 30000,
        is_exam: true,
      });
    }
  };

  const calculateScore = () => {
    let correctCount = 0;
    for (let i = 0; i < MOCK_QUESTIONS.length; i++) {
      const q = MOCK_QUESTIONS[i];
      const selected = answers[i];
      const options = Array.isArray(q.payload?.options) ? q.payload.options : [];
      if (options.find((o) => (o.id || o.option_id) === selected)?.correct) {
        correctCount++;
      }
    }
    return {
      correct: correctCount,
      total: MOCK_QUESTIONS.length,
      percentage: Math.round((correctCount / MOCK_QUESTIONS.length) * 100),
    };
  };

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-6" data-testid="mock-exams-page">
      {/* Header Banner */}
      <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Curriculum Mock Examinations</h1>
            <p className="text-xs text-slate-400">
              Authentic exam conditions for {frameworkId} · Exam attempts are isolated from mastery
            </p>
          </div>
        </div>

        {activeExam && !isCompleted && (
          <MockExamTimer
            totalSeconds={activeExam.durationMinutes * 60}
            onTimeUp={handleFinishExam}
          />
        )}
      </div>

      {/* STATE 1: EXAM SELECTION LIST */}
      {!activeExam && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-slate-200">Available Practice Papers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AVAILABLE_MOCKS.map((paper) => (
              <div
                key={paper.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 hover:border-indigo-500/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Standard Timing
                    </span>
                    <span className="flex items-center gap-1 text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      {paper.durationMinutes} min
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white leading-snug">{paper.title}</h3>
                  <p className="text-xs text-slate-400">
                    Topics: {paper.topicsCovered.join(", ")}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">{paper.totalQuestions} Questions</span>
                  <button
                    onClick={() => handleStartExam(paper)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/20 hover:scale-105"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Begin Mock Paper</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STATE 2: ACTIVE EXAM IN PROGRESS */}
      {activeExam && !isCompleted && (
        <div className="space-y-6">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <span className="font-semibold text-white">
              {activeExam.title} · Question {currentQIndex + 1} of {MOCK_QUESTIONS.length}
            </span>
            <span className="text-slate-400">
              Answered: {Object.keys(answers).length} / {MOCK_QUESTIONS.length}
            </span>
          </div>

          <ItemRenderer
            item={MOCK_QUESTIONS[currentQIndex]}
            onSelectOption={handleSelectOption}
          />

          <div className="flex items-center justify-between pt-4">
            <button
              type="button"
              disabled={currentQIndex === 0}
              onClick={() => setCurrentQIndex((i) => Math.max(0, i - 1))}
              className="px-4 py-2 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 disabled:opacity-40 text-xs font-semibold hover:text-white"
            >
              Previous
            </button>

            {currentQIndex < MOCK_QUESTIONS.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentQIndex((i) => i + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all"
              >
                <span>Next Question</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishExam}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 hover:scale-105"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit & Complete Paper</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STATE 3: POST-EXAM REPORT */}
      {isCompleted && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-2">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Mock Examination Complete!</h2>
            <p className="text-sm text-slate-400">
              Here is your diagnostic breakdown and predicted exam performance band.
            </p>
          </div>

          {/* Performance Band Indicator (Dignity Constraint: Predicted band only, NO ranks/percentiles!) */}
          <div className="p-6 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 text-center space-y-2">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
              Predicted Performance Band
            </span>
            <div className="text-2xl font-extrabold text-white">
              {calculateScore().percentage >= 75
                ? "Excellence Band (Distinction Ready)"
                : calculateScore().percentage >= 50
                ? "Proficient Band (Credit Ready)"
                : "Developing Band (Foundational Focus)"}
            </div>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Questions answered correctly: {calculateScore().correct} of {calculateScore().total} ({calculateScore().percentage}%).
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <button
              onClick={() => setActiveExam(null)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return to Mock Exams Menu</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
