"use client";

import React from "react";
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";

export interface QualityCheckItem {
  id: string;
  name: string;
  status: "pass" | "fail" | "warn";
  details?: string;
}

export interface QualityCheckPanelProps {
  checks?: QualityCheckItem[];
  title?: string;
  overallPass?: boolean;
  className?: string;
  readingLevel?: number;
  readingLevelTarget?: string;
  mathInvariancePass?: boolean;
  katexValid?: boolean;
  workedExamplesCount?: number;
  dedupSimilarity?: number;
}

export function QualityCheckPanel({
  checks,
  title = "Automated Quality Gate Analysis",
  overallPass,
  className = "",
  readingLevel,
  readingLevelTarget,
  mathInvariancePass,
  katexValid,
  workedExamplesCount,
  dedupSimilarity,
}: QualityCheckPanelProps): React.ReactElement {
  const activeChecks: QualityCheckItem[] = checks ? [...checks] : [];

  if (!checks) {
    if (readingLevel !== undefined) {
      activeChecks.push({
        id: "reading-level",
        name: `Reading Level: Grade ${readingLevel.toFixed(1)}`,
        status: "pass",
        details: readingLevelTarget ? `Target: ${readingLevelTarget}` : undefined,
      });
    }
    if (mathInvariancePass !== undefined) {
      activeChecks.push({
        id: "math-invariance",
        name: mathInvariancePass ? "SymPy Invariance Verified" : "Math Invariance Failed",
        status: mathInvariancePass ? "pass" : "fail",
        details: mathInvariancePass ? "All numeric constants match base" : "Numeric deviation found",
      });
    }
    if (katexValid !== undefined) {
      activeChecks.push({
        id: "katex-syntax",
        name: katexValid ? "KaTeX Validated" : "KaTeX Syntax Error",
        status: katexValid ? "pass" : "fail",
        details: katexValid ? "Valid LaTeX equations" : "Unmatched brackets or macros",
      });
    }
    if (workedExamplesCount !== undefined) {
      const pass = workedExamplesCount >= 3;
      activeChecks.push({
        id: "worked-examples",
        name: `${workedExamplesCount} Worked Examples`,
        status: pass ? "pass" : "warn",
        details: pass ? "Meets ≥3 examples requirement" : "Fewer than 3 examples",
      });
    }
    if (dedupSimilarity !== undefined) {
      const pass = dedupSimilarity <= 0.8;
      activeChecks.push({
        id: "dedup",
        name: `Duplicate Index: ${(dedupSimilarity * 100).toFixed(0)}%`,
        status: pass ? "pass" : "fail",
        details: pass ? "Below 80% similarity threshold" : "Duplicate similarity violation",
      });
    }
  }

  const isPassing =
    overallPass !== undefined
      ? overallPass
      : activeChecks.every((c) => c.status !== "fail");

  return (
    <div
      className={`rounded-2xl border bg-slate-900/90 p-5 shadow-lg space-y-4 ${
        isPassing ? "border-slate-800" : "border-rose-500/40 bg-rose-950/10"
      } ${className}`}
      data-testid="quality-check-panel"
    >
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className={`w-5 h-5 ${isPassing ? "text-indigo-400" : "text-rose-400"}`} />
          <h3 className="text-sm font-semibold text-white tracking-wide">{title}</h3>
        </div>
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
            isPassing
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
          }`}
        >
          {isPassing ? "All Passed" : "Action Required"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {activeChecks.map((check) => {
          let icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
          let bgStyle = "bg-slate-950/60 border-slate-800/80 text-slate-300";

          if (check.status === "fail") {
            icon = <XCircle className="w-4 h-4 text-rose-400 shrink-0" />;
            bgStyle = "bg-rose-950/20 border-rose-500/30 text-rose-200";
          } else if (check.status === "warn") {
            icon = <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />;
            bgStyle = "bg-amber-950/20 border-amber-500/30 text-amber-200";
          }

          return (
            <div key={check.id} className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${bgStyle}`}>
              {icon}
              <div className="space-y-0.5 min-w-0">
                <div className="font-semibold text-slate-100">{check.name}</div>
                {check.details && <div className="text-slate-400 text-[11px] leading-snug">{check.details}</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
