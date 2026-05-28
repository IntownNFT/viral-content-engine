"use client";

import { useEffect, useRef, useCallback } from "react";
import useSWR from "swr";
import type { CommandStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useStatusPoll(onAllIdle?: () => void) {
  const { data, mutate } = useSWR<Record<string, CommandStatus>>("/api/status", fetcher, {
    refreshInterval: 0, // Manual control
  });

  const anyRunning = data
    ? Object.values(data).some((s) => s.state === "running")
    : false;

  const wasRunning = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(() => {
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (anyRunning) {
      wasRunning.current = true;
      if (!intervalRef.current) {
        intervalRef.current = setInterval(poll, 2000);
      }
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wasRunning.current) {
        wasRunning.current = false;
        onAllIdle?.();
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [anyRunning, poll, onAllIdle]);

  return { statuses: data || {}, anyRunning, refresh: poll };
}
