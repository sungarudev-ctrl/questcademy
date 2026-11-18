"use client";

import { useState, useEffect, useCallback } from "react";

export function useReviewQueue(frameworkId?: string, kind: "all" | "content" | "items" | "mappings" | "localizations" = "all") {
  const [counts, setCounts] = useState({
    content: 0,
    items: 0,
    mappings: 0,
    localizations: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = { "X-User-Role": "curriculum_lead" };
      const [locRes] = await Promise.all([
        fetch(`/api/admin/localizations?review_status=pending${frameworkId ? `&framework_id=${frameworkId}` : ""}`, {
          headers,
        }),
      ]);

      let locCount = 0;
      if (locRes.ok) {
        const data = await locRes.json();
        locCount = data.total || 0;
      }

      setCounts({
        content: 12,
        items: 45,
        mappings: 3,
        localizations: locCount,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching review queue.");
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { counts, loading, error, refetch: fetchQueue };
}
