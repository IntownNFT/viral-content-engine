"use client";

import useSWR from "swr";
import type {
  ContentFile,
  AbVariationsData,
  HeartbeatStatus,
  ResearchResult,
  SettingsData,
} from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useContent() {
  const { data, error, mutate } = useSWR<{
    tweets: ContentFile[];
    blogs: ContentFile[];
    reels: ContentFile[];
  }>("/api/content", fetcher);
  return { content: data, error, refreshContent: mutate };
}

export function useAbVariations() {
  const { data, error, mutate } = useSWR<AbVariationsData>("/api/ab-variations", fetcher);
  return { abData: data, error, refreshAb: mutate };
}

export function useCreators() {
  const { data, error, mutate } = useSWR<string[]>("/api/creators", fetcher);
  return { creators: data || [], error, refreshCreators: mutate };
}

export function useSoul() {
  const { data, error, mutate } = useSWR<{ content: string }>("/api/soul", fetcher);
  return { soulContent: data?.content || "", error, refreshSoul: mutate };
}

export function useHeartbeat() {
  const { data, error, mutate } = useSWR<HeartbeatStatus>("/api/heartbeat/status", fetcher);
  return { heartbeat: data, error, refreshHeartbeat: mutate };
}

export function useResearchLatest() {
  const { data, error, mutate } = useSWR<ResearchResult | Record<string, never>>(
    "/api/research/latest",
    fetcher
  );
  const hasData = data && "topic" in data;
  return {
    research: hasData ? (data as ResearchResult) : null,
    error,
    refreshResearch: mutate,
  };
}

export function useSettings() {
  const { data, error, mutate } = useSWR<SettingsData>("/api/settings", fetcher);
  return { settings: data, error, refreshSettings: mutate };
}
