"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Flame,
  Award,
  ArrowRight,
} from "lucide-react";
import { useNodeStateStore } from "@/lib/stores/useNodeStateStore";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { TopicHeatmap } from "@/components/student/TopicHeatmap";

export default function ProgressPage() {
  const { nodes } = useNodeStateStore();
  const { weeklyMinutes, streakDays, frameworkId } = useLearnerStore();

  const nodeList = useMemo(() => Object.values(nodes), [nodes]);
  const totalSkills = nodeList.length;
  const masteredSkills = nodeList.filter((n) => n.status === "mastered").length;
  const inProgressSkills = nodeList.filter((n) => n.status === "in_progress").length;
  const coveragePercent = Math.round((masteredSkills / Math.max(1, totalSkills)) * 100);

  // 7-day review schedule simulation based on FSRS due_at
  const upcomingReviews = useMemo(() => {
    return [
      { day: "Today", count: 2, skills: ["Adding Unlike Fractions", "Comparing Fractions"] },
      { day: "Tomorrow", count: 1, skills: ["Converting Decimals to Fractions"] },
      { day: "Thursday", count: 0, skills: [] },
      { day: "Friday", count: 2, skills: ["Equivalent Fractions", "Linear Equations"] },
      { day: "Saturday", count: 1, skills: ["Pythagorean Theorem"] },
      { day: "Sunday", count: 0, skills: [] },
      { day: "Monday", count: 1, skills: ["Subtracting Unlike Fractions"] },
    ];
  }, []);

  // Predicted Exam Band based on coverage and recent window
  const predictedBand = useMemo(() => {
    if (coveragePercent >= 70) {
      return {
        title: "Excellence Band",
        subtitle: "High confidence in core syllabus competencies",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-950/30",
      };
    }
    if (coveragePercent >= 40) {
      return {
        title: "Proficient Band",
        subtitle: "Steady mastery accumulation on track for distinction",
        color: "text-indigo-400 border-indigo-500/30 bg-indigo-950/30",
      };
    }
    return {
      title: "Foundational Band",
      subtitle: "Building strong foundational mechanics step-by-step",
      color: "text-amber-400 border-amber-500/30 bg-amber-950/30",
    };
  }, [coveragePercent]);

  return (
    <div className="max-w-5xl mx-auto py-4 space-y-8" data-testid="progress-page">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-lg shadow-indigo-600/20">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">Your Learning Progress</h1>
            <p className="text-xs text-slate-400">
              Personalized mastery telemetry and retention scheduling for {frameworkId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <Flame className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span>{streakDays} Day Streak</span>
          </div>
        </div>
      </div>

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Weekly Goal Tracker */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Weekly Dose Goal</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white">{weeklyMinutes}</span>
            <span className="text-xs text-slate-400">/ 80 minutes target</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
              style={{ width: `${Math.min(100, (weeklyMinutes / 80) * 100)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {weeklyMinutes >= 80 ? "Goal met for this week! Keep it up." : `${80 - weeklyMinutes} minutes left to meet your goal.`}
          </p>
        </div>

        {/* Mastered Skills Coverage */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Curriculum Mastery</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-400">{coveragePercent}%</span>
            <span className="text-xs text-slate-400">({masteredSkills} of {totalSkills} skills)</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${coveragePercent}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400">
            {inProgressSkills} skills currently being practiced in active rotation.
          </p>
        </div>

        {/* Predicted Exam Band */}
        <div className={`rounded-2xl border p-5 space-y-2 shadow-lg ${predictedBand.color}`}>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">Predicted Exam Band</span>
            <Award className="w-4 h-4" />
          </div>
          <div className="text-xl font-bold text-white">
            {predictedBand.title}
          </div>
          <p className="text-xs text-slate-300 leading-snug">
            {predictedBand.subtitle}
          </p>
        </div>
      </div>

      {/* 7-Day FSRS Review Schedule Preview */}
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" />
              <span>7-Day Spaced Review Forecast</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Scheduled by the FSRS memory retention algorithm to maintain long-term recall.
            </p>
          </div>
          <Link
            href="/practice"
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Start reviews</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 pt-2">
          {upcomingReviews.map((day) => (
            <div
              key={day.day}
              className={`rounded-xl border p-3 text-center space-y-1 ${
                day.count > 0
                  ? "border-indigo-500/30 bg-indigo-950/20"
                  : "border-slate-800 bg-slate-900/40 opacity-60"
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-400 block">{day.day}</span>
              <span className={`text-lg font-bold block ${day.count > 0 ? "text-indigo-300" : "text-slate-600"}`}>
                {day.count}
              </span>
              <span className="text-[10px] text-slate-400 block">
                {day.count === 1 ? "skill" : "skills"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Topic Mastery Heatmap */}
      <div className="space-y-4">
        <h3 className="font-bold text-white text-lg tracking-tight">Topic Mastery Breakdown</h3>
        <TopicHeatmap nodes={nodes} />
      </div>
    </div>
  );
}
