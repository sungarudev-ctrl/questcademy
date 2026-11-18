"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { ItemRenderer } from "@/components/render/ItemRenderer";
import type { AssessmentItem } from "@/types";

interface FrameworkOption {
  framework_id: string;
  name: string;
  country_code: string;
  board: string;
  status: string;
}

const ACTIVE_FRAMEWORKS: FrameworkOption[] = [
  {
    framework_id: "GH-BECE-2024",
    name: "BECE Mathematics",
    country_code: "GH",
    board: "West African Examinations Council (WAEC Ghana)",
    status: "active",
  },
  {
    framework_id: "NG-WAEC-2024",
    name: "WAEC WASSCE Mathematics",
    country_code: "NG",
    board: "West African Examinations Council (WAEC Nigeria)",
    status: "active",
  },
  {
    framework_id: "KE-KCSE-2024",
    name: "KCSE Mathematics",
    country_code: "KE",
    board: "Kenya National Examinations Council (KNEC)",
    status: "active",
  },
];

// Diagnostic placement probe sample items
const PLACEMENT_PROBES: AssessmentItem[] = [
  {
    item_id: "PROBE-01",
    node_id: "MATH.FRAC.EQUIV",
    stem: "Which of the following fractions is equivalent to $\\frac{2}{3}$?",
    type: "mcq_single",
    difficulty_tier: 1,
    difficulty_elo: 1100,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "$\\frac{4}{6}$", correct: true, is_correct: true },
        { id: "B", option_id: "B", content: "$\\frac{3}{4}$", correct: false, is_correct: false },
        { id: "C", option_id: "C", content: "$\\frac{4}{9}$", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "$\\frac{5}{6}$", correct: false, is_correct: false },
      ],
    },
  },
  {
    item_id: "PROBE-02",
    node_id: "MATH.FRAC.ADD_UNLIKE",
    stem: "Calculate the sum of $\\frac{1}{4} + \\frac{1}{2}$ in lowest terms.",
    type: "mcq_single",
    difficulty_tier: 2,
    difficulty_elo: 1200,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "$\\frac{2}{6}$", correct: false, is_correct: false },
        { id: "B", option_id: "B", content: "$\\frac{3}{4}$", correct: true, is_correct: true },
        { id: "C", option_id: "C", content: "$\\frac{2}{4}$", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "$\\frac{5}{8}$", correct: false, is_correct: false },
      ],
    },
  },
  {
    item_id: "PROBE-03",
    node_id: "MATH.ALG.LINEAR_ONE_VAR",
    stem: "Solve for $x$: $3x - 5 = 10$",
    type: "mcq_single",
    difficulty_tier: 2,
    difficulty_elo: 1250,
    authoring_status: "published",
    review_status: "approved",
    payload: {
      options: [
        { id: "A", option_id: "A", content: "$x = 5$", correct: true, is_correct: true },
        { id: "B", option_id: "B", content: "$x = 15$", correct: false, is_correct: false },
        { id: "C", option_id: "C", content: "$x = 3$", correct: false, is_correct: false },
        { id: "D", option_id: "D", content: "$x = \\frac{5}{3}$", correct: false, is_correct: false },
      ],
    },
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { setFramework, setExamDate } = useLearnerStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCountry, setSelectedCountry] = useState<string>("GH");
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string>("GH-BECE-2024");

  // Step 2 Diagnostic Probe state
  const [probeIndex, setProbeIndex] = useState<number>(0);
  const [probeAnswers, setProbeAnswers] = useState<Record<number, string>>({});

  // Step 3 Target Exam Date state
  const [targetDate, setTargetDate] = useState<string>("2026-06-15");

  // Step 1: Framework Selection
  const activeFrameworksForCountry = ACTIVE_FRAMEWORKS.filter(
    (f) => f.country_code === selectedCountry && f.status === "active"
  );

  const handleFrameworkSelect = (fwId: string) => {
    setSelectedFrameworkId(fwId);
  };

  const handleProceedToDiagnostic = () => {
    setFramework(selectedFrameworkId, selectedCountry);
    setStep(2);
  };

  const handleProbeOptionSelect = (optionId: string) => {
    setProbeAnswers((prev) => ({ ...prev, [probeIndex]: optionId }));
  };

  const handleNextProbe = () => {
    if (probeIndex < PLACEMENT_PROBES.length - 1) {
      setProbeIndex((prev) => prev + 1);
    } else {
      // Diagnostic completed, proceed to confirmation
      setStep(3);
    }
  };

  const handleCompleteOnboarding = () => {
    setExamDate(targetDate || null);
    router.push("/learn");
  };

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-8" data-testid="onboarding-flow">
      {/* Header Banner */}
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-xl shadow-indigo-600/20 mb-2">
          <Compass className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          {step === 1 && "Select Your Curriculum"}
          {step === 2 && "Finding Your Starting Point"}
          {step === 3 && "Set Your Target"}
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          {step === 1 && "Choose the curriculum framework and exam board tailored to your region."}
          {step === 2 && "Answer each question naturally. There are no grades or penalties — we are finding the right starting point for your personalized learning path."}
          {step === 3 && "Optionally choose when you plan to write your exam so we can optimize your weekly review schedule."}
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3">
        {[
          { num: 1, label: "Framework" },
          { num: 2, label: "Starting Point" },
          { num: 3, label: "Schedule" },
        ].map((s) => (
          <div key={s.num} className="flex items-center gap-2">
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                step === s.num
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                  : step > s.num
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-800 text-slate-400"
              }`}
            >
              {step > s.num ? "✓" : s.num}
            </span>
            <span className={`text-xs font-medium ${step === s.num ? "text-white" : "text-slate-400"}`}>
              {s.label}
            </span>
            {s.num < 3 && <div className="w-8 h-px bg-slate-800 mx-1" />}
          </div>
        ))}
      </div>

      {/* STEP 1: FRAMEWORK PICKER */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-200">Select Country / Region</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { code: "GH", name: "Ghana 🇬🇭" },
                { code: "NG", name: "Nigeria 🇳🇬" },
                { code: "KE", name: "Kenya 🇰🇪" },
              ].map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(c.code);
                    const match = ACTIVE_FRAMEWORKS.find((f) => f.country_code === c.code);
                    if (match) setSelectedFrameworkId(match.framework_id);
                  }}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    selectedCountry === c.code
                      ? "border-indigo-500 bg-indigo-500/10 text-white font-semibold ring-2 ring-indigo-500/30"
                      : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-200">Active Curriculum Framework</label>
            <div className="space-y-3">
              {activeFrameworksForCountry.map((fw) => (
                <div
                  key={fw.framework_id}
                  onClick={() => handleFrameworkSelect(fw.framework_id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    selectedFrameworkId === fw.framework_id
                      ? "border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                      : "border-slate-800 bg-slate-800/40 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{fw.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Active
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{fw.board}</p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedFrameworkId === fw.framework_id
                          ? "border-indigo-500 bg-indigo-600 text-white"
                          : "border-slate-700"
                      }`}
                    >
                      {selectedFrameworkId === fw.framework_id && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleProceedToDiagnostic}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]"
            >
              <span>Continue to Starting Point Check</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DIAGNOSTIC PLACEMENT CHECK */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-indigo-200 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Diagnostic check in progress · Question {probeIndex + 1} of {PLACEMENT_PROBES.length}</span>
            </div>
            <span className="text-slate-400">No time pressure</span>
          </div>

          <ItemRenderer
            item={PLACEMENT_PROBES[probeIndex]}
            onSelectOption={handleProbeOptionSelect}
          />

          <div className="flex items-center justify-between pt-4">
            <span className="text-xs text-slate-400">
              Your responses help us unlock the concepts that fit you best.
            </span>
            <button
              type="button"
              onClick={handleNextProbe}
              disabled={!probeAnswers[probeIndex]}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold text-sm shadow-lg shadow-indigo-600/20 transition-all"
            >
              <span>{probeIndex < PLACEMENT_PROBES.length - 1 ? "Next Question" : "Complete Starting Point"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: CONFIRM TARGET & EXAM DATE */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Starting Point Calibrated!</h3>
              <p className="text-xs text-slate-300">
                Your learning path is tailored and ready to begin with foundational skills.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-sm font-semibold text-slate-200">
              Target Examination Date (Optional)
            </label>
            <p className="text-xs text-slate-400">
              We use this to distribute your review sessions evenly so you are confident and prepared on exam day.
            </p>
            <div className="relative">
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end">
            <button
              type="button"
              onClick={handleCompleteOnboarding}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all hover:scale-[1.02]"
            >
              <span>Go to My Learning Path</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
