"use client";

import React, { useState } from "react";
import { SkillNode } from "@/types";
import { GitBranch, Search, Sparkles, AlertTriangle, ChevronRight, Ban, CheckCircle } from "lucide-react";

export interface SkillGraphTreeProps {
  nodes: SkillNode[];
  onGenerateContent?: (nodeId: string) => void;
  onDeprecateNode?: (nodeId: string, reason: string) => void;
  className?: string;
}

export function SkillGraphTree({
  nodes,
  onGenerateContent,
  onDeprecateNode,
  className = "",
}: SkillGraphTreeProps): React.ReactElement {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [deprecateModalNode, setDeprecateModalNode] = useState<string | null>(null);
  const [deprecateReason, setDeprecateReason] = useState("");

  const topics = Array.from(new Set(nodes.map((n) => n.topic))).filter(Boolean);

  const filteredNodes = nodes.filter((n) => {
    const matchesSearch =
      n.node_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.learner_title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTopic = selectedTopic === "all" || n.topic === selectedTopic;
    return matchesSearch && matchesTopic;
  });

  return (
    <div
      className={`rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden space-y-4 p-5 ${className}`}
      data-testid="skill-graph-tree"
    >
      {/* Search & Topic Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            Canonical Skill Graph
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Global, grade-agnostic atomic skills. Node IDs are immutable by specification.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search ID, title, learner title..."
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-56"
            />
          </div>

          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Topics</option>
            {topics.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredNodes.map((node) => {
          const isLive = node.status === "live";
          const isDeprecated = node.status === "deprecated";

          return (
            <div
              key={node.node_id}
              className="p-4 rounded-xl border border-slate-800 bg-slate-950/60 hover:border-slate-700/80 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 truncate max-w-[200px]">
                  {node.node_id}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                    isLive
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : isDeprecated
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}
                >
                  {node.status}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-100">{node.title}</h4>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{node.description}</p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                <span>{node.est_minutes} min duration</span>
                <span>{node.prerequisites?.length || 0} prereqs</span>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {onGenerateContent && !isDeprecated && (
                  <button
                    type="button"
                    onClick={() => onGenerateContent(node.node_id)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    Generate Content
                  </button>
                )}

                {onDeprecateNode && !isDeprecated && (
                  <button
                    type="button"
                    onClick={() => setDeprecateModalNode(node.node_id)}
                    className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-xs font-semibold transition-colors"
                    title="Deprecate node with reason"
                  >
                    <Ban className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Deprecate Reason Modal */}
      {deprecateModalNode && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              Deprecate Skill Node
            </h4>
            <p className="text-xs text-slate-300">
              Deprecating <span className="font-mono text-indigo-400">{deprecateModalNode}</span> requires an audit reason. Node IDs cannot be renamed or deleted.
            </p>

            <textarea
              value={deprecateReason}
              onChange={(e) => setDeprecateReason(e.target.value)}
              placeholder="Enter mandatory deprecation rationale and migration path..."
              className="w-full h-24 p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeprecateModalNode(null);
                  setDeprecateReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deprecateReason.trim()}
                onClick={() => {
                  if (onDeprecateNode && deprecateModalNode) {
                    onDeprecateNode(deprecateModalNode, deprecateReason);
                  }
                  setDeprecateModalNode(null);
                  setDeprecateReason("");
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50"
              >
                Confirm Deprecation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
