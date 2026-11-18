"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Lightbulb, ArrowRight, Sparkles } from "lucide-react";

export interface PracticeFeedbackBannerProps {
  isCorrect: boolean;
  misconceptionTitle?: string | null;
  misconceptionExplanation?: string | null;
  currentHintTier: number; // 0 = none, 1, 2, 3
  hintText?: string | null;
  onRequestHint: () => void;
  onNext: () => void;
  hintsExhausted?: boolean;
}

export function PracticeFeedbackBanner({
  isCorrect,
  misconceptionTitle,
  misconceptionExplanation,
  currentHintTier,
  hintText,
  onRequestHint,
  onNext,
  hintsExhausted = false,
}: PracticeFeedbackBannerProps): React.ReactElement {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-2xl space-y-4 transition-all animate-in fade-in-50 slide-in-from-bottom-3 ${
        isCorrect
          ? "border-emerald-500/40 bg-emerald-950/40 text-emerald-100"
          : "border-amber-500/40 bg-slate-900/95 text-slate-100"
      }`}
      data-testid="practice-feedback-banner"
    >
      {/* Result Heading */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="font-semibold text-base">
              {isCorrect ? "Spot on! That's correct." : "Let's review this together."}
            </h4>
            <p className="text-xs text-slate-400">
              {isCorrect
                ? "You demonstrated clear mastery of this concept."
                : misconceptionTitle
                ? `Targeted focus: ${misconceptionTitle}`
                : "Check your method and see where the steps diverged."}
            </p>
          </div>
        </div>

        <button
          onClick={onNext}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Misconception targeted explanation */}
      {!isCorrect && misconceptionExplanation && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3.5 text-xs text-amber-200 leading-relaxed space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Common Concept Trap: {misconceptionTitle}</span>
          </div>
          <p>{misconceptionExplanation}</p>
        </div>
      )}

      {/* Hint Reveal Section */}
      {!isCorrect && (
        <div className="space-y-2 pt-1 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {currentHintTier > 0 ? `Hint ${currentHintTier} of 3` : "Need a hint?"}
            </span>
            {!hintsExhausted && currentHintTier < 3 && (
              <button
                type="button"
                onClick={onRequestHint}
                className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
              >
                <Lightbulb className="w-3.5 h-3.5" />
                <span>{currentHintTier === 0 ? "Show Hint 1" : `Show Next Hint (${currentHintTier + 1}/3)`}</span>
              </button>
            )}
          </div>

          {hintText && (
            <div className="rounded-xl bg-slate-800/90 border border-slate-700/80 p-3 text-xs text-slate-200">
              <span className="font-semibold text-indigo-300 block mb-1">
                Tier {currentHintTier} Hint:
              </span>
              <p className="leading-relaxed">{hintText}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
