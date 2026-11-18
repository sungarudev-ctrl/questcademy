"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  User,
  Compass,
  Calendar,
  Eye,
  Sliders,
  LogOut,
  CheckCircle2,
  Volume2,
  Sparkles,
} from "lucide-react";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { useAuthStore } from "@/lib/stores/useAuthStore";

export default function ProfilePage() {
  const {
    learnerId,
    frameworkId,
    countryCode,
    examDate,
    preferences,
    setFramework,
    setExamDate,
    updatePreferences,
  } = useLearnerStore();
  const { logout } = useAuthStore();

  const [dateInput, setDateInput] = useState(examDate || "2026-06-15");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveDate = () => {
    setExamDate(dateInput || null);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleFrameworkSwitch = (newFrameworkId: string, newCountryCode: string) => {
    setFramework(newFrameworkId, newCountryCode);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-8" data-testid="profile-page">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Learner Account</h1>
            <p className="text-xs text-slate-400">ID: {learnerId} · Personalized learning settings</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in-50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Preferences saved</span>
          </div>
        )}
      </div>

      {/* Curriculum Framework Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-indigo-400" />
              <span>Active Curriculum Framework</span>
            </h2>
            <p className="text-xs text-slate-400">
              All learning path concepts, topics, and mock exams are aligned with this board.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { id: "GH-BECE-2024", country: "GH", name: "BECE Mathematics (Ghana)" },
            { id: "NG-WAEC-2024", country: "NG", name: "WAEC WASSCE (Nigeria)" },
            { id: "KE-KCSE-2024", country: "KE", name: "KCSE Mathematics (Kenya)" },
          ].map((fw) => (
            <button
              key={fw.id}
              type="button"
              onClick={() => handleFrameworkSwitch(fw.id, fw.country)}
              className={`p-4 rounded-xl border text-left transition-all ${
                frameworkId === fw.id
                  ? "border-indigo-500 bg-indigo-500/10 ring-2 ring-indigo-500/30"
                  : "border-slate-800 bg-slate-800/40 hover:border-slate-700"
              }`}
            >
              <span className="text-xs font-bold text-white block">{fw.name}</span>
              <span className="text-[11px] text-slate-400 mt-1 block">{fw.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Target Examination Date */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-400" />
            <span>Target Exam Date</span>
          </h2>
          <p className="text-xs text-slate-400">
            Helps the FSRS retention engine pace your daily review schedule before exam day.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
          <input
            type="date"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="rounded-xl bg-slate-800/80 border border-slate-700 px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={handleSaveDate}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
          >
            Update Target Date
          </button>
        </div>
      </div>

      {/* Accessibility Preferences */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Eye className="w-4 h-4 text-indigo-400" />
            <span>Accessibility & Visual Ergonomics</span>
          </h2>
          <p className="text-xs text-slate-400">
            Tailor the student interface for high readability and comfort.
          </p>
        </div>

        <div className="space-y-4 pt-2">
          {/* Dyslexia Font Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Dyslexia-friendly Monospace Font</span>
              <span className="text-xs text-slate-400">
                Enhances letter differentiation for improved reading ease.
              </span>
            </div>
            <button
              type="button"
              onClick={() => updatePreferences({ dyslexiaFont: !preferences.dyslexiaFont })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                preferences.dyslexiaFont ? "bg-indigo-600" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  preferences.dyslexiaFont ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Reduced Motion Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Reduced Motion & Animations</span>
              <span className="text-xs text-slate-400">
                Minimizes interface transitions and decorative animations.
              </span>
            </div>
            <button
              type="button"
              onClick={() => updatePreferences({ reducedMotion: !preferences.reducedMotion })}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                preferences.reducedMotion ? "bg-indigo-600" : "bg-slate-700"
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  preferences.reducedMotion ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Text Sizing */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/40 border border-slate-800">
            <div>
              <span className="text-sm font-semibold text-white block">Text Scale</span>
              <span className="text-xs text-slate-400">Scale interface text size for visual comfort.</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { scale: 1.0, label: "100%" },
                { scale: 1.15, label: "115%" },
                { scale: 1.25, label: "125%" },
              ].map((t) => (
                <button
                  key={t.scale}
                  type="button"
                  onClick={() => updatePreferences({ textScale: t.scale })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                    preferences.textScale === t.scale
                      ? "bg-indigo-600 text-white border-indigo-500"
                      : "bg-slate-800 text-slate-300 border-slate-700"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div className="flex items-center justify-between p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
        <div>
          <h3 className="text-sm font-semibold text-white">Sign Out</h3>
          <p className="text-xs text-slate-400">End your session on this browser.</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
