"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Clock,
  Layers,
  Bot,
} from "lucide-react";
import { useNodeStateStore } from "@/lib/stores/useNodeStateStore";
import { useSessionStore } from "@/lib/stores/useSessionStore";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { submitStudentAttempt } from "@/lib/api/studentClient";
import { ItemRenderer } from "@/components/render/ItemRenderer";
import { PracticeFeedbackBanner } from "@/components/student/PracticeFeedbackBanner";
import { AskAiSidePanel } from "@/components/student/AskAiSidePanel";
import { ReadAloudButton } from "@/components/student/ReadAloudButton";
import type { AssessmentItem } from "@/types";

interface PracticeItemPool {
  [nodeId: string]: AssessmentItem[];
}

const SAMPLE_NODE_ITEMS: PracticeItemPool = {
  "MATH.FRAC.ADD_UNLIKE": [
    {
      item_id: "ITEM-ADD-01",
      node_id: "MATH.FRAC.ADD_UNLIKE",
      stem: "Calculate $\\frac{1}{4} + \\frac{1}{6}$ and simplify your answer.",
      type: "mcq_single",
      difficulty_tier: 2,
      difficulty_elo: 1210,
      authoring_status: "published",
      review_status: "approved",
      hints: [
        { level: 1, tier: 1, content: "Look at the denominators 4 and 6. What common multiple can you convert them both to?" },
        { level: 2, tier: 2, content: "The lowest common multiple of 4 and 6 is 12. Find the equivalent fractions with denominator 12." },
        { level: 3, tier: 3, content: "Rewrite as $\\frac{3}{12} + \\frac{2}{12}$. Now add the numerators together." },
      ],
      payload: {
        options: [
          {
            id: "OPT-A",
            option_id: "OPT-A",
            content: "$\\frac{5}{12}$",
            correct: true,
            is_correct: true,
          },
          {
            id: "OPT-B",
            option_id: "OPT-B",
            content: "$\\frac{2}{10}$",
            correct: false,
            is_correct: false,
            misconception_id: "MISC.FRAC.ADD_DENOM",
            learner_facing_name: "Adding denominators directly",
            misconception: {
              misconception_id: "MISC.FRAC.ADD_DENOM",
              learner_facing_name: "Adding denominators directly",
              explanation: "You added both the top and bottom numbers directly ($1+1=2$ and $4+6=10$). Denominators specify partition sizes and cannot be added together directly!",
            },
          },
          {
            id: "OPT-C",
            option_id: "OPT-C",
            content: "$\\frac{5}{24}$",
            correct: false,
            is_correct: false,
            misconception_id: "MISC.FRAC.MULT_DENOM_ERR",
            learner_facing_name: "Multiplied denominators without scaling numerators",
            misconception: {
              misconception_id: "MISC.FRAC.MULT_DENOM_ERR",
              learner_facing_name: "Multiplied denominators without scaling numerators",
              explanation: "The denominators were multiplied to 24 without correctly scaling the numerators.",
            },
          },
          {
            id: "OPT-D",
            option_id: "OPT-D",
            content: "$\\frac{7}{12}$",
            correct: false,
            is_correct: false,
          },
        ],
      },
    },
    {
      item_id: "ITEM-ADD-02",
      node_id: "MATH.FRAC.ADD_UNLIKE",
      stem: "Evaluate $\\frac{2}{5} + \\frac{3}{10}$ in simplest form.",
      type: "mcq_single",
      difficulty_tier: 2,
      difficulty_elo: 1230,
      authoring_status: "published",
      review_status: "approved",
      hints: [
        { level: 1, tier: 1, content: "Notice that 10 is a multiple of 5. You only need to change one fraction!" },
        { level: 2, tier: 2, content: "Multiply both numerator and denominator of $\\frac{2}{5}$ by 2." },
        { level: 3, tier: 3, content: "You get $\\frac{4}{10} + \\frac{3}{10}$. Combine them over 10." },
      ],
      payload: {
        options: [
          { id: "OPT-A", option_id: "OPT-A", content: "$\\frac{7}{10}$", correct: true, is_correct: true },
          {
            id: "OPT-B",
            option_id: "OPT-B",
            content: "$\\frac{5}{15}$",
            correct: false,
            is_correct: false,
            misconception_id: "MISC.FRAC.ADD_DENOM",
            learner_facing_name: "Adding denominators directly",
            misconception: {
              misconception_id: "MISC.FRAC.ADD_DENOM",
              learner_facing_name: "Adding denominators directly",
              explanation: "Denominators were added directly ($5+10=15$). Find a common denominator instead.",
            },
          },
          { id: "OPT-C", option_id: "OPT-C", content: "$\\frac{6}{10}$", correct: false, is_correct: false },
          { id: "OPT-D", option_id: "OPT-D", content: "$\\frac{1}{2}$", correct: false, is_correct: false },
        ],
      },
    },
    {
      item_id: "ITEM-ADD-03",
      node_id: "MATH.FRAC.ADD_UNLIKE",
      stem: "A recipe calls for $\\frac{1}{3}$ cup of olive oil and $\\frac{1}{2}$ cup of coconut oil. What is the total volume of oil?",
      type: "mcq_single",
      difficulty_tier: 3,
      difficulty_elo: 1280,
      authoring_status: "published",
      review_status: "approved",
      hints: [
        { level: 1, tier: 1, content: "This is a word problem asking for the sum of $\\frac{1}{3} + \\frac{1}{2}$." },
        { level: 2, tier: 2, content: "Find the least common multiple of 3 and 2, which is 6." },
        { level: 3, tier: 3, content: "Convert to $\\frac{2}{6} + \\frac{3}{6}$ and add the numerators." },
      ],
      payload: {
        options: [
          { id: "OPT-A", option_id: "OPT-A", content: "$\\frac{5}{6}$ cup", correct: true, is_correct: true },
          {
            id: "OPT-B",
            option_id: "OPT-B",
            content: "$\\frac{2}{5}$ cup",
            correct: false,
            is_correct: false,
            misconception_id: "MISC.FRAC.ADD_DENOM",
            learner_facing_name: "Adding denominators directly",
            misconception: {
              misconception_id: "MISC.FRAC.ADD_DENOM",
              learner_facing_name: "Adding denominators directly",
              explanation: "Added top and bottom ($1+1=2$ and $3+2=5$). Always find a common denominator first.",
            },
          },
          { id: "OPT-C", option_id: "OPT-C", content: "$\\frac{1}{6}$ cup", correct: false, is_correct: false },
          { id: "OPT-D", option_id: "OPT-D", content: "$\\frac{4}{6}$ cup", correct: false, is_correct: false },
        ],
      },
    },
  ],
  // Interleaved review item from a mastered node
  "MATH.FRAC.EQUIV": [
    {
      item_id: "INTERLEAVE-EQUIV-01",
      node_id: "MATH.FRAC.EQUIV",
      stem: "Spaced Review: Which fraction is in simplest form?",
      type: "mcq_single",
      difficulty_tier: 2,
      difficulty_elo: 1150,
      authoring_status: "published",
      review_status: "approved",
      hints: [
        { level: 1, tier: 1, content: "A fraction is in simplest form when numerator and denominator have no common factor besides 1." },
        { level: 2, tier: 2, content: "Test each choice to see if both numbers can be divided by 2, 3, or 5." },
        { level: 3, tier: 3, content: "Check $\\frac{7}{9}$: 7 is prime and does not divide 9." },
      ],
      payload: {
        options: [
          { id: "OPT-A", option_id: "OPT-A", content: "$\\frac{7}{9}$", correct: true, is_correct: true },
          { id: "OPT-B", option_id: "OPT-B", content: "$\\frac{6}{8}$", correct: false, is_correct: false },
          { id: "OPT-C", option_id: "OPT-C", content: "$\\frac{9}{12}$", correct: false, is_correct: false },
          { id: "OPT-D", option_id: "OPT-D", content: "$\\frac{4}{10}$", correct: false, is_correct: false },
        ],
      },
    },
  ],
};

export default function PracticeTurnPage() {
  const params = useParams();
  const router = useRouter();
  const rawNodeId = typeof params.node_id === "string" ? decodeURIComponent(params.node_id) : "MATH.FRAC.ADD_UNLIKE";

  const { getNode, recordAttempt, evaluateMastery } = useNodeStateStore();
  const { turnIndex, nextTurn, startSession } = useSessionStore();
  const { addMinutes } = useLearnerStore();

  const node = getNode(rawNodeId) || {
    node_id: rawNodeId,
    learner_title: "Adding Unlike Fractions",
    topic: "Fractions & Decimals",
    status: "in_progress",
    prerequisites: [],
    est_minutes: 14,
    recent_window: [],
    max_tier_correct: 0,
    stability: 3.0,
    difficulty_fsrs: 5.0,
    due_at: null,
  };

  const [itemIndex, setItemIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [currentHintTier, setCurrentHintTier] = useState(0);
  const [turnStartTime, setTurnStartTime] = useState(Date.now());
  const [isAiOpen, setIsAiOpen] = useState(false);

  // Initialize practice session
  useEffect(() => {
    startSession(rawNodeId, "practice");
    setTurnStartTime(Date.now());
  }, [rawNodeId, startSession]);

  // Interleaving: Every 4th turn (turnIndex % 4 === 3) is a review item
  const isInterleavedTurn = turnIndex > 0 && turnIndex % 4 === 3;

  const currentItemPool = useMemo(() => {
    if (isInterleavedTurn) {
      return SAMPLE_NODE_ITEMS["MATH.FRAC.EQUIV"] || SAMPLE_NODE_ITEMS["MATH.FRAC.ADD_UNLIKE"];
    }
    return SAMPLE_NODE_ITEMS[rawNodeId] || SAMPLE_NODE_ITEMS["MATH.FRAC.ADD_UNLIKE"];
  }, [rawNodeId, isInterleavedTurn]);

  const currentItem = currentItemPool[itemIndex % currentItemPool.length];

  // Options and hints
  const itemOptions = Array.isArray(currentItem.payload?.options) ? currentItem.payload.options : [];
  const selectedOption = itemOptions.find((o) => (o.id || o.option_id) === selectedOptionId);

  const misconception = selectedOption?.misconception;

  const currentHint = useMemo(() => {
    if (currentHintTier <= 0 || !currentItem.hints) return null;
    const match = currentItem.hints.find((h) => (h.tier ?? h.level) === currentHintTier);
    return match ? (match.content || match.text || null) : null;
  }, [currentHintTier, currentItem]);

  const handleOptionSelect = (optId: string) => {
    if (hasSubmitted) return;
    setSelectedOptionId(optId);
  };

  const handleRequestHint = () => {
    if (currentHintTier < 3) {
      setCurrentHintTier((prev) => prev + 1);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!selectedOptionId || hasSubmitted) return;

    const correct = Boolean(selectedOption?.correct ?? selectedOption?.is_correct);
    const latencyMs = Math.max(500, Date.now() - turnStartTime);

    setIsCorrect(correct);
    setHasSubmitted(true);

    // Update Zustand node state
    recordAttempt(currentItem.node_id, {
      correct,
      hints_used: currentHintTier,
      tier: currentItem.difficulty_tier,
    });

    // Add learning time to weekly tracker (~1.5 min per turn)
    addMinutes(1.5);

    // Submit attempt to server with offline interception fallback
    await submitStudentAttempt({
      node_id: currentItem.node_id,
      item_id: currentItem.item_id,
      selected_option_id: selectedOptionId,
      correct,
      hints_used: currentHintTier,
      latency_ms: latencyMs,
    });
  };

  const handleNextTurn = () => {
    nextTurn();
    setHasSubmitted(false);
    setSelectedOptionId(null);
    setIsCorrect(false);
    setCurrentHintTier(0);
    setTurnStartTime(Date.now());
    setItemIndex((prev) => prev + 1);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-6" data-testid="practice-session">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href={`/learn/node/${encodeURIComponent(node.node_id)}`}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Concept</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <ReadAloudButton
            text={typeof currentItem.stem === "string" ? currentItem.stem : "Practice question"}
          />
          <button
            onClick={() => setIsAiOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-semibold transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Tutor</span>
          </button>
        </div>
      </div>

      {/* Turn Meta Pill */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          {isInterleavedTurn ? (
            <span className="px-2 py-0.5 rounded-md font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Interleaved Review
            </span>
          ) : (
            <span className="font-semibold text-white">{node.learner_title}</span>
          )}
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">Turn {turnIndex + 1}</span>
        </div>

        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]">
          Tier {currentItem.difficulty_tier}
        </span>
      </div>

      {/* Canonical ItemRenderer */}
      <ItemRenderer
        item={currentItem}
        showSolution={hasSubmitted}
        showMisconceptions={hasSubmitted}
        onSelectOption={handleOptionSelect}
      />

      {/* Action Bar / Submit Button */}
      {!hasSubmitted ? (
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {currentHintTier < 3 && (
              <button
                type="button"
                onClick={handleRequestHint}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  {currentHintTier === 0 ? "Need a Hint?" : `Hint (${currentHintTier}/3)`}
                </span>
              </button>
            )}
            {currentHint && (
              <span className="text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-500/20 px-3 py-1.5 rounded-lg max-w-sm">
                {currentHint}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmitAnswer}
            disabled={!selectedOptionId}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Check Answer</span>
            <Sparkles className="w-4 h-4" />
          </button>
        </div>
      ) : (
        /* Practice Feedback Banner with Misconception Details & Progressive Hints */
        <PracticeFeedbackBanner
          isCorrect={isCorrect}
          misconceptionTitle={misconception?.learner_facing_name}
          misconceptionExplanation={misconception?.explanation}
          currentHintTier={currentHintTier}
          hintText={currentHint}
          onRequestHint={handleRequestHint}
          onNext={handleNextTurn}
          hintsExhausted={currentHintTier >= 3}
        />
      )}

      {/* Ask AI Side Panel */}
      <AskAiSidePanel
        nodeId={currentItem.node_id}
        nodeTitle={node.learner_title}
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />
    </div>
  );
}
