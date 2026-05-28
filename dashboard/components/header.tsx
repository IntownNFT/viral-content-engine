"use client";

import { useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { CommandButton } from "./command-button";
import { useStatusPoll } from "@/hooks/use-status-poll";
import { toast } from "sonner";

interface HeaderProps {
  onRefresh: () => void;
}

export function Header({ onRefresh }: HeaderProps) {
  const handleAllIdle = useCallback(() => {
    onRefresh();
  }, [onRefresh]);

  const { statuses, anyRunning } = useStatusPoll(handleAllIdle);

  const runCommand = async (endpoint: string, body?: object) => {
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      toast.success("Command started");
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  return (
    <header className="sticky top-0 z-30 glass-surface">
      <div className="flex items-center justify-end px-6 py-3">
        <div className="flex items-center gap-2">
          <CommandButton
            label="Scrape"
            description="Scrapes recent tweets from your followed creators using a headless browser. Pulls text, engagement metrics, and media from the last 48 hours."
            status={statuses.scrape}
            onClick={() => runCommand("/api/run/scrape")}
          />
          <CommandButton
            label="Trends"
            description="Scrapes the top 30 trending topics from X/Twitter. These trends are used as context when generating content to keep it timely."
            status={statuses.trends}
            onClick={() => runCommand("/api/run/trends")}
          />
          <CommandButton
            label="Generate"
            description="Uses Claude AI to generate 10 tweets, 1 blog article, and 5 reel scripts based on scraped content and trends. Respects your soul.md style guide."
            status={statuses.generate}
            onClick={() => runCommand("/api/run/generate", { ab: true })}
          />
          <CommandButton
            label="Daily"
            description="Runs the full pipeline: Scrape → Trends → Generate → Learn. One click to refresh everything and produce new content."
            status={statuses.daily}
            onClick={() => runCommand("/api/run/daily", { ab: true })}
            accent
          />

          <div className="w-px h-5 bg-white/[0.06] mx-1" />

          <button
            onClick={onRefresh}
            className="glass-interactive rounded-xl h-8 w-8 flex items-center justify-center text-gray-1 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${anyRunning ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
