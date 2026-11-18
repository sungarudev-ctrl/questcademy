"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export interface LocalizationDiffProps {
  baseStem: string;
  localizedStem?: string | null;
  basePayload?: Record<string, unknown>;
  localizedPayload?: Record<string, unknown> | null;
  mathInvariant?: boolean;
  currency?: string;
  className?: string;
}

export function LocalizationDiff({
  baseStem,
  localizedStem,
  basePayload,
  localizedPayload,
  mathInvariant = true,
  currency = "GHS",
  className = "",
}: LocalizationDiffProps): React.ReactElement {
  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl space-y-4 p-5 ${className}`}
      data-testid="localization-diff"
    >
      {/* Header with SymPy Math Invariance Banner */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            Localization Overlay Diff
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
            Target: {currency}
          </span>
        </div>

        <div
          className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            mathInvariant
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {mathInvariant ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>SymPy Verified Invariant</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>Math Deviation Detected (Blocked)</span>
            </>
          )}
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* Base Canonical Column */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 pb-1.5">
            Canonical Base Content
          </div>
          <div className="text-slate-200 leading-relaxed text-sm font-medium">{baseStem}</div>
          {basePayload && (
            <pre className="mt-2 p-2.5 rounded bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-slate-400 overflow-x-auto">
              {JSON.stringify(basePayload, null, 2)}
            </pre>
          )}
        </div>

        {/* Localized Overlay Column */}
        <div
          className={`rounded-xl border p-4 space-y-2 ${
            mathInvariant
              ? "border-indigo-500/30 bg-indigo-950/20 text-indigo-100"
              : "border-rose-500/30 bg-rose-950/20 text-rose-100"
          }`}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 border-b border-indigo-500/20 pb-1.5 flex items-center justify-between">
            <span>Framework Localized Overlay</span>
            <span className="text-[10px] font-normal text-indigo-300/80">Sparse Overrides</span>
          </div>
          <div className="leading-relaxed text-sm font-medium">
            {localizedStem || <span className="italic text-slate-500">Stem unchanged (retains base)</span>}
          </div>
          {localizedPayload && (
            <pre className="mt-2 p-2.5 rounded bg-slate-900 border border-slate-800/80 text-[11px] font-mono text-indigo-200 overflow-x-auto">
              {JSON.stringify(localizedPayload, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
