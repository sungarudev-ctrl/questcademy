"use client";

import React, { useState } from "react";
import { LocalizationDiff } from "@/components/admin/LocalizationDiff";
import { ArrowLeft, Check, X, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";

interface PendingLocalization {
  id: string;
  kind: "item" | "content";
  targetId: string;
  frameworkId: string;
  currency: string;
  baseStem: string;
  localizedStem: string;
  basePayload?: Record<string, unknown>;
  localizedPayload?: Record<string, unknown>;
  mathInvariant: boolean;
  mathViolationReason?: string;
  status: "pending" | "approved" | "rejected";
}

const SAMPLE_LOCALIZATIONS: PendingLocalization[] = [
  {
    id: "loc-001",
    kind: "item",
    targetId: "item-frac-101",
    frameworkId: "GH-BECE-2024",
    currency: "GHS",
    baseStem: "Alice has $1/4 and Bob gives her $2/5. How much money does Alice have in total?",
    localizedStem: "Ama has GH₵ 1/4 and Kofi gives her GH₵ 2/5. How much money does Ama have in total?",
    mathInvariant: true,
    status: "pending",
  },
  {
    id: "loc-002",
    kind: "item",
    targetId: "item-dec-201",
    frameworkId: "GH-BECE-2024",
    currency: "GHS",
    baseStem: "A train travels 45 km in 0.75 hours. What is its speed in km/h?",
    localizedStem: "A trotro travels 50 km in 0.75 hours. What is its speed in km/h?",
    mathInvariant: false,
    mathViolationReason: "SymPy invariant check failed: base answer is 60 km/h, localized answer was altered to 66.67 km/h. Numeric parameters must remain strictly invariant during cultural adaptation.",
    status: "pending",
  },
  {
    id: "loc-003",
    kind: "content",
    targetId: "content-1",
    frameworkId: "GH-BECE-2024",
    currency: "GHS",
    baseStem: "Introduction to Fractions: Comparing apple slices and pizza slices.",
    localizedStem: "Introduction to Fractions: Comparing orange wedges and cassava cake portions.",
    mathInvariant: true,
    status: "pending",
  },
];

export default function LocalizationReviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<PendingLocalization[]>(SAMPLE_LOCALIZATIONS);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [notification, setNotification] = useState<string | null>(null);

  const handleApprove = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.mathInvariant) return;

    setItems((prev) => prev.filter((i) => i.id !== id));
    setNotification(`Approved localization override '${id}'. Status updated to approved.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReject = (id: string) => {
    if (!rejectReason.trim()) return;

    setItems((prev) => prev.filter((i) => i.id !== id));
    setNotification(`Rejected localization override '${id}' with reason: "${rejectReason}".`);
    setRejectingId(null);
    setRejectReason("");
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/studio")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Localization Review Queue</h1>
            <p className="text-xs text-slate-400">
              Audit country-specific cultural overrides. SymPy verified mathematical invariance is strictly enforced.
            </p>
          </div>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
          Pending Overrides: <span className="text-white font-bold">{items.length}</span>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> {notification}
        </div>
      )}

      {/* Governance Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Mathematical Invariance Policy (§9.8):</span>
          <p className="mt-0.5">
            Currency names, character names, and cultural nouns may be adapted per country framework. However, all numbers, fractions, geometry dimensions, and final numerical solutions MUST remain strictly invariant. Any override failing the SymPy check cannot be approved.
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-6">
        {items.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
            <p className="text-slate-400 text-sm">All pending localization overrides have been reviewed.</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-semibold">
                    {item.targetId}
                  </span>
                  <span className="text-xs text-slate-400">
                    Framework: <strong className="text-slate-200">{item.frameworkId}</strong> ({item.currency})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setRejectingId(item.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800/60 hover:bg-red-900/50 text-red-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Reject Override
                  </button>

                  <div className="relative group">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={!item.mathInvariant}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                        item.mathInvariant
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" /> Approve Override
                    </button>
                    {!item.mathInvariant && (
                      <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-slate-900 border border-rose-500/50 text-rose-200 text-xs shadow-xl hidden group-hover:block z-20">
                        <div className="font-semibold mb-1 flex items-center gap-1 text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" /> Approval Blocked
                        </div>
                        {item.mathViolationReason || "SymPy detected altered numerical values."}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Side-by-side diff */}
              <LocalizationDiff
                baseStem={item.baseStem}
                localizedStem={item.localizedStem}
                basePayload={item.basePayload}
                localizedPayload={item.localizedPayload}
                mathInvariant={item.mathInvariant}
                currency={item.currency}
              />

              {!item.mathInvariant && item.mathViolationReason && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Invariance Gate Violation: </span>
                    {item.mathViolationReason}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-700 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-lg font-bold text-white">Reject Localization Override</h3>
            </div>
            <p className="text-sm text-slate-400">
              Provide feedback on why this localized overlay is being rejected.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Trotro distance was modified from 45km to 50km, altering speed calculation. Re-generate with invariant numbers."
              rows={4}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(rejectingId)}
                disabled={!rejectReason.trim()}
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
