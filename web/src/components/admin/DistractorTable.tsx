"use client";

import React from "react";
import { ItemOption } from "@/types";
import { AlertCircle, CheckCircle2, ShieldAlert } from "lucide-react";

export interface DistractorTableProps {
  options: ItemOption[];
  onReassignMisconception?: (optionId: string, misconceptionId: string) => void;
  onUpdateOptionMisconception?: (index: number, misconceptionId: string) => void;
  className?: string;
}

export function DistractorTable({
  options,
  onReassignMisconception,
  onUpdateOptionMisconception,
  className = "",
}: DistractorTableProps): React.ReactElement {
  const distractors = options.filter((o) => !o.correct);

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-lg ${className}`}
      data-testid="distractor-table"
    >
      <div className="p-4 bg-slate-800/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
            Distractor Misconception Audit ({distractors.length})
          </h4>
        </div>
        <span className="text-[11px] text-slate-400">Every distractor MUST carry a misconception ID</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
              <th className="py-2.5 px-4 font-semibold w-16">Option</th>
              <th className="py-2.5 px-4 font-semibold">Distractor Content</th>
              <th className="py-2.5 px-4 font-semibold">Misconception ID</th>
              <th className="py-2.5 px-4 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {distractors.map((dist) => {
              const isTagged = Boolean(dist.misconception_id);

              return (
                <tr key={dist.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-300">
                    <span className="w-6 h-6 rounded bg-slate-800 flex items-center justify-center text-xs">
                      {dist.id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-200 font-medium">{dist.content}</td>
                  <td className="py-3 px-4 font-mono">
                    {dist.misconception_id ? (
                      <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {dist.misconception_id}
                      </span>
                    ) : (
                      <span className="text-rose-400 italic">UNTAGGED</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {isTagged ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Validated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-rose-400 font-semibold bg-rose-950/30 px-2 py-0.5 rounded border border-rose-500/30">
                        <AlertCircle className="w-3.5 h-3.5" /> Blocked
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
