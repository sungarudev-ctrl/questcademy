"use client";

import { useState, useEffect, useCallback } from "react";
import { ObjectiveNodeMapProposal } from "@/types";

export function useMappingProposals(frameworkId?: string) {
  const [proposals, setProposals] = useState<ObjectiveNodeMapProposal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!frameworkId) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mappings?framework_id=${frameworkId}`, {
        headers: { "X-User-Role": "curriculum_lead" },
      });
      if (res.ok) {
        const data = await res.json();
        setProposals(Array.isArray(data) ? data : data.proposals || []);
      } else {
        setProposals([]);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching proposals.");
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return { proposals, loading, error, refetch: fetchProposals };
}
