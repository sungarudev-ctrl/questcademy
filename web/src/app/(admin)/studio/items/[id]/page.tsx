"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ItemRenderer } from "@/components/render/ItemRenderer";
import { DistractorTable } from "@/components/admin/DistractorTable";
import { HintAccordion } from "@/components/admin/HintAccordion";
import { QualityCheckPanel } from "@/components/admin/QualityCheckPanel";
import { AssessmentItem } from "@/types";
import { ArrowLeft, Check, X, AlertTriangle, ShieldAlert, Sparkles } from "lucide-react";

// Mock item fixture matching 18-item taxonomy
const SAMPLE_ITEM: AssessmentItem = {
  item_id: "item-frac-101",
  node_id: "MATH.FRAC.ADD_UNLIKE",
  type: "multiple_choice",
  difficulty_tier: 2,
  discrimination_band: "medium",
  status: "tagged",
  prompt: "What is \\(\\frac{1}{4} + \\frac{2}{5}\\)?",
  options: [
    { id: "opt-1", content: "\\frac{13}{20}", correct: true },
    {
      id: "opt-2",
      content: "\\frac{3}{9}",
      correct: false,
      misconception_id: "MATH.MISC.ADD_NUM_DENOM",
      learner_facing_name: "Adding numerators and denominators across",
    },
    {
      id: "opt-3",
      content: "\\frac{3}{20}",
      correct: false,
      misconception_id: "MATH.MISC.FORGOT_NUM_SCALE",
      learner_facing_name: "Adding numerators without finding common multiplier",
    },
    {
      id: "opt-4",
      content: "\\frac{7}{20}",
      correct: false,
      misconception_id: "MATH.MISC.WRONG_MULTIPLIER",
      learner_facing_name: "Multiplied numerator by wrong scale factor",
    },
  ],
  hints: [
    { level: 1, text: "Look at the two denominators, 4 and 5. Are they equal? If not, what is their LCM?" },
    { level: 2, text: "The least common multiple of 4 and 5 is 20. Convert 1/4 to 5/20 and 2/5 to 8/20." },
    { level: 3, text: "Now add the numerators: 5/20 + 8/20 = 13/20." },
  ],
  solution_steps: [
    "Identify denominators: 4 and 5.",
    "LCM(4, 5) = 20.",
    "1/4 = (1 * 5)/(4 * 5) = 5/20.",
    "2/5 = (2 * 4)/(5 * 4) = 8/20.",
    "5/20 + 8/20 = 13/20.",
  ],
  reading_level: 4.0,
  media_urls: [],
};

export default function ItemReviewDetailPage() {
  const router = useRouter();
  const params = useParams();
  const itemId = (params?.id as string) || "item-frac-101";

  const [item, setItem] = useState<AssessmentItem>(SAMPLE_ITEM);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Check if any distractor is untagged (governance rule §9.6)
  const untaggedDistractors = (item.options || [])
    .filter((o) => !o.correct)
    .filter((o) => !o.misconception_id || o.misconception_id === "untagged");

  const hasUntagged = untaggedDistractors.length > 0;

  const handleUpdateDistractor = (index: number, misconceptionId: string) => {
    const newOptions = [...(item.options || [])];
    newOptions[index] = {
      ...newOptions[index],
      misconception_id: misconceptionId,
      learner_facing_name: misconceptionId === "untagged" ? undefined : `Misconception ${misconceptionId}`,
    };
    setItem({ ...item, options: newOptions });
  };

  const handleApprove = async () => {
    if (hasUntagged) return;
    setIsSubmitting(true);
    try {
      setStatusMessage("Item approved! Status moved to 'reviewed'.");
      setTimeout(() => router.push("/studio/items"), 1500);
    } catch {
      setStatusMessage("Approval failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setIsSubmitting(true);
    try {
      setStatusMessage("Item rejected. Feedback appended to generation parameters.");
      setShowRejectModal(false);
      setTimeout(() => router.push("/studio/items"), 1500);
    } catch {
      setStatusMessage("Rejection failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/studio/items")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Item Review: {itemId}
            </h1>
            <p className="text-xs text-slate-400">
              Type: {item.type} · Tier: {item.difficulty_tier} · Node: {item.node_id} · Status: {item.status}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-lg bg-red-950/40 border border-red-800/60 hover:bg-red-900/50 text-red-300 text-sm font-medium transition-colors flex items-center gap-2"
          >
            <X className="w-4 h-4" /> Reject with Reason
          </button>

          <div className="relative group">
            <button
              onClick={handleApprove}
              disabled={hasUntagged || isSubmitting}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg ${
                hasUntagged
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/30"
              }`}
            >
              <Check className="w-4 h-4" /> Approve Item
            </button>
            {hasUntagged && (
              <div className="absolute right-0 top-full mt-2 w-64 p-2.5 rounded-xl bg-slate-900 border border-amber-500/50 text-amber-200 text-xs shadow-xl hidden group-hover:block z-20">
                <div className="flex items-start gap-1.5 font-semibold mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" /> Approval Prohibited
                </div>
                All distractors must have a valid misconception tag assigned before approval is granted.
              </div>
            )}
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-200 text-sm">
          {statusMessage}
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left 3 cols: Canonical Item Renderer, Distractor Table, Hints, Solution */}
        <div className="lg:col-span-3 space-y-6">
          {/* Canonical Item Preview */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Canonical Item Renderer (Student View)
              </span>
              <span className="text-xs text-slate-400">Production Component</span>
            </div>
            <ItemRenderer item={item} />
          </div>

          {/* Distractor Misconception Table */}
          <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-white">Distractor Tagging & Misconception Audit</h3>
                <p className="text-xs text-slate-400">
                  Every incorrect choice must map to a specific learner misconception catalog ID.
                </p>
              </div>
              {hasUntagged && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Untagged Distractors Found
                </span>
              )}
            </div>
            <DistractorTable
              options={item.options || []}
              onUpdateOptionMisconception={handleUpdateDistractor}
            />
          </div>

          {/* Hint Accordion & Solution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-md space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                Three-Tier Progressive Hints
              </h3>
              <HintAccordion hints={item.hints || []} />
            </div>

            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-md space-y-4">
              <h3 className="text-sm font-semibold text-white border-b border-slate-800 pb-3">
                Full Worked Solution
              </h3>
              <ol className="space-y-2 text-sm text-slate-300 list-decimal list-inside leading-relaxed">
                {(item.solution_steps || []).map((step, idx) => (
                  <li key={idx} className="p-2 rounded bg-slate-950/60 border border-slate-800/80">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Right 1 col: Quality Check Panel */}
        <div className="lg:col-span-1 space-y-4">
          <QualityCheckPanel
            readingLevel={item.reading_level || 4.0}
            readingLevelTarget="Grade 4–5"
            mathInvariancePass={true}
            katexValid={true}
            workedExamplesCount={3}
            dedupSimilarity={0.08}
          />
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-700 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Reject Item with Feedback</h3>
            </div>
            <p className="text-sm text-slate-400">
              State the reason for rejecting this item. The feedback is captured in the audit log and included in the regeneration parameters.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Distractor option B shares the exact same numerical result as the correct answer. Please generate distinct options."
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
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
