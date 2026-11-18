"use client";

import React, { useState } from "react";
import { SyllabusObjective } from "@/types";
import { ChevronDown, Check, X, Edit3, ArrowUpRight } from "lucide-react";

export interface MappingReviewRowProps {
  objective: SyllabusObjective;
  mappedNodes: string[];
  confidence?: number;
  rationale?: string;
  onConfirm?: (objectiveId: string, nodeId: string) => Promise<void>;
  onReject?: (objectiveId: string) => Promise<void>;
  onEdit?: (objectiveId: string) => void;
  className?: string;
}

export function MappingReviewRow({
  objective,
  mappedNodes = [],
  confidence,
  rationale,
  onConfirm,
  onReject,
  onEdit,
  className = "",
}: MappingReviewRowProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  const isMapped = mappedNodes.length > 0;

  const handleConfirm = async () => {
    if (!onConfirm || mappedNodes.length === 0 || loading) return;
    setLoading(true);
    try {
      await onConfirm(objective.objective_id, mappedNodes[0]);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject || loading) return;
    setLoading(true);
    try {
      await onReject(objective.objective_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`border-b border-slate-800 bg-slate-900/40 hover:bg-slate-800/30 transition-all ${className}`}
      data-testid="mapping-review-row"
    >
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          <span className="font-mono text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 shrink-0">
            {objective.code}
          </span>
          <p className="text-xs text-slate-200 font-medium truncate">{objective.text}</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
              isMapped
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
            }`}
          >
            {isMapped ? `${mappedNodes.length} node(s)` : "Unmapped"}
          </span>

          {confidence !== undefined && (
            <span className="text-[11px] font-mono text-slate-400">
              {(confidence * 100).toFixed(0)}% conf
            </span>
          )}

          {isMapped && onConfirm && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <Check className="w-3 h-3" /> Confirm
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(objective.objective_id)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Edit
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-12 pb-4 pt-1 space-y-2 text-xs text-slate-300 border-t border-slate-800/50 bg-slate-950/40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Full Objective Definition
              </span>
              <p className="leading-relaxed text-slate-200">{objective.text}</p>
              <div className="mt-2 text-slate-400 text-[11px]">
                Grade Band: <span className="text-slate-200">{objective.grade_band}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Mapped Canonical Skill Nodes
              </span>
              {mappedNodes.length > 0 ? (
                <ul className="space-y-1">
                  {mappedNodes.map((n) => (
                    <li key={n} className="font-mono text-indigo-300 flex items-center gap-1.5">
                      <ArrowUpRight className="w-3 h-3 text-indigo-400" />
                      {n}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-amber-400 italic">No canonical nodes mapped yet.</p>
              )}

              {rationale && (
                <div className="mt-2 pt-2 border-t border-slate-800 text-slate-400">
                  <span className="font-semibold text-slate-300">AI Rationale:</span> {rationale}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
