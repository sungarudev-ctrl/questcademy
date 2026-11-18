"use client";

import { useState, useEffect } from "react";
import { CurriculumFramework, FrameworkRollout } from "@/types";

export function useFramework(frameworkId?: string) {
  const [framework, setFramework] = useState<CurriculumFramework | null>(null);
  const [rollout, setRollout] = useState<FrameworkRollout | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!frameworkId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    async function fetchFrameworkData() {
      try {
        const [fwRes, rolloutRes] = await Promise.all([
          fetch(`/api/frameworks/${frameworkId}`, {
            headers: { "X-User-Role": "curriculum_lead" },
          }),
          fetch(`/api/admin/frameworks/${frameworkId}/rollout`, {
            headers: { "X-User-Role": "curriculum_lead" },
          }),
        ]);

        if (!fwRes.ok || !rolloutRes.ok) {
          throw new Error("Failed to load framework and rollout metadata.");
        }

        const fwData = await fwRes.json();
        const rolloutData = await rolloutRes.json();

        if (isMounted) {
          setFramework(fwData);
          setRollout(rolloutData);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error fetching framework data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchFrameworkData();

    return () => {
      isMounted = false;
    };
  }, [frameworkId]);

  return { framework, rollout, loading, error };
}
