"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck, X } from "lucide-react";

export interface ActivateFrameworkModalProps {
  frameworkId: string;
  coveragePct: number;
  blockers: string[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmActivate: (frameworkId: string) => Promise<void>;
}

export function ActivateFrameworkModal({
  frameworkId,
  coveragePct,
  blockers = [],
  isOpen,
  onClose,
  onConfirmActivate,
}: ActivateFrameworkModalProps): React.ReactElement | null {
  const [typedId, setTypedId] = useState("");
  const [acceptedImplications, setAcceptedImplications] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isCoverageMet = coveragePct >= 80;
  const hasNoBlockers = blockers.length === 0;
  const isEligible = isCoverageMet && hasNoBlockers;
  const isConfirmationTyped = typedId.trim() === frameworkId;
  const canSubmit = isEligible && isConfirmationTyped && acceptedImplications && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirmActivate(frameworkId);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Activation failed. Server rejected request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      data-testid="activate-framework-modal"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden space-y-5 p-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className={`w-6 h-6 ${isEligible ? "text-emerald-400" : "text-amber-400"}`} />
            <h3 className="text-lg font-bold text-white tracking-tight">Activate Curriculum Framework</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gate Requirements Status */}
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">80% Coverage Gate</span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                isCoverageMet ? "text-emerald-400" : "text-rose-400 font-mono"
              }`}
            >
              {isCoverageMet ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {coveragePct.toFixed(1)}% {isCoverageMet ? "(Passed)" : "(Blocked < 80%)"}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
            <span className="text-slate-300 font-medium">Rollout Blockers</span>
            <span
              className={`font-semibold flex items-center gap-1.5 ${
                hasNoBlockers ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {hasNoBlockers ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {blockers.length === 0 ? "Zero Blockers (Passed)" : `${blockers.length} Active Blocker(s)`}
            </span>
          </div>

          {!isEligible && (
            <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Framework activation is hard-gated by governance rules. You must resolve all blockers and reach ≥80% coverage before activation is permitted.
              </div>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
            {errorMsg}
          </div>
        )}

        {/* Confirmation Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-2 border-t border-slate-800">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Type framework ID <span className="font-mono text-indigo-400">{frameworkId}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedId}
              onChange={(e) => setTypedId(e.target.value)}
              placeholder={frameworkId}
              disabled={!isEligible}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono disabled:opacity-50"
            />
          </div>

          <label className="flex items-start gap-2.5 text-xs text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={acceptedImplications}
              onChange={(e) => setAcceptedImplications(e.target.checked)}
              disabled={!isEligible}
              className="mt-0.5 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="leading-snug">
              I accept that activating this framework exposes its published learning path and assessment items to active students in this market.
            </span>
          </label>

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
            >
              <ShieldCheck className="w-4 h-4" />
              {submitting ? "Activating..." : "Confirm Activation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
