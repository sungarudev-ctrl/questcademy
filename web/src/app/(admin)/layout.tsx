"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  GitBranch,
  FileSpreadsheet,
  BookOpen,
  CheckSquare,
  Globe2,
  Cpu,
  BarChart3,
  MapPin,
  ChevronDown,
  Shield,
  Layers,
} from "lucide-react";
import { FrameworkStatusPill } from "@/components/admin/FrameworkStatusPill";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const countryParam = searchParams.get("country") || "GH";
  const [selectedCountry, setSelectedCountry] = useState(countryParam);
  const [selectedFramework, setSelectedFramework] = useState("gh_bece_math_2024");
  const [coveragePct, setCoveragePct] = useState(78.5);
  const [phase, setPhase] = useState("authoring");

  // Keep country in URL search params
  const handleCountryChange = (newCountry: string) => {
    setSelectedCountry(newCountry);
    const params = new URLSearchParams(searchParams.toString());
    params.set("country", newCountry);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const navSections = [
    { label: "Dashboard", href: "/studio", icon: LayoutDashboard },
    { label: "Skill Graph", href: "/studio/skill-graph", icon: GitBranch },
    { label: "Importer Wizard", href: `/studio/frameworks/${selectedFramework}/import`, icon: FileSpreadsheet },
    { label: "Content Review", href: "/studio/content", icon: BookOpen },
    { label: "Item Review", href: "/studio/items", icon: CheckSquare },
    { label: "Mapping Review", href: `/studio/frameworks/${selectedFramework}/mappings`, icon: Layers },
    { label: "Localization", href: "/studio/localization", icon: Globe2 },
    { label: "Jobs Monitor", href: "/studio/jobs", icon: Cpu },
    { label: "Coverage Dashboard", href: `/studio/frameworks/${selectedFramework}/coverage`, icon: BarChart3 },
    { label: "Country Cohorts", href: "/studio/countries", icon: MapPin },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Left Navigation Rail */}
      <aside className="w-64 border-r border-slate-800/80 bg-slate-900/90 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-indigo-500/20 shadow-md">
              Q
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white block">
                ExamGPT Studio
              </span>
              <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">
                Content Operations
              </span>
            </div>
          </div>
        </div>

        {/* Framework & Country Selector */}
        <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/40">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Country
            </label>
            <select
              value={selectedCountry}
              onChange={(e) => handleCountryChange(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="GH">Ghana (GH)</option>
              <option value="NG">Nigeria (NG)</option>
              <option value="KE">Kenya (KE)</option>
              <option value="SL">Sierra Leone (SL)</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Curriculum Framework
            </label>
            <select
              value={selectedFramework}
              onChange={(e) => setSelectedFramework(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="gh_bece_math_2024">gh_bece_math_2024</option>
              <option value="ng_waec_math_2024">ng_waec_math_2024</option>
              <option value="ke_kcse_math_2024">ke_kcse_math_2024</option>
            </select>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navSections.map((nav) => {
            const Icon = nav.icon;
            const isActive = pathname === nav.href;

            return (
              <Link
                key={nav.label}
                href={nav.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{nav.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
            CL
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-white block truncate">Curriculum Lead</span>
            <span className="text-[10px] text-slate-500 block truncate">admin@questcademy.org</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area with Top Bar */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-md border border-slate-700/80">
              {selectedFramework}
            </span>
            <FrameworkStatusPill phase={phase} />
          </div>

          <div className="flex items-center gap-5">
            <div className="text-right">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Live Coverage
              </span>
              <span
                className={`text-sm font-extrabold ${
                  coveragePct >= 80 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {coveragePct.toFixed(1)}% {coveragePct < 80 && "⚠"}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-800" />

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>RBAC Verified</span>
            </div>
          </div>
        </header>

        {/* Main Routed Page */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
