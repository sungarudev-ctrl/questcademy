"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  Sparkles,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
} from "lucide-react";
import { useNodeStateStore } from "@/lib/stores/useNodeStateStore";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { LearningPathNodeCard } from "@/components/student/LearningPathNodeCard";

export default function LearnPage() {
  const { nodes } = useNodeStateStore();
  const { weeklyMinutes, frameworkId, countryCode } = useLearnerStore();

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);

  // Map of node_id -> learner_title for prerequisite descriptions
  const prereqTitles = useMemo(() => {
    const map: Record<string, string> = {};
    for (const node of nodeList) {
      map[node.node_id] = node.learner_title;
    }
    return map;
  }, [nodeList]);

  // Group by topic
  const topics = useMemo(() => {
    const groups: Record<string, typeof nodeList> = {};
    for (const node of nodeList) {
      if (!groups[node.topic]) {
        groups[node.topic] = [];
      }
      groups[node.topic].push(node);
    }

    // Sort nodes inside each topic: review-due -> in_progress -> available -> mastered -> locked
    const statusPriority: Record<string, number> = {
      needs_review: 1,
      relearning: 2,
      in_progress: 3,
      available: 4,
      mastered: 5,
      locked: 6,
    };

    for (const topic of Object.keys(groups)) {
      groups[topic].sort((a, b) => (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99));
    }

    return groups;
  }, [nodeList]);

  // Overall totals
  const totalSkills = nodeList.length;
  const masteredCount = nodeList.filter((n) => n.status === "mastered").length;
  const inProgressCount = nodeList.filter((n) => n.status === "in_progress").length;
  const reviewsDueCount = nodeList.filter(
    (n) => n.status === "needs_review" || n.status === "relearning"
  ).length;

  // Find next recommended active node
  const nextRecommendedNode = useMemo(() => {
    return (
      nodeList.find((n) => n.status === "needs_review") ||
      nodeList.find((n) => n.status === "in_progress") ||
      nodeList.find((n) => n.status === "available") ||
      nodeList[0]
    );
  }, [nodeList]);

  return (
    <div className="space-y-8" data-testid="learn-page">
      {/* Hero Recommendation Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-purple-950/40 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Recommended Next Step</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {nextRecommendedNode ? nextRecommendedNode.learner_title : "Welcome to Your Learning Path"}
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              {nextRecommendedNode?.status === "needs_review"
                ? "Time for a quick spaced-retrieval review to lock this skill into long-term memory!"
                : "Master foundational concepts step-by-step with interactive explanations and instant practice."}
            </p>
          </div>

          {nextRecommendedNode && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
              <Link
                href={`/learn/node/${encodeURIComponent(nextRecommendedNode.node_id)}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <BookOpen className="w-4 h-4" />
                <span>Study Concept</span>
              </Link>

              <Link
                href={`/practice/${encodeURIComponent(nextRecommendedNode.node_id)}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-semibold text-sm transition-all"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Jump to Practice</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Weekly Goal</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-white">{weeklyMinutes} / 80 min</p>
          <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-2">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (weeklyMinutes / 80) * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Mastered Skills</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400">
            {masteredCount} <span className="text-xs text-slate-500 font-normal">/ {totalSkills}</span>
          </p>
          <span className="text-[11px] text-slate-400">Permanent mastery retention</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>In Progress</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-300">{inProgressCount}</p>
          <span className="text-[11px] text-slate-400">Active learning frontier</span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Reviews Due</span>
            <RotateCcw className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-rose-300">{reviewsDueCount}</p>
          <span className="text-[11px] text-slate-400">Scheduled by FSRS retention engine</span>
        </div>
      </div>

      {/* Curriculum Topics Section */}
      <div className="space-y-8">
        {Object.entries(topics).map(([topicName, topicNodes]) => (
          <div key={topicName} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">{topicName}</h2>
                <p className="text-xs text-slate-400">
                  {topicNodes.filter((n) => n.status === "mastered").length} of {topicNodes.length} skills mastered
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicNodes.map((node) => (
                <LearningPathNodeCard
                  key={node.node_id}
                  node={node}
                  prereqTitles={prereqTitles}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
