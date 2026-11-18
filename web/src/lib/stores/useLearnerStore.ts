import { create } from "zustand";

export interface LearnerPreferences {
  dyslexiaFont: boolean;
  reducedMotion: boolean;
  textScale: number;
  readAloudAudio: boolean;
}

interface LearnerState {
  learnerId: string;
  frameworkId: string;
  countryCode: string;
  examDate: string | null;
  streakDays: number;
  weeklyMinutes: number;
  preferences: LearnerPreferences;

  setFramework: (frameworkId: string, countryCode: string) => void;
  setExamDate: (date: string | null) => void;
  updatePreferences: (prefs: Partial<LearnerPreferences>) => void;
  addMinutes: (mins: number) => void;
  setStreak: (days: number) => void;
}

export const useLearnerStore = create<LearnerState>((set) => ({
  learnerId: "learner-demo-01",
  frameworkId: "GH-BECE-2024",
  countryCode: "GH",
  examDate: "2026-06-15",
  streakDays: 4,
  weeklyMinutes: 65,
  preferences: {
    dyslexiaFont: false,
    reducedMotion: false,
    textScale: 1.0,
    readAloudAudio: true,
  },

  setFramework: (frameworkId: string, countryCode: string) =>
    set({ frameworkId, countryCode }),

  setExamDate: (examDate: string | null) =>
    set({ examDate }),

  updatePreferences: (prefs: Partial<LearnerPreferences>) =>
    set((state) => ({ preferences: { ...state.preferences, ...prefs } })),

  addMinutes: (mins: number) =>
    set((state) => ({ weeklyMinutes: state.weeklyMinutes + mins })),

  setStreak: (streakDays: number) =>
    set({ streakDays }),
}));
