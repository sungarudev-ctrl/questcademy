"use client";

import React, { useState } from "react";
import { AssessmentItem, ItemOption } from "@/types";
import { CheckCircle2, Circle, HelpCircle, Check, X, ShieldAlert } from "lucide-react";

export interface ItemRendererProps {
  item: AssessmentItem;
  showSolution?: boolean;
  showMisconceptions?: boolean;
  onSelectOption?: (optionId: string) => void;
  className?: string;
}

export function ItemRenderer({
  item,
  showSolution = false,
  showMisconceptions = false,
  onSelectOption,
  className = "",
}: ItemRendererProps): React.ReactElement {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [numericValue, setNumericValue] = useState<string>("");

  const stemText =
    typeof item.stem === "string"
      ? item.stem
      : String(
          (item.stem as Record<string, unknown>)?.content ||
          (item.stem as Record<string, unknown>)?.text ||
          (item as unknown as { prompt?: string }).prompt ||
          ""
        );

  const options: ItemOption[] = Array.isArray(item.payload?.options)
    ? item.payload.options
    : Array.isArray((item as unknown as { options?: ItemOption[] }).options)
    ? ((item as unknown as { options: ItemOption[] }).options)
    : [];

  const handleOptionClick = (optId: string) => {
    setSelectedOption(optId);
    if (onSelectOption) onSelectOption(optId);
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-xl space-y-6 text-foreground ${className}`}
      data-testid="item-renderer"
    >
      {/* Item Meta Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
            {item.type}
          </span>
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Tier {item.difficulty_tier}
          </span>
          <span className="text-xs text-slate-400">Elo: {item.difficulty_elo}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">ID: {item.item_id.slice(0, 8)}</span>
      </div>

      {/* Item Question Stem */}
      <div className="text-base md:text-lg font-medium text-slate-100 leading-relaxed">
        {stemText}
      </div>

      {/* Item Options (MCQ, Multi-select, True/False) */}
      {options.length > 0 && (
        <div className="space-y-3 pt-2" role="radiogroup" aria-label="Question Options">
          {options.map((opt) => {
            const isSelected = selectedOption === opt.id;
            const isCorrect = opt.correct;

            let borderStyle = "border-slate-800 hover:border-slate-700 bg-slate-800/30";
            let badgeStyle = "bg-slate-800 text-slate-400";

            if (showSolution) {
              if (isCorrect) {
                borderStyle = "border-emerald-500/50 bg-emerald-950/20 text-emerald-200";
                badgeStyle = "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
              } else if (isSelected) {
                borderStyle = "border-rose-500/50 bg-rose-950/20 text-rose-200";
                badgeStyle = "bg-rose-500/20 text-rose-400 border-rose-500/30";
              }
            } else if (isSelected) {
              borderStyle = "border-indigo-500 bg-indigo-950/30 shadow-indigo-500/10 shadow-lg";
              badgeStyle = "bg-indigo-600 text-white";
            }

            return (
              <div
                key={opt.id}
                onClick={() => handleOptionClick(opt.id)}
                className={`flex items-start justify-between p-4 rounded-xl border transition-all cursor-pointer select-none ${borderStyle}`}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-xs shrink-0 ${badgeStyle}`}
                  >
                    {opt.id}
                  </div>
                  <span className="text-sm md:text-base font-normal text-slate-200">{opt.content}</span>
                </div>

                {/* Status Badges in Review Mode */}
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {showSolution && isCorrect && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <Check className="w-4 h-4" /> Correct
                    </span>
                  )}
                  {showMisconceptions && !isCorrect && opt.misconception_id && (
                    <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {opt.misconception_id}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Numeric / Exact Input Type */}
      {(item.type === "numeric_exact" || item.type === "numeric_tolerance" || item.type === "fill_blank") && (
        <div className="pt-2 space-y-2 max-w-sm">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Your Answer</label>
          <input
            type="text"
            value={numericValue}
            onChange={(e) => setNumericValue(e.target.value)}
            placeholder="Type value..."
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-mono"
          />
        </div>
      )}

      {/* Hints Preview */}
      {item.hints && item.hints.length > 0 && (
        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            Hints Available ({item.hints.length})
          </div>
          <div className="space-y-2">
            {item.hints.map((h, hIdx) => (
              <div key={hIdx} className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                <span className="font-semibold text-indigo-400 mr-2">Level {h.level || hIdx + 1}:</span>
                <span>{h.content || h.text || JSON.stringify(h)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Solution Preview */}
      {showSolution && item.worked_solution && (
        <div className="pt-4 border-t border-slate-800 bg-indigo-950/20 -mx-6 -mb-6 p-6 rounded-b-2xl border-t-indigo-500/20">
          <div className="text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">Worked Solution</div>
          <div className="text-sm text-slate-200 leading-relaxed">
            {item.worked_solution.text || JSON.stringify(item.worked_solution)}
          </div>
        </div>
      )}
    </div>
  );
}
