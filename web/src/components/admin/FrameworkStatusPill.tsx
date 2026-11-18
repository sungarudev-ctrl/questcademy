"use client";

import React from "react";
import { FrameworkRolloutPhase } from "@/types";

export interface FrameworkStatusPillProps {
  phase: FrameworkRolloutPhase | string;
  className?: string;
}

export function FrameworkStatusPill({ phase, className = "" }: FrameworkStatusPillProps): React.ReactElement {
  const normalized = (phase || "planned").toLowerCase();

  const phaseStyles: Record<string, string> = {
    planned: "bg-slate-800 text-slate-300 border-slate-700",
    importing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    mapping: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    authoring: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    reviewing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    piloting: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    superseded: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  const style = phaseStyles[normalized] || phaseStyles.planned;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${style} ${className}`}
      data-testid="framework-status-pill"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 animate-pulse" />
      {normalized}
    </span>
  );
}
