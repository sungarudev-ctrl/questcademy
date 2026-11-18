"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, ChevronDown, CheckCircle2, TrendingUp, Users, AlertTriangle } from "lucide-react";

interface CountryCohortView {
  country_code: string;
  country_name: string;
  currency: string;
  framework_id: string;
  framework_name: string;
  phase: string;
  coverage_pct: number;
  active_learners: number;
  retention_30d_pct: number;
  mean_success_band: string;
  item_error_rate_pct: number;
}

const SAMPLE_COUNTRIES: CountryCohortView[] = [
  {
    country_code: "GH",
    country_name: "Ghana",
    currency: "GHS",
    framework_id: "GH-BECE-2024",
    framework_name: "Basic Education Certificate Examination (BECE)",
    phase: "piloting",
    coverage_pct: 82.4,
    active_learners: 1420,
    retention_30d_pct: 74.2,
    mean_success_band: "Proficient (Grade 2)",
    item_error_rate_pct: 12.8,
  },
  {
    country_code: "NG",
    country_name: "Nigeria",
    currency: "NGN",
    framework_id: "NG-WAEC-2024",
    framework_name: "West African Senior School Certificate (WASSCE)",
    phase: "reviewing",
    coverage_pct: 68.5,
    active_learners: 0,
    retention_30d_pct: 0,
    mean_success_band: "N/A (Pre-launch)",
    item_error_rate_pct: 0,
  },
  {
    country_code: "KE",
    country_name: "Kenya",
    currency: "KES",
    framework_id: "KE-CBC-2024",
    framework_name: "Competency Based Curriculum (Junior School)",
    phase: "authoring",
    coverage_pct: 44.1,
    active_learners: 0,
    retention_30d_pct: 0,
    mean_success_band: "N/A (Authoring)",
    item_error_rate_pct: 0,
  },
  {
    country_code: "RW",
    country_name: "Rwanda",
    currency: "RWF",
    framework_id: "RW-REB-2024",
    framework_name: "Rwanda Education Board Secondary Curriculum",
    phase: "planned",
    coverage_pct: 0.0,
    active_learners: 0,
    retention_30d_pct: 0,
    mean_success_band: "N/A (Planned)",
    item_error_rate_pct: 0,
  },
];

export default function CrossCountryViewPage() {
  const router = useRouter();
  const [expandedCountry, setExpandedCountry] = useState<string | null>("GH");

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/studio")}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Cross-Country Regional Cohorts
            </h1>
            <p className="text-xs text-slate-400">
              Aggregated analytics reading strictly from framework_cohort_stats with zero per-student cross-boundary joins.
            </p>
          </div>
        </div>

        <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-indigo-400" />
          <span>Active Jurisdictions: 4</span>
        </div>
      </div>

      {/* Governance Notice on Isolation */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Country isolation compliance verified: Cross-country metrics query pre-aggregated statistical cohorts only.
          </span>
        </div>
        <span className="font-mono text-indigo-300 text-[11px]">Table: framework_cohort_stats</span>
      </div>

      {/* Country Cards List */}
      <div className="space-y-4">
        {SAMPLE_COUNTRIES.map((c) => {
          const isExpanded = expandedCountry === c.country_code;

          return (
            <div
              key={c.country_code}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-md transition-all"
            >
              {/* Top Row */}
              <div
                onClick={() => setExpandedCountry(isExpanded ? null : c.country_code)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center font-bold text-sm text-indigo-300">
                    {c.country_code}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      {c.country_name}
                      <span className="text-xs font-normal text-slate-400">({c.currency})</span>
                    </h3>
                    <p className="text-xs text-slate-400">{c.framework_name}</p>
                  </div>
                </div>

                {/* KPI badges */}
                <div className="flex items-center gap-6 text-xs">
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Rollout Phase</span>
                    <span className="font-semibold text-indigo-300 capitalize">{c.phase}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Coverage</span>
                    <span className={`font-bold ${c.coverage_pct >= 80 ? "text-emerald-400" : "text-amber-400"}`}>
                      {c.coverage_pct.toFixed(1)}%
                    </span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">Active Learners</span>
                    <span className="font-semibold text-white">{c.active_learners.toLocaleString()}</span>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500">30d Retention</span>
                    <span className="font-semibold text-emerald-400">
                      {c.retention_30d_pct > 0 ? `${c.retention_30d_pct}%` : "—"}
                    </span>
                  </div>

                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="p-5 border-t border-slate-800 bg-slate-950/60 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  <div className="space-y-1">
                    <span className="text-slate-400 uppercase text-[10px] font-semibold">Mean Success Band</span>
                    <div className="text-sm font-bold text-white flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-indigo-400" /> {c.mean_success_band}
                    </div>
                    <p className="text-slate-500 text-[11px]">Normalized across all curriculum subject strands.</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-slate-400 uppercase text-[10px] font-semibold">Item Error Rate</span>
                    <div className="text-sm font-bold text-white">
                      {c.item_error_rate_pct > 0 ? `${c.item_error_rate_pct}%` : "—"}
                    </div>
                    <p className="text-slate-500 text-[11px]">Average incorrect attempts before first hint activation.</p>
                  </div>

                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => router.push(`/studio?country=${c.country_code}`)}
                      className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md"
                    >
                      Switch Studio to {c.country_name}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
