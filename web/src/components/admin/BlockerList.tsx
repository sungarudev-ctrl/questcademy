"use client";

import React from "react";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export interface BlockerListProps {
  blockers: string[];
  className?: string;
}

export function BlockerList({ blockers, className = "" }: BlockerListProps): React.ReactElement {
  const hasBlockers = blockers && blockers.length > 0;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg space-y-3 ${
        hasBlockers ? "border-amber-500/30 bg-amber-950/10" : "border-emerald-500/30 bg-emerald-950/10"
      } ${className}`}
      data-testid="blocker-list"
    >
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          {hasBlockers ? (
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Activation Blockers ({blockers?.length || 0})
          </h4>
        </div>
        <span
          className={`text-xs font-semibold ${
            hasBlockers ? "text-amber-400" : "text-emerald-400"
          }`}
        >
          {hasBlockers ? "Activation Gated" : "Clear for Activation"}
        </span>
      </div>

      {hasBlockers ? (
        <ul className="space-y-2">
          {blockers.map((b, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-xs text-amber-200 bg-amber-950/30 p-2.5 rounded-xl border border-amber-500/20"
            >
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-emerald-300 py-1 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>No blockers recorded. Once coverage crosses 80%, framework activation is permitted.</span>
        </div>
      )}
    </div>
  );
}
