"use client";

import { useState, useEffect, useCallback } from "react";

export interface CostBreakdown {
  total_calls: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  by_pipeline: Record<string, { calls: number; cost_usd: number }>;
  by_framework: Record<string, { calls: number; cost_usd: number }>;
}

export function useCostReport(frameworkId?: string) {
  const [costReport, setCostReport] = useState<CostBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCost = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/costs${frameworkId ? `?framework_id=${frameworkId}` : ""}`;
      const res = await fetch(url, {
        headers: { "X-User-Role": "curriculum_lead" },
      });
      if (!res.ok) throw new Error(`Cost report error: HTTP ${res.status}`);
      const data = await res.json();
      setCostReport(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching cost report.");
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    fetchCost();
  }, [fetchCost]);

  return { costReport, loading, error, refetch: fetchCost };
}
