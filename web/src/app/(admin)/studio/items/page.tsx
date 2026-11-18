"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ReviewQueueTable } from "@/components/admin/ReviewQueueTable";
import { Filter, Search, Tag, AlertCircle } from "lucide-react";

const SAMPLE_ITEMS = [
  {
    id: "item-frac-101",
    title: "MCQ: 1/4 + 2/5 (Tier 2 Practice Item)",
    subtitle: "Distractor tagging: 100% complete · 3 hints · Misconception: ADD_NUM_DENOM",
    status: "tagged",
    tag: "MATH.FRAC.ADD_UNLIKE",
    tier: 2,
    type: "multiple_choice",
    untaggedDistractors: false,
  },
  {
    id: "item-frac-102",
    title: "Numeric: 3/8 + 1/6 Simplest Form (Tier 3 Deep Assessment)",
    subtitle: "Distractor tagging: Missing 1 tag · 3 hints · SymPy Verified",
    status: "draft",
    tag: "MATH.FRAC.ADD_UNLIKE",
    tier: 3,
    type: "numeric",
    untaggedDistractors: true,
  },
  {
    id: "item-dec-201",
    title: "Matching: Convert 3/4, 2/5, 1/8 to Decimals (Tier 1 Diagnostic)",
    subtitle: "Distractor tagging: 100% complete · 3 hints · Reading Level: Grade 4.1",
    status: "tagged",
    tag: "MATH.DEC.CONVERT_FRAC",
    tier: 1,
    type: "matching",
    untaggedDistractors: false,
  },
];

export default function ItemReviewListPage() {
  const router = useRouter();
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [taggingFilter, setTaggingFilter] = useState<string>("all");

  const filteredItems = SAMPLE_ITEMS.filter((item) => {
    if (tierFilter !== "all" && String(item.tier) !== tierFilter) return false;
    if (taggingFilter === "tagged" && item.untaggedDistractors) return false;
    if (taggingFilter === "untagged" && !item.untaggedDistractors) return false;
    return true;
  });

  const queueItems = filteredItems.map((item) => ({
    id: item.id,
    title: item.title,
    subtitle: item.subtitle,
    status: item.status,
    tag: item.tag,
    onReview: () => router.push(`/studio/items/${item.id}`),
  }));

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Assessment Item Review Queue</h1>
          <p className="text-xs text-slate-400">
            Review AI-generated assessment items, verify distractor misconception tags, and inspect KaTeX rendering.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Tier:</span>
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              <option value="all">All Tiers</option>
              <option value="1">Tier 1 (Diagnostic)</option>
              <option value="2">Tier 2 (Practice)</option>
              <option value="3">Tier 3 (Deep/Assessment)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            <span>Tagging:</span>
            <select
              value={taggingFilter}
              onChange={(e) => setTaggingFilter(e.target.value)}
              className="bg-transparent text-white font-medium focus:outline-none"
            >
              <option value="all">All Items</option>
              <option value="tagged">Fully Tagged</option>
              <option value="untagged">Missing Tags</option>
            </select>
          </div>
        </div>
      </div>

      <ReviewQueueTable
        items={queueItems}
        title="Pending Item Staging"
        filterOptions={["tagged", "draft", "reviewed"]}
      />
    </div>
  );
}
