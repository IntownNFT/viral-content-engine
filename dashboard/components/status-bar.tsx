"use client";

import type { CommandStatus } from "@/lib/types";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface StatusBarProps {
  statuses: Record<string, CommandStatus>;
}

export function StatusBar({ statuses }: StatusBarProps) {
  const entries = Object.entries(statuses);
  const activeEntries = entries.filter(([, s]) => s.state !== "idle");
  if (activeEntries.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-6 py-2 glass-surface border-t-0">
      <span className="text-[10px] text-gray-2 font-medium uppercase tracking-widest mr-1">Status</span>
      {activeEntries.map(([name, s]) => (
        <div
          key={name}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium ${
            s.state === "running"
              ? "glass-tint-gold text-apple-orange"
              : s.state === "complete"
              ? "glass-tint-apple-green text-apple-green"
              : "glass-tint-red text-apple-red"
          }`}
        >
          {s.state === "running" && <Loader2 className="h-3 w-3 animate-spin" />}
          {s.state === "complete" && <CheckCircle2 className="h-3 w-3" />}
          {s.state === "error" && <AlertCircle className="h-3 w-3" />}
          {name}
        </div>
      ))}
    </div>
  );
}
