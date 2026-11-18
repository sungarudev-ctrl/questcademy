"use client";

import { useState, useEffect, useCallback } from "react";
import { LocalizationOverride } from "@/types";

export function useLocalizationQueue(frameworkId?: string) {
  const [items, setItems] = useState<LocalizationOverride[]>([]);
  const [contents, setContents] = useState<LocalizationOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/admin/localizations?review_status=pending${
        frameworkId ? `&framework_id=${frameworkId}` : ""
      }`;
      const res = await fetch(url, {
        headers: { "X-User-Role": "reviewer" },
      });
      if (!res.ok) throw new Error(`Localization queue error: HTTP ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setContents(data.contents || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error fetching localization queue.");
    } finally {
      setLoading(false);
    }
  }, [frameworkId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { items, contents, loading, error, refetch: fetchQueue };
}
