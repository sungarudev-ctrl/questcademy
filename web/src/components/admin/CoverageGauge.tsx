"use client";

import React from "react";
import { CheckCircle, AlertTriangle } from "lucide-react";

export interface CoverageGaugeProps {
  coveragePct?: number;
  percentage?: number;
  totalObjectives?: number;
  coveredObjectives?: number;
  threshold?: number;
  size?: number;
  className?: string;
}

export function CoverageGauge({
  coveragePct,
  percentage,
  totalObjectives = 0,
  coveredObjectives = 0,
  threshold = 80,
  className = "",
}: CoverageGaugeProps): React.ReactElement {
  const effectivePct = coveragePct ?? percentage ?? 0;
  const isPassing = effectivePct >= threshold;
  const clampedPct = Math.min(100, Math.max(0, effectivePct));

  return (
    <div
      className={`p-6 rounded-2xl border bg-slate-900/90 shadow-xl space-y-4 ${
        isPassing ? "border-emerald-500/30" : "border-amber-500/30"
      } ${className}`}
      data-testid="coverage-gauge"
    >
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Curriculum Coverage
          </span>
          <div className="text-3xl font-extrabold tracking-tight mt-1 flex items-baseline gap-2">
            <span className={isPassing ? "text-emerald-400" : "text-amber-400"}>
              {effectivePct.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 font-normal">of syllabus mapped</span>
          </div>
        </div>

        {/* Status Badge */}
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${
            isPassing
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          {isPassing ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Gated Pass</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Gated (&lt;{threshold}%)</span>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar with 80% marker */}
      <div className="relative pt-2 pb-1">
        <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isPassing
                ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-emerald-500/30 shadow-sm"
                : "bg-gradient-to-r from-amber-600 to-amber-400 shadow-amber-500/30 shadow-sm"
            }`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>

        {/* 80% Gate Marker */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
          style={{ left: `${threshold}%` }}
        >
          <div className="w-0.5 h-full bg-white shadow-sm" />
          <span className="text-[10px] font-bold text-white/90 bg-slate-800 px-1 py-0.5 rounded mt-1 border border-slate-700">
            {threshold}% Gate
          </span>
        </div>
      </div>

      {totalObjectives > 0 && (
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/80">
          <span>
            {coveredObjectives} of {totalObjectives} objectives fully covered (≥15 items, ≥5 tier-3)
          </span>
          <span className="text-slate-500">Target: ≥80.0%</span>
        </div>
      )}
    </div>
  );
}
