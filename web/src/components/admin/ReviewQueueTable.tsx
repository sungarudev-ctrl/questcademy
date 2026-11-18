"use client";

import React, { useState } from "react";
import { Search, Filter, ArrowRight, Clock } from "lucide-react";

export interface ReviewQueueItem {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  tag?: string;
  updatedAt?: string;
  onReview?: () => void;
}

export interface ReviewQueueTableProps {
  items: ReviewQueueItem[];
  title: string;
  filterOptions?: string[];
  emptyMessage?: string;
  className?: string;
}

export function ReviewQueueTable({
  items,
  title,
  filterOptions = [],
  emptyMessage = "Queue is clear. No items awaiting human review.",
  className = "",
}: ReviewQueueTableProps): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = activeFilter === "all" || item.status.toLowerCase() === activeFilter.toLowerCase();
    return matchesSearch && matchesFilter;
  });

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden ${className}`}
      data-testid="review-queue-table"
    >
      {/* Header & Controls */}
      <div className="p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {filteredItems.length} of {items.length} items awaiting action
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search queue..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 md:w-56"
            />
          </div>

          {filterOptions.length > 0 && (
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Statuses</option>
              {filterOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table Content */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-xs space-y-1">
          <Clock className="w-6 h-6 mx-auto mb-2 text-slate-500" />
          <p className="font-semibold text-slate-300">{emptyMessage}</p>
        </div>
      ) : (
        <div className="divide-y divide-slate-800/80 overflow-x-auto">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-100 truncate block">{item.title}</span>
                  {item.tag && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {item.tag}
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                    {item.status}
                  </span>
                </div>
                {item.subtitle && <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>}
              </div>

              {item.onReview && (
                <button
                  type="button"
                  onClick={item.onReview}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
                >
                  Review <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
