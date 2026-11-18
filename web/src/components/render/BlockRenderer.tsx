"use client";

import React from "react";
import { ContentBlock } from "@/types";
import { AlertCircle, CheckCircle2, HelpCircle, Lightbulb, Info } from "lucide-react";

export interface BlockRendererProps {
  blocks: ContentBlock[] | Array<{ type: string; payload?: Record<string, unknown>; content?: unknown }>;
  className?: string;
}

export function BlockRenderer({ blocks, className = "" }: BlockRendererProps): React.ReactElement {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return <div className="text-muted-foreground text-sm italic">No content blocks to display.</div>;
  }

  return (
    <div className={`space-y-4 text-foreground ${className}`} data-testid="block-renderer">
      {blocks.map((block, idx) => {
        const blockType = block.type;
        const payload = (block as ContentBlock).payload || (block as Record<string, unknown>);
        const key = (block as ContentBlock).block_id || `block-${idx}`;

        switch (blockType) {
          case "heading": {
            const level = Number(payload.level || 2);
            const text = String(payload.text || payload.content || "");
            if (level === 1) return <h1 key={key} className="text-2xl font-bold tracking-tight text-white mb-2">{text}</h1>;
            if (level === 2) return <h2 key={key} className="text-xl font-semibold tracking-tight text-white/95 mt-4 mb-2">{text}</h2>;
            return <h3 key={key} className="text-lg font-medium text-white/90 mt-3 mb-1">{text}</h3>;
          }

          case "text":
          case "paragraph": {
            const text = String(payload.text || payload.content || "");
            return (
              <p key={key} className="leading-relaxed text-slate-300 text-base">
                {text}
              </p>
            );
          }

          case "math": {
            const latex = String(payload.latex || payload.content || "");
            return (
              <div
                key={key}
                className="my-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-center font-mono text-indigo-300 text-lg overflow-x-auto shadow-inner"
              >
                {latex}
              </div>
            );
          }

          case "callout":
          case "tip":
          case "info": {
            const text = String(payload.text || payload.content || "");
            const title = String(payload.title || "Note");
            return (
              <div
                key={key}
                className="my-3 flex items-start gap-3 p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-200"
              >
                <Lightbulb className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  {title && <div className="font-semibold text-indigo-300 text-sm">{title}</div>}
                  <div className="text-sm leading-relaxed text-indigo-200/90">{text}</div>
                </div>
              </div>
            );
          }

          case "warning": {
            const text = String(payload.text || payload.content || "");
            return (
              <div
                key={key}
                className="my-3 flex items-start gap-3 p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200"
              >
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed text-amber-200/90">{text}</div>
              </div>
            );
          }

          case "worked_example": {
            const problem = String(payload.problem || payload.title || "Example Problem");
            const steps = Array.isArray(payload.steps) ? payload.steps : [];
            const answer = String(payload.final_answer || payload.solution || "");

            return (
              <div
                key={key}
                className="my-4 rounded-xl overflow-hidden border border-slate-700/80 bg-slate-900/90 shadow-md"
              >
                <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Worked Example</span>
                  <span className="text-xs text-slate-400">Step-by-step</span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="font-medium text-slate-200 text-sm">{problem}</div>
                  {steps.length > 0 && (
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 text-sm text-slate-300">
                      {steps.map((step, sIdx) => (
                        <li key={sIdx} className="leading-relaxed">
                          {typeof step === "string" ? step : JSON.stringify(step)}
                        </li>
                      ))}
                    </ol>
                  )}
                  {answer && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Final Answer: {answer}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          case "definition": {
            const term = String(payload.term || "");
            const definition = String(payload.definition || payload.text || "");
            return (
              <div key={key} className="my-3 p-3.5 rounded-lg bg-slate-800/40 border-l-4 border-accent pl-4">
                <span className="font-bold text-accent text-sm mr-2">{term}:</span>
                <span className="text-slate-300 text-sm leading-relaxed">{definition}</span>
              </div>
            );
          }

          case "list": {
            const items = Array.isArray(payload.items) ? payload.items : [];
            const ordered = Boolean(payload.ordered);
            const ListTag = ordered ? "ol" : "ul";
            return (
              <ListTag
                key={key}
                className={`my-3 space-y-1 text-sm text-slate-300 pl-5 ${ordered ? "list-decimal" : "list-disc"}`}
              >
                {items.map((it, iIdx) => (
                  <li key={iIdx}>{typeof it === "string" ? it : String(it)}</li>
                ))}
              </ListTag>
            );
          }

          case "divider": {
            return <hr key={key} className="my-6 border-slate-800" />;
          }

          default: {
            return (
              <div key={key} className="my-2 p-2.5 rounded bg-slate-900/50 border border-slate-800 text-xs text-slate-400">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-500 mb-1">{blockType}</div>
                <div>{JSON.stringify(payload)}</div>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
