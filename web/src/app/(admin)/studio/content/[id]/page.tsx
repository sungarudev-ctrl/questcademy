"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BlockRenderer } from "@/components/render/BlockRenderer";
import { QualityCheckPanel } from "@/components/admin/QualityCheckPanel";
import { ContentBlock } from "@/types";
import { ArrowLeft, Check, X, Code, Eye, RefreshCw, AlertTriangle } from "lucide-react";

// Mock content fixture matching schema
const SAMPLE_BLOCKS: ContentBlock[] = [
  {
    block_id: "blk-1",
    type: "heading",
    payload: { level: 1, text: "Adding Fractions with Unlike Denominators" },
  },
  {
    block_id: "blk-2",
    type: "text",
    payload: {
      text: "To add fractions with different denominators, first find the least common multiple (LCM) of the denominators to create equivalent fractions.",
    },
  },
  {
    block_id: "blk-3",
    type: "math",
    payload: { latex: "\\frac{1}{2} + \\frac{1}{3} = \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}" },
  },
  {
    block_id: "blk-4",
    type: "worked_example",
    payload: {
      problem: "Find the sum of 1/4 and 2/5.",
      steps: [
        "Step 1: The denominators are 4 and 5. The LCM of 4 and 5 is 20.",
        "Step 2: Convert 1/4 to twenty-fifths: 1/4 = 5/20.",
        "Step 3: Convert 2/5 to twentieths: 2/5 = 8/20.",
        "Step 4: Add numerators: 5/20 + 8/20 = 13/20.",
      ],
      final_answer: "13/20",
    },
  },
];

const LOCALIZED_OVERRIDE_BLOCKS: ContentBlock[] = [
  {
    block_id: "blk-loc-1",
    type: "heading",
    payload: { level: 1, text: "Adding Fractions with Unlike Denominators (Ghana BECE Edition)" },
  },
  {
    block_id: "blk-loc-2",
    type: "text",
    payload: {
      text: "Kofi has 1/2 basket of cocoa beans and Ama brings 1/3 basket. To find the total harvest, find the common denominator of 2 and 3.",
    },
  },
  {
    block_id: "blk-loc-3",
    type: "math",
    payload: { latex: "\\frac{1}{2} + \\frac{1}{3} = \\frac{3}{6} + \\frac{2}{6} = \\frac{5}{6}" },
  },
];

export default function ContentReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contentId = (params?.id as string) || "content-1";

  const [activeTab, setActiveTab] = useState<"render" | "json">("render");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      // Direct call to admin API or mock success
      setActionStatus("Approved successfully! Status moved to published.");
      setTimeout(() => router.push("/studio/content"), 1500);
    } catch {
      setActionStatus("Approval failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      setActionStatus("Content rejected with feedback. Regeneration queued.");
      setShowRejectModal(false);
      setTimeout(() => router.push("/studio/content"), 1500);
    } catch {
      setActionStatus("Rejection failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/studio/content")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Content Review: {contentId}
            </h1>
            <p className="text-xs text-slate-400">Node: MATH.FRAC.ADD_UNLIKE · Version: 1 · Status: Draft</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
            <button
              onClick={() => setActiveTab("render")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "render"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Rendered
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "json"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Raw Blocks
            </button>
          </div>

          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-red-950/40 border border-red-800/60 hover:bg-red-900/50 text-red-300 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Reject with Reason
          </button>

          <button
            onClick={handleApprove}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/30"
          >
            <Check className="w-4 h-4" /> Approve Content
          </button>
        </div>
      </div>

      {actionStatus && (
        <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /> {actionStatus}
        </div>
      )}

      {/* Grid: Quality Check Panel + Side-by-Side Review */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Content & Side-by-Side comparison */}
        <div className="lg:col-span-3 space-y-6">
          {activeTab === "render" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Base Canonical Content */}
              <div className="rounded-xl bg-slate-900/70 border border-slate-800 p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Canonical Base Content
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                    Global Universal
                  </span>
                </div>
                <BlockRenderer blocks={SAMPLE_BLOCKS} />
              </div>

              {/* Localized Overrides (when applicable) */}
              <div className="rounded-xl bg-slate-900/70 border border-indigo-500/30 p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Localized Framework Overrides (Ghana GH-BECE-2024)
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300">
                    Independent Approval
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Approval of the base content does NOT approve this localized override. Overrides must be vetted for cultural relevance and mathematical invariance separately.
                </p>
                <BlockRenderer blocks={LOCALIZED_OVERRIDE_BLOCKS} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-[600px]">
              <pre>{JSON.stringify(SAMPLE_BLOCKS, null, 2)}</pre>
            </div>
          )}
        </div>

        {/* Right 1 col: Quality Check Panel */}
        <div className="lg:col-span-1 space-y-4">
          <QualityCheckPanel
            readingLevel={4.2}
            readingLevelTarget="Grade 4–5"
            mathInvariancePass={true}
            katexValid={true}
            workedExamplesCount={3}
            dedupSimilarity={0.12}
          />
        </div>
      </div>

      {/* Mandatory Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-700 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Reject Content with Reason</h3>
            </div>
            <p className="text-sm text-slate-400">
              A mandatory rejection reason is required. This feedback will be appended directly into the next AI generation prompt context block to guide correction.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. The third worked example uses LCM 24 instead of the lowest common multiple 12. Please correct."
              rows={4}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || isSubmitting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium"
              >
                Confirm Rejection & Re-queue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
