"use client";

import { useState, useEffect } from "react";
import { GenerationJob } from "@/types";

export function useJobStream(frameworkId?: string) {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryDelay = 1000;
    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    function connect() {
      if (isCancelled) return;

      const url = `/api/admin/jobs/stream${frameworkId ? `?framework_id=${frameworkId}` : ""}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setConnected(true);
        retryDelay = 1000; // reset backoff on successful open
      };

      eventSource.addEventListener("jobs_update", (event: MessageEvent) => {
        try {
          const parsed = JSON.parse(event.data);
          if (Array.isArray(parsed)) {
            setJobs(parsed);
          }
        } catch {
          // ignore malformed payloads
        }
      });

      eventSource.onerror = () => {
        setConnected(false);
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // Exponential backoff capped at 30 seconds
        const nextDelay = Math.min(30000, retryDelay * 2);
        retryDelay = nextDelay;

        if (!isCancelled) {
          timeoutId = setTimeout(connect, nextDelay);
        }
      };
    }

    connect();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (eventSource) eventSource.close();
    };
  }, [frameworkId]);

  return { jobs, connected };
}
