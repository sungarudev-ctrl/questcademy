"use client";

import React from "react";
import Link from "next/link";
import { Lock, CheckCircle2, Clock, RotateCcw, Sparkles, BookOpen, AlertCircle } from "lucide-react";
import type { ClientNodeState } from "@/lib/stores/useNodeStateStore";

export interface LearningPathNodeCardProps {
  node: ClientNodeState;
  prereqTitles?: Record<string, string>; // mapping from nodeId to learner_title
}

export function LearningPathNodeCard({ node, prereqTitles = {} }: LearningPathNodeCardProps): React.ReactElement {
  const isLocked = node.status === "locked";
  const isMastered = node.status === "mastered";
  const isInProgress = node.status === "in_progress";
  const isNeedsReview = node.status === "needs_review" || node.status === "relearning";

  const blockingPrereqNames = node.prerequisites
    .map((pid) => prereqTitles[pid] || pid)
    .join(", ");

  const badgeStyles = {
    locked: "bg-slate-800 text-slate-400 border-slate-700",
    available: "bg-indigo-500/10 text-indigo-300 border-indigo-500/30",
    in_progress: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    mastered: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    needs_review: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    relearning: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  }[node.status] || "bg-slate-800 text-slate-300 border-slate-700";

  const statusLabel = {
    locked: "Locked",
    available: "Ready to start",
    in_progress: "In progress",
    mastered: "Mastered",
    needs_review: "Review due",
    relearning: "Relearning",
  }[node.status];

  const content = (
    <div
      className={`group relative rounded-2xl border p-5 transition-all duration-200 ${
        isLocked
          ? "border-slate-800/80 bg-slate-900/40 opacity-70 cursor-not-allowed"
          : "border-slate-800 bg-slate-900/90 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 cursor-pointer"
      }`}
      data-testid={`node-card-${node.node_id}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles}`}>
              {isMastered && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
              {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
              {isInProgress && <Sparkles className="w-3 h-3 text-amber-400" />}
              {isNeedsReview && <RotateCcw className="w-3 h-3 text-rose-400" />}
              {statusLabel}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {node.est_minutes} min
            </span>
          </div>

          <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition-colors">
            {node.learner_title}
          </h3>

          <p className="text-xs text-slate-400">
            {node.topic}
          </p>
        </div>

        {!isLocked && (
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-slate-800 text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
              <BookOpen className="w-4 h-4" />
            </span>
          </div>
        )}
      </div>

      {isLocked && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-amber-400/90 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Complete <strong>{blockingPrereqNames}</strong> first to unlock</span>
        </div>
      )}
    </div>
  );

  if (isLocked) {
    return content;
  }

  return (
    <Link href={`/learn/node/${encodeURIComponent(node.node_id)}`} className="block">
      {content}
    </Link>
  );
}
