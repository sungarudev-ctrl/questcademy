"use client";

import { useState, useEffect, useCallback } from "react";
import { CoverageReport } from "@/types";

export function useCoverage(frameworkId?: string) {
  const [coverage, setCoverage] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCoverage = useCallback(async () => {
    if (!frameworkId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/coverage/${frameworkId}`, {
        headers: { "X-User-Role": "curriculum_lead" },
      });
      if (!res.ok) throw new Error(`Coverage report error: HTTP ${res.status}`);
      const data = await res.json();
      setCoverage(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching coverage report.");
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    fetchCoverage();
  }, [fetchCoverage]);

  return { coverage, loading, error, refetch: fetchCoverage };
}
