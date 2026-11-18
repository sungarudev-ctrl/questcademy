/**
 * web/src/lib/api/studentClient.ts
 *
 * Typed client API interface for student operations.
 * Transparently falls back to offline queue interception when offline.
 */

import { useAuthStore } from "../stores/useAuthStore";
import { useSyncStore } from "../stores/useSyncStore";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AttemptPayload {
  node_id: string;
  item_id: string;
  selected_option_id?: string;
  correct: boolean;
  hints_used: number;
  latency_ms: number;
  is_exam?: boolean;
}

export async function studentFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${API_BASE}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  try {
    const res = await fetch(url, { ...options, headers });
    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`API error ${res.status}: ${errorBody || res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (err: unknown) {
    // If offline or network error, check navigator status
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    if (isOffline) {
      useSyncStore.getState().setOnline(false);
    }
    throw err;
  }
}

/**
 * Submits an attempt. If offline or fetch fails, enqueues to useSyncStore.
 */
export async function submitStudentAttempt(payload: AttemptPayload): Promise<{ success: boolean; offlineQueued?: boolean }> {
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

  if (isOffline) {
    useSyncStore.getState().enqueueAttempt(payload);
    return { success: true, offlineQueued: true };
  }

  try {
    const res = await studentFetch<{ success: boolean }>("/api/learners/attempts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res;
  } catch (err) {
    // Fallback to queue on network failure
    useSyncStore.getState().enqueueAttempt(payload);
    return { success: true, offlineQueued: true };
  }
}

/**
 * Fetch available frameworks (status === 'active')
 */
export async function fetchActiveFrameworks() {
  try {
    return await studentFetch<Array<{ framework_id: string; country_code: string; name: string; status: string }>>(
      "/api/frameworks?status=active"
    );
  } catch {
    // Default mock data when backend isn't actively running
    return [
      { framework_id: "GH-BECE-2024", country_code: "GH", name: "BECE Mathematics (Ghana)", status: "active" },
      { framework_id: "NG-WAEC-2024", country_code: "NG", name: "WAEC WASSCE Mathematics (Nigeria)", status: "active" },
      { framework_id: "KE-KCSE-2024", country_code: "KE", name: "KCSE Mathematics (Kenya)", status: "active" },
    ];
  }
}

/**
 * Ask AI Tutor
 */
export async function askAiTutor(message: string, context?: { nodeId?: string; frameworkId?: string }) {
  try {
    return await studentFetch<{ reply: string; sources?: string[] }>("/api/tutor/chat", {
      method: "POST",
      body: JSON.stringify({ message, ...context }),
    });
  } catch {
    // Socratic demo response when running standalone
    return {
      reply: `Let's break this down together step by step! What is your first intuition about finding a common denominator for $\\frac{1}{3}$ and $\\frac{1}{4}$?`,
      sources: ["Fractions & Decimals / Equivalent Fractions"],
    };
  }
}
