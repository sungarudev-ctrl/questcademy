"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  CheckSquare,
  Globe2,
  DollarSign,
  ShieldCheck,
  ArrowUpRight,
  Layers,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { CoverageGauge } from "@/components/admin/CoverageGauge";
import { BlockerList } from "@/components/admin/BlockerList";
import { GenerationJobRow } from "@/components/admin/GenerationJobRow";
import { ActivateFrameworkModal } from "@/components/admin/ActivateFrameworkModal";
import { useCoverage } from "@/lib/hooks/admin/useCoverage";
import { useReviewQueue } from "@/lib/hooks/admin/useReviewQueue";
import { useCostReport } from "@/lib/hooks/admin/useCostReport";
import { useJobStream } from "@/lib/hooks/admin/useJobStream";

export default function StudioDashboard() {
  const frameworkId = "gh_bece_math_2024";

  const { coverage } = useCoverage(frameworkId);
  const { counts } = useReviewQueue(frameworkId);
  const { costReport } = useCostReport(frameworkId);
  const { jobs } = useJobStream(frameworkId);

  const [isActivateOpen, setIsActivateOpen] = useState(false);

  const coveragePct = coverage?.coverage_pct || 78.5;
  const blockers = coveragePct < 80
    ? [`Coverage ${coveragePct.toFixed(1)}% < 80.0% activation threshold`, "3 mappings awaiting confirmation"]
    : [];
  const isEligible = coveragePct >= 80 && blockers.length === 0;

  const handleActivate = async (fwId: string) => {
    const res = await fetch(`/api/frameworks/${fwId}/activate`, {
      method: "POST",
      headers: { "X-User-Role": "curriculum_lead" },
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Activation rejected.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Primary Activation CTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              {frameworkId}
            </span>
            <span className="text-xs text-slate-400">JSS1–JSS3 Curriculum</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Content Operations Studio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage AI content authoring, human-in-the-loop review queues, and activation gates.
          </p>
        </div>

        {/* Primary Activation CTA with tooltip when disabled */}
        <div className="relative group self-start md:self-auto">
          <button
            type="button"
            disabled={!isEligible}
            onClick={() => setIsActivateOpen(true)}
            className="px-6 py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            <ShieldCheck className="w-4 h-4" />
            Activate Framework
          </button>

          {!isEligible && (
            <div className="absolute right-0 top-full mt-2 hidden group-hover:block z-20 w-64 p-3 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl text-[11px] text-slate-300 leading-snug">
              <div className="font-bold text-amber-400 flex items-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Activation Gated
              </div>
              Disabled: requires ≥80.0% coverage and zero blockers. Current: {coveragePct.toFixed(1)}%.
            </div>
          )}
        </div>
      </div>

      {/* Top Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Coverage Gauge */}
        <CoverageGauge
          coveragePct={coveragePct}
          totalObjectives={coverage?.total_objectives || 40}
          coveredObjectives={coverage?.covered_objectives || 31}
          threshold={80}
        />

        {/* 2. Review Queue Summary */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pending Human Review
            </span>
            <span className="text-xs font-mono font-bold text-amber-400">
              {counts.content + counts.items + counts.mappings + counts.localizations} Total
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <Link
              href="/studio/content"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 transition-colors"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Lesson Content Drafts
              </span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{counts.content}</span>
            </Link>

            <Link
              href="/studio/items"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 transition-colors"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <CheckSquare className="w-4 h-4 text-emerald-400" /> Assessment Items
              </span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{counts.items}</span>
            </Link>

            <Link
              href={`/studio/frameworks/${frameworkId}/mappings`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 transition-colors"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <Layers className="w-4 h-4 text-sky-400" /> AI Mapping Proposals
              </span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{counts.mappings}</span>
            </Link>

            <Link
              href="/studio/localization"
              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 hover:bg-slate-800/60 border border-slate-800/80 transition-colors"
            >
              <span className="flex items-center gap-2 text-slate-300">
                <Globe2 className="w-4 h-4 text-purple-400" /> Localizations Pending
              </span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded">{counts.localizations}</span>
            </Link>
          </div>
        </div>

        {/* 3. Cost & Spend Analytics */}
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              AI Generation Spend
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>

          <div>
            <div className="text-3xl font-black text-white">
              ${(costReport?.total_cost_usd || 18.42).toFixed(2)}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {costReport?.total_calls || 148} total Gemini API calls for this framework
            </p>
          </div>

          <div className="space-y-1.5 text-xs text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex justify-between">
              <span>Pipeline A1 (Nodes):</span>
              <span className="font-mono text-slate-200">$2.10</span>
            </div>
            <div className="flex justify-between">
              <span>Pipeline A2 (Content):</span>
              <span className="font-mono text-slate-200">$5.80</span>
            </div>
            <div className="flex justify-between">
              <span>Pipeline B (Items):</span>
              <span className="font-mono text-slate-200">$8.42</span>
            </div>
            <div className="flex justify-between">
              <span>Pipeline C & D (Map/Loc):</span>
              <span className="font-mono text-slate-200">$2.10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Blockers and Live Jobs Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BlockerList blockers={blockers} />

        {/* Live Generation Jobs */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Recent Generation Jobs (Live SSE)
              </h4>
            </div>
            <Link
              href="/studio/jobs"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
            >
              All Jobs <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {(jobs.length > 0
              ? jobs.slice(0, 3)
              : [
                  {
                    job_id: "demo-1",
                    job_type: "item_generation",
                    target_id: "MATH.FRAC.ADD_UNLIKE",
                    status: "completed",
                    created_at: new Date().toISOString(),
                    completed_at: new Date().toISOString(),
                  },
                  {
                    job_id: "demo-2",
                    job_type: "content_canonical",
                    target_id: "MATH.FRAC.SUBTRACT",
                    status: "running",
                    created_at: new Date().toISOString(),
                  },
                ]
            ).map((j: any) => (
              <GenerationJobRow key={j.job_id} job={j} />
            ))}
          </div>
        </div>
      </div>

      {/* Activation Modal */}
      <ActivateFrameworkModal
        frameworkId={frameworkId}
        coveragePct={coveragePct}
        blockers={blockers}
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        onConfirmActivate={handleActivate}
      />
    </div>
  );
}
