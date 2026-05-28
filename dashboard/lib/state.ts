import type { CommandStatus, ResearchResult } from "./types";

const statuses: Record<string, CommandStatus> = {
  scrape: { state: "idle" },
  generate: { state: "idle" },
  daily: { state: "idle" },
  trends: { state: "idle" },
  learn: { state: "idle" },
  research: { state: "idle" },
};

let latestResearch: ResearchResult | null = null;

export function getStatuses(): Record<string, CommandStatus> {
  return { ...statuses };
}

export function getLatestResearch(): ResearchResult | null {
  return latestResearch;
}

export function setLatestResearch(result: ResearchResult): void {
  latestResearch = result;
}

export function getStatus(name: string): CommandStatus {
  return statuses[name] || { state: "idle" };
}

export function setStatus(name: string, status: CommandStatus): void {
  statuses[name] = status;
}

export async function runCommand(name: string, fn: () => Promise<void>): Promise<void> {
  if (statuses[name]?.state === "running") {
    throw new Error(`${name} is already running`);
  }
  statuses[name] = { state: "running", startedAt: new Date().toISOString() };
  try {
    await fn();
    statuses[name] = {
      state: "complete",
      startedAt: statuses[name].startedAt,
      completedAt: new Date().toISOString(),
    };
  } catch (e: any) {
    statuses[name] = {
      state: "error",
      startedAt: statuses[name].startedAt,
      completedAt: new Date().toISOString(),
      error: e.message || String(e),
    };
    throw e;
  }
}
