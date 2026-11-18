"use client";

import React from "react";
import type { ClientNodeState } from "@/lib/stores/useNodeStateStore";

export interface TopicHeatmapProps {
  nodes: Record<string, ClientNodeState>;
}

export function TopicHeatmap({ nodes }: TopicHeatmapProps): React.ReactElement {
  const nodeList = Object.values(nodes);

  // Group by topic
  const topicsMap: Record<string, ClientNodeState[]> = {};
  for (const node of nodeList) {
    if (!topicsMap[node.topic]) {
      topicsMap[node.topic] = [];
    }
    topicsMap[node.topic].push(node);
  }

  const topicEntries = Object.entries(topicsMap);

  return (
    <div className="space-y-6" data-testid="topic-heatmap">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {topicEntries.map(([topicName, topicNodes]) => {
          const total = topicNodes.length;
          const mastered = topicNodes.filter((n) => n.status === "mastered").length;
          const inProgress = topicNodes.filter((n) => n.status === "in_progress").length;
          const reviewDue = topicNodes.filter(
            (n) => n.status === "needs_review" || n.status === "relearning"
          ).length;
          const ready = topicNodes.filter((n) => n.status === "available").length;

          const pct = Math.round((mastered / Math.max(1, total)) * 100);

          return (
            <div
              key={topicName}
              className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-white text-base">{topicName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {mastered} of {total} skills mastered
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {pct}% coverage
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden flex">
                <div
                  style={{ width: `${(mastered / total) * 100}%` }}
                  className="bg-emerald-500 transition-all"
                  title="Mastered"
                />
                <div
                  style={{ width: `${(inProgress / total) * 100}%` }}
                  className="bg-amber-500 transition-all"
                  title="In progress"
                />
                <div
                  style={{ width: `${(reviewDue / total) * 100}%` }}
                  className="bg-rose-500 transition-all"
                  title="Review due"
                />
                <div
                  style={{ width: `${(ready / total) * 100}%` }}
                  className="bg-indigo-500/50 transition-all"
                  title="Ready to start"
                />
              </div>

              {/* Node Cells Heatmap Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 pt-1">
                {topicNodes.map((n) => {
                  const cellColor = {
                    mastered: "bg-emerald-500 hover:bg-emerald-400 text-emerald-950",
                    in_progress: "bg-amber-500 hover:bg-amber-400 text-amber-950",
                    needs_review: "bg-rose-500 hover:bg-rose-400 text-rose-950",
                    relearning: "bg-purple-500 hover:bg-purple-400 text-purple-950",
                    available: "bg-indigo-500/40 hover:bg-indigo-400 text-white",
                    locked: "bg-slate-800 hover:bg-slate-700 text-slate-500",
                  }[n.status];

                  return (
                    <div
                      key={n.node_id}
                      title={`${n.learner_title} (${n.status})`}
                      className={`h-8 rounded-lg ${cellColor} flex items-center justify-center text-[10px] font-bold cursor-pointer transition-transform hover:scale-105 shadow-sm`}
                    >
                      {n.learner_title.slice(0, 3).toUpperCase()}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 p-4 rounded-xl bg-slate-900/40 border border-slate-800/80">
        <span className="text-slate-300 font-medium">Status Key:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Mastered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> In progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Review due
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500/50 inline-block" /> Ready to start
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 inline-block" /> Locked
        </span>
      </div>
    </div>
  );
}
