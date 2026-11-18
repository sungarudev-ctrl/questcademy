"use client";

import React, { useState } from "react";
import { GenerationJob } from "@/types";
import { Clock, RefreshCw, AlertCircle, CheckCircle2, Loader2, ChevronDown } from "lucide-react";

export interface GenerationJobRowProps {
  job: GenerationJob;
  onRetry?: (jobId: string) => Promise<void>;
  className?: string;
}

export function GenerationJobRow({ job, onRetry, className = "" }: GenerationJobRowProps): React.ReactElement {
  const [retrying, setRetrying] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleRetry = async () => {
    if (!onRetry || retrying) return;
    setRetrying(true);
    try {
      await onRetry(job.job_id);
    } finally {
      setRetrying(false);
    }
  };

  const statusIcons: Record<string, React.ReactElement> = {
    queued: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    running: <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />,
    completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    failed: <AlertCircle className="w-3.5 h-3.5 text-rose-400" />,
  };

  const statusColors: Record<string, string> = {
    queued: "bg-slate-800 text-slate-300 border-slate-700",
    running: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    failed: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  };

  return (
    <div
      className={`p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700/80 transition-all ${className}`}
      data-testid="generation-job-row"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-md text-xs font-semibold flex items-center gap-1.5 border uppercase ${
              statusColors[job.status] || statusColors.queued
            }`}
          >
            {statusIcons[job.status] || statusIcons.queued}
            {job.status}
          </span>
          <div className="min-w-0">
            <span className="font-semibold text-xs text-slate-200 block truncate font-mono">
              {job.job_type}
            </span>
            <span className="text-[11px] text-slate-400 truncate block">Target: {job.target_id}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-slate-500">
            {job.completed_at ? new Date(job.completed_at).toLocaleTimeString() : "Pending"}
          </span>

          {job.status === "failed" && onRetry && (
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-semibold flex items-center gap-1 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${retrying ? "animate-spin" : ""}`} />
              Retry
            </button>
          )}

          {job.error && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {expanded && job.error && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20 text-[11px] text-rose-200 font-mono break-all leading-relaxed">
          {job.error}
        </div>
      )}
    </div>
  );
}
