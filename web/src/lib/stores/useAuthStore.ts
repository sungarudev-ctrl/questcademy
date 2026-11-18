import { create } from "zustand";

interface AuthState {
  token: string | null;
  learnerId: string | null;
  isAuthenticated: boolean;
  role: string;
  login: (token: string, learnerId: string, role?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== "undefined" ? localStorage.getItem("quest_auth_token") : null,
  learnerId: typeof window !== "undefined" ? localStorage.getItem("quest_learner_id") : "learner-demo-01",
  isAuthenticated: true, // Demo/default active
  role: "learner",

  login: (token: string, learnerId: string, role = "learner") => {
    if (typeof window !== "undefined") {
      localStorage.setItem("quest_auth_token", token);
      localStorage.setItem("quest_learner_id", learnerId);
    }
    set({ token, learnerId, isAuthenticated: true, role });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("quest_auth_token");
      localStorage.removeItem("quest_learner_id");
    }
    set({ token: null, learnerId: null, isAuthenticated: false, role: "anonymous" });
  },
}));
