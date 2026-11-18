"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GenerationJobRow } from "@/components/admin/GenerationJobRow";
import { GenerationJob } from "@/types";
import { ArrowLeft, RefreshCw, Radio, Play, CheckCircle2, AlertCircle } from "lucide-react";

const SAMPLE_JOBS: GenerationJob[] = [
  {
    job_id: "job-001",
    framework_id: "GH-BECE-2024",
    job_type: "generate_skill_content",
    target_id: "MATH.FRAC.ADD_UNLIKE",
    status: "completed",
    attempts: 1,
    cost_usd: 0.042,
    started_at: new Date(Date.now() - 3600000).toISOString(),
    completed_at: new Date(Date.now() - 3540000).toISOString(),
  },
  {
    job_id: "job-002",
    framework_id: "GH-BECE-2024",
    job_type: "generate_assessment_items",
    target_id: "MATH.FRAC.ADD_UNLIKE",
    status: "completed",
    attempts: 1,
    cost_usd: 0.086,
    started_at: new Date(Date.now() - 3400000).toISOString(),
    completed_at: new Date(Date.now() - 3310000).toISOString(),
  },
  {
    job_id: "job-003",
    framework_id: "GH-BECE-2024",
    job_type: "localize_items",
    target_id: "GH-BECE-2024",
    status: "running",
    attempts: 1,
    started_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    job_id: "job-004",
    framework_id: "GH-BECE-2024",
    job_type: "generate_assessment_items",
    target_id: "MATH.PRIME.HCF_LCM",
    status: "failed",
    attempts: 2,
    error: "SymPy validation error: 2 worked examples had identical factor trees. Maximum similarity exceeded.",
    started_at: new Date(Date.now() - 1800000).toISOString(),
    completed_at: new Date(Date.now() - 1750000).toISOString(),
  },
];

export default function JobsMonitorPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<GenerationJob[]>(SAMPLE_JOBS);
  const [isLive, setIsLive] = useState(true);
  const [notification, setNotification] = useState<string | null>(null);

  const handleRetry = async (jobId: string) => {
    const job = jobs.find((j) => j.job_id === jobId);
    if (!job) return;

    const attempts = job.attempts ?? 1;
    if (attempts >= 3) {
      setNotification(`Retry prohibited: Job ${jobId} has reached the maximum of 3 attempts.`);
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    setJobs((prev) =>
      prev.map((j) =>
        j.job_id === jobId
          ? { ...j, status: "running", attempts: (j.attempts ?? 1) + 1, error: undefined }
          : j
      )
    );
    setNotification(`Retrying job ${jobId} (Attempt ${attempts + 1}/3)...`);
    setTimeout(() => {
      setJobs((prev) =>
        prev.map((j) =>
          j.job_id === jobId ? { ...j, status: "completed", completed_at: new Date().toISOString() } : j
        )
      );
      setNotification(`Job ${jobId} succeeded.`);
      setTimeout(() => setNotification(null), 3000);
    }, 2000);
  };

  const completedCount = jobs.filter((j) => j.status === "completed").length;
  const runningCount = jobs.filter((j) => j.status === "running").length;
  const failedCount = jobs.filter((j) => j.status === "failed").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/studio")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">AI Generation Jobs Monitor</h1>
            <p className="text-xs text-slate-400">
              Real-time generation worker queue telemetry streamed via Server-Sent Events (/api/admin/jobs/stream).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
              isLive
                ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Radio className={`w-3.5 h-3.5 ${isLive ? "text-emerald-400 animate-pulse" : ""}`} />
            {isLive ? "Live Stream Connected" : "Stream Paused"}
          </button>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-indigo-950/60 border border-indigo-500/40 text-indigo-200 text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" /> {notification}
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed Jobs
          </span>
          <div className="text-2xl font-bold text-white">{completedCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-indigo-400" /> Active / In-Progress
          </span>
          <div className="text-2xl font-bold text-indigo-300">{runningCount}</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" /> Failed (Capped at 3 retries)
          </span>
          <div className="text-2xl font-bold text-rose-400">{failedCount}</div>
        </div>
      </div>

      {/* Jobs Stream List */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Job Execution Log
        </h2>
        <div className="space-y-2">
          {jobs.map((job) => (
            <GenerationJobRow key={job.job_id} job={job} onRetry={handleRetry} />
          ))}
        </div>
      </div>
    </div>
  );
}
