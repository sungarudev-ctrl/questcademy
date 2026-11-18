"use client";

import React, { useEffect, useState } from "react";
import { Clock, AlertCircle } from "lucide-react";

export interface MockExamTimerProps {
  totalSeconds: number;
  onTimeUp: () => void;
  className?: string;
}

export function MockExamTimer({ totalSeconds, onTimeUp, className = "" }: MockExamTimerProps): React.ReactElement {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remaining, onTimeUp]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const isWarning = remaining < 300; // < 5 mins

  return (
    <div
      role="timer"
      aria-live="polite"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-mono font-semibold transition-colors ${
        isWarning
          ? "bg-rose-500/10 border-rose-500/30 text-rose-300 animate-pulse"
          : "bg-slate-800/90 border-slate-700 text-indigo-300"
      } ${className}`}
      data-testid="exam-timer"
    >
      {isWarning ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <Clock className="w-4 h-4 text-indigo-400" />}
      <span>
        {hours > 0 ? `${hours.toString().padStart(2, "0")}:` : ""}
        {minutes.toString().padStart(2, "0")}:{seconds.toString().padStart(2, "0")}
      </span>
      {isWarning && <span className="text-[11px] font-sans text-rose-400 font-normal">Remaining</span>}
    </div>
  );
}
