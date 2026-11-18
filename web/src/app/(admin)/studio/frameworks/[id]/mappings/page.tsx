"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { MappingReviewRow } from "@/components/admin/MappingReviewRow";
import { CoverageGauge } from "@/components/admin/CoverageGauge";
import { SyllabusObjective } from "@/types";
import { ArrowLeft, Search, Filter, ShieldCheck, AlertCircle } from "lucide-react";

const SAMPLE_OBJECTIVES: Array<{
  objective: SyllabusObjective;
  mappedNodes: string[];
  confidence: number;
  rationale: string;
}> = [
  {
    objective: {
      objective_id: "obj-bece-01",
      framework_id: "GH-BECE-2024",
      code: "BECE.MATH.7.1.1",
      text: "Demonstrate understanding of addition and subtraction of vulgar fractions with unlike denominators.",
      grade_band: "JHS 1",
      coverage_status: "full",
    },
    mappedNodes: ["MATH.FRAC.ADD_UNLIKE", "MATH.FRAC.SUBTRACT"],
    confidence: 0.94,
    rationale: "Direct alignment on fraction operations with distinct denominators.",
  },
  {
    objective: {
      objective_id: "obj-bece-02",
      framework_id: "GH-BECE-2024",
      code: "BECE.MATH.7.1.2",
      text: "Convert terminating and recurring decimals into equivalent common fractions.",
      grade_band: "JHS 1",
      coverage_status: "full",
    },
    mappedNodes: ["MATH.DEC.CONVERT_FRAC"],
    confidence: 0.88,
    rationale: "Covers base terminating decimals conversion to fractions.",
  },
  {
    objective: {
      objective_id: "obj-bece-03",
      framework_id: "GH-BECE-2024",
      code: "BECE.MATH.7.2.1",
      text: "Apply prime factorisation to determine HCF and LCM of three two-digit numbers.",
      grade_band: "JHS 1",
      coverage_status: "unmapped",
    },
    mappedNodes: [],
    confidence: 0.0,
    rationale: "No existing core node covers 3-number simultaneous prime factorization.",
  },
];

export default function MappingReviewPage() {
  const router = useRouter();
  const params = useParams();
  const frameworkId = (params?.id as string) || "GH-BECE-2024";

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "mapped" | "unmapped">("all");
  const [objectives, setObjectives] = useState(SAMPLE_OBJECTIVES);
  const [notification, setNotification] = useState<string | null>(null);

  const handleConfirm = async (objectiveId: string, nodeId: string) => {
    setNotification(`Confirmed mapping of objective ${objectiveId} to node ${nodeId}. Action audited.`);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleReject = async (objectiveId: string) => {
    setNotification(`Marked objective ${objectiveId} as unmapped. Reason logged.`);
    setObjectives((prev) =>
      prev.map((item) =>
        item.objective.objective_id === objectiveId
          ? { ...item, mappedNodes: [], confidence: 0 }
          : item
      )
    );
    setTimeout(() => setNotification(null), 3000);
  };

  const filtered = objectives.filter((item) => {
    if (filterStatus === "mapped" && item.mappedNodes.length === 0) return false;
    if (filterStatus === "unmapped" && item.mappedNodes.length > 0) return false;
    if (
      searchTerm &&
      !item.objective.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !item.objective.text.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

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
            <h1 className="text-xl font-bold text-white tracking-tight">
              Objective-to-Node Mapping Review: {frameworkId}
            </h1>
            <p className="text-xs text-slate-400">
              Audit AI-proposed mappings individual by individual. Bulk approvals are strictly prohibited.
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search code or text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-white placeholder-slate-500 focus:outline-none w-44"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "mapped" | "unmapped")}
              className="bg-transparent text-white focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="mapped">Mapped</option>
              <option value="unmapped">Unmapped</option>
            </select>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> {notification}
        </div>
      )}

      {/* Governance Notice */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-indigo-400" />
          <span>
            Every mapping proposal must be reviewed and confirmed individually. No bulk approve or shortcut action exists.
          </span>
        </div>
        <span className="font-semibold text-slate-300">
          Showing {filtered.length} of {objectives.length} objectives
        </span>
      </div>

      {/* Mappings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Objective & Proposed Skill Node Mapping</span>
          <span>Actions & Confidence</span>
        </div>
        <div>
          {filtered.map((item) => (
            <MappingReviewRow
              key={item.objective.objective_id}
              objective={item.objective}
              mappedNodes={item.mappedNodes}
              confidence={item.confidence}
              rationale={item.rationale}
              onConfirm={handleConfirm}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>

      {/* Bottom Live Coverage Indicator */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-base font-semibold text-white">Live Framework Coverage Gate</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Activation requires reaching the 80% coverage threshold across all mapped syllabus objectives.
            Unmapped objectives reduce coverage and block framework rollout.
          </p>
        </div>
        <div className="shrink-0">
          <CoverageGauge percentage={78.5} threshold={80} size={140} />
        </div>
      </div>
    </div>
  );
}
