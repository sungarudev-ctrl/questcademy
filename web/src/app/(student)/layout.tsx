"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Sparkles,
  Bot,
  GraduationCap,
  BarChart3,
  User,
  Flame,
  Wifi,
  WifiOff,
  RefreshCw,
  Compass,
} from "lucide-react";
import { useLearnerStore } from "@/lib/stores/useLearnerStore";
import { useSyncStore } from "@/lib/stores/useSyncStore";
import { registerServiceWorker } from "@/lib/pwa/registerServiceWorker";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { frameworkId, countryCode, streakDays, preferences } = useLearnerStore();
  const { isOnline, pendingAttempts, isSyncing, replayQueue } = useSyncStore();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  const navItems = [
    { href: "/learn", label: "Learn", icon: BookOpen },
    { href: "/practice", label: "Practice", icon: Sparkles },
    { href: "/tutor", label: "AI Tutor", icon: Bot },
    { href: "/tests", label: "Mock Exams", icon: GraduationCap },
    { href: "/progress", label: "Progress", icon: BarChart3 },
  ];

  return (
    <div
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white ${
        preferences.dyslexiaFont ? "font-mono" : "font-sans"
      } ${preferences.reducedMotion ? "motion-reduce" : ""}`}
      style={{ fontSize: `${preferences.textScale * 100}%` }}
    >
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Pinned Framework */}
          <div className="flex items-center gap-3.5">
            <Link href="/learn" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white group-hover:text-indigo-300 transition-colors">
                Questcademy
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-800">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {frameworkId} ({countryCode})
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Status Actions: Streak, Sync & Profile */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Daily Streak */}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold"
              title={`${streakDays} Day Learning Streak!`}
            >
              <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>{streakDays}d streak</span>
            </div>

            {/* Offline / Online Sync status indicator */}
            {isOnline ? (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                title="Online - Attempt sync active"
              >
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Online</span>
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium"
                title={`${pendingAttempts.length} attempts queued locally`}
              >
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span>Offline ({pendingAttempts.length})</span>
              </div>
            )}

            {/* Pending attempts sync button if any queued */}
            {pendingAttempts.length > 0 && isOnline && (
              <button
                onClick={() => replayQueue()}
                disabled={isSyncing}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
                title="Sync offline attempts now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Sync</span>
              </button>
            )}

            {/* Profile Avatar */}
            <Link
              href="/profile"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-white transition-colors"
              aria-label="Learner Profile & Accessibility Preferences"
            >
              <User className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Mobile Sub-Navigation Bar */}
        <div className="lg:hidden flex items-center justify-around border-t border-slate-800/80 px-2 py-1.5 bg-slate-950">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isActive ? "text-indigo-400 font-semibold" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-400">
        <p>Questcademy Student Learning Platform · Focused on Mastery & Growth</p>
      </footer>
    </div>
  );
}
