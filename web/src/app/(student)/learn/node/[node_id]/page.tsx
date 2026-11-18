"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Bot,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import { useNodeStateStore } from "@/lib/stores/useNodeStateStore";
import { BlockRenderer } from "@/components/render/BlockRenderer";
import { AskAiSidePanel } from "@/components/student/AskAiSidePanel";
import { ReadAloudButton } from "@/components/student/ReadAloudButton";
import type { ContentBlock } from "@/types";

export default function NodeReaderPage() {
  const params = useParams();
  const router = useRouter();
  const nodeId = typeof params.node_id === "string" ? decodeURIComponent(params.node_id) : "MATH.FRAC.ADD_UNLIKE";

  const { getNode } = useNodeStateStore();
  const node = getNode(nodeId) || {
    node_id: nodeId,
    learner_title: "Adding Unlike Fractions",
    topic: "Fractions & Decimals",
    status: "in_progress",
    prerequisites: ["MATH.FRAC.COMPARE"],
    est_minutes: 14,
    recent_window: [],
    max_tier_correct: 0,
    stability: 3.0,
    difficulty_fsrs: 5.0,
    due_at: null,
  };

  const [isAiOpen, setIsAiOpen] = useState(false);
  const [workedExampleStep, setWorkedExampleStep] = useState(1);

  // Curated educational content blocks with KaTeX math and worked example steps
  const contentBlocks: ContentBlock[] = [
    {
      block_id: "blk-intro",
      node_id: nodeId,
      type: "paragraph",
      ordinal: 1,
      payload: {
        text: "When adding fractions with different denominators, we cannot simply add the numerators. The parts are different sizes! To add them, we first find a common denominator so that every part is measured with the same unit.",
      },
    },
    {
      block_id: "blk-math-example",
      node_id: nodeId,
      type: "math",
      ordinal: 2,
      payload: {
        latex: "\\frac{1}{4} + \\frac{2}{3} = \\; ?",
      },
    },
    {
      block_id: "blk-callout",
      node_id: nodeId,
      type: "callout",
      ordinal: 3,
      payload: {
        title: "Key Principle",
        text: "Always look for the Least Common Multiple (LCM) of the denominators to keep your numbers simple.",
      },
    },
    {
      block_id: "blk-step-1",
      node_id: nodeId,
      type: "paragraph",
      ordinal: 4,
      payload: {
        text: "Step 1: Find the common denominator for 4 and 3. Multiples of 4: 4, 8, 12, 16. Multiples of 3: 3, 6, 9, 12. The lowest common multiple is 12.",
      },
    },
  ];

  const fullTextToRead = contentBlocks
    .map((b) => String(b.payload?.text || b.payload?.latex || ""))
    .join(" ");

  return (
    <div className="max-w-4xl mx-auto py-4 space-y-8" data-testid="node-reader">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Learning Path</span>
        </Link>

        <div className="flex items-center gap-2">
          <ReadAloudButton text={fullTextToRead} />
          <button
            onClick={() => setIsAiOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-semibold transition-all hover:scale-105"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ask AI Tutor</span>
          </button>
        </div>
      </div>

      {/* Hero Title Card */}
      <div className="space-y-3 border-b border-slate-800 pb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
          <span>{node.topic}</span>
          <span>·</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3" /> ~{node.est_minutes} min read
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {node.learner_title}
        </h1>
      </div>

      {/* Main Canonical Content via Shared BlockRenderer */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-10 shadow-2xl space-y-6">
        <BlockRenderer blocks={contentBlocks} />

        {/* Interactive Worked Example with Progressive Step Reveal */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/20 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Worked Example: Step-by-Step</span>
            </h3>
            <span className="text-xs text-indigo-300">Step {workedExampleStep} of 3</span>
          </div>

          <div className="space-y-3 text-sm">
            {workedExampleStep >= 1 && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 space-y-1 animate-in fade-in-50">
                <span className="font-semibold text-indigo-300 block text-xs">Step 1: Convert to equivalent fractions</span>
                <p>Multiply $\frac{1}{4} \times \frac{3}{3} = \frac{3}{12}$ and $\frac{2}{3} \times \frac{4}{4} = \frac{8}{12}$.</p>
              </div>
            )}

            {workedExampleStep >= 2 && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 space-y-1 animate-in fade-in-50">
                <span className="font-semibold text-indigo-300 block text-xs">Step 2: Add the numerators</span>
                <p>Now that denominators match: $\frac{3 + 8}{12} = \frac{11}{12}$.</p>
              </div>
            )}

            {workedExampleStep >= 3 && (
              <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200 space-y-1 animate-in fade-in-50">
                <span className="font-semibold text-emerald-400 block text-xs">Step 3: Check lowest terms</span>
                <p>Since 11 is a prime number and not a factor of 12, $\frac{11}{12}$ is in its simplest form.</p>
              </div>
            )}
          </div>

          {workedExampleStep < 3 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setWorkedExampleStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-all"
              >
                <span>Reveal Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Sticky Practice CTA */}
      <div className="sticky bottom-6 z-30 flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl backdrop-blur-lg">
        <div>
          <h4 className="font-semibold text-white text-sm">Ready to practice this skill?</h4>
          <p className="text-xs text-slate-400">Adaptive questions with instant feedback and progressive hints.</p>
        </div>
        <Link
          href={`/practice/${encodeURIComponent(node.node_id)}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 transition-all hover:scale-105 active:scale-95"
        >
          <Sparkles className="w-4 h-4" />
          <span>Start Practice</span>
        </Link>
      </div>

      {/* Socratic AI Tutor Drawer */}
      <AskAiSidePanel
        nodeId={node.node_id}
        nodeTitle={node.learner_title}
        isOpen={isAiOpen}
        onClose={() => setIsAiOpen(false)}
      />
    </div>
  );
}
