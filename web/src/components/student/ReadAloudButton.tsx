"use client";

import React, { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

export interface ReadAloudButtonProps {
  text: string;
  className?: string;
}

export function ReadAloudButton({ text, className = "" }: ReadAloudButtonProps): React.ReactElement {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true);
    }
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSupported) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel(); // cancel previous
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95; // Slightly slower for comprehension
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) {
    return <></>;
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isSpeaking ? "Stop reading aloud" : "Read text aloud"}
      title={isSpeaking ? "Stop reading" : "Read aloud"}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
        isSpeaking
          ? "bg-indigo-600 text-white border-indigo-500 animate-pulse"
          : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700"
      } ${className}`}
    >
      {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
      <span>{isSpeaking ? "Stop" : "Listen"}</span>
    </button>
  );
}
