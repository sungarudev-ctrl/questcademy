"use client";

import React, { useState } from "react";
import { ItemHint } from "@/types";
import { ChevronDown, HelpCircle, Sparkles } from "lucide-react";

export interface HintAccordionProps {
  hints: ItemHint[];
  className?: string;
}

export function HintAccordion({ hints, className = "" }: HintAccordionProps): React.ReactElement {
  const [openLevel, setOpenLevel] = useState<number | null>(1);

  const toggleLevel = (lvl: number) => {
    setOpenLevel((prev) => (prev === lvl ? null : lvl));
  };

  const hintTitles: Record<number, string> = {
    1: "Conceptual Orientation (Tier 1)",
    2: "Strategy & Representation (Tier 2)",
    3: "Next Computational Step (Tier 3)",
  };

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg space-y-2 p-4 ${className}`}
      data-testid="hint-accordion"
    >
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-indigo-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Progressive Hint Scaffold ({hints.length}/3)
          </h4>
        </div>
        <span className="text-[11px] text-slate-400">Fixed 3-hint contract</span>
      </div>

      <div className="space-y-2 pt-1">
        {hints.map((hint, idx) => {
          const level = hint.level || idx + 1;
          const isOpen = openLevel === level;
          const text = hint.content || hint.text || "";

          return (
            <div
              key={level}
              className="rounded-xl border border-slate-800/80 bg-slate-950/60 overflow-hidden transition-all"
            >
              <button
                type="button"
                onClick={() => toggleLevel(level)}
                className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    {level}
                  </span>
                  <span className="text-xs font-semibold text-slate-200">
                    {hintTitles[level] || `Hint Level ${level}`}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-indigo-400" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 pb-3 pt-1 text-xs text-slate-300 leading-relaxed border-t border-slate-800/50">
                  {text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
