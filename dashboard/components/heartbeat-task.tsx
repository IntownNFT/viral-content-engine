"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, AlertCircle, CheckCircle2 } from "lucide-react";
import type { HeartbeatTaskStatus } from "@/lib/types";

interface HeartbeatTaskCardProps {
  task: HeartbeatTaskStatus;
}

export function HeartbeatTaskCard({ task }: HeartbeatTaskCardProps) {
  const lastRunDisplay = task.lastRun
    ? new Date(task.lastRun).toLocaleString()
    : "Never";

  return (
    <div className="glass-card rounded-xl px-5 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-zinc-800/80">
          <Clock className="h-4 w-4 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-200 capitalize">{task.name}</p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {task.nextWindow} &middot; Every {task.intervalHours}h
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-[11px] text-zinc-500">{lastRunDisplay}</span>
        {task.isDue ? (
          <Badge
            variant="outline"
            className="bg-brand-gold/10 text-brand-gold border-brand-gold/30 text-[11px] font-semibold gap-1"
          >
            <AlertCircle className="h-3 w-3" />
            DUE
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="bg-brand-green/10 text-brand-green border-brand-green/30 text-[11px] font-semibold gap-1"
          >
            <CheckCircle2 className="h-3 w-3" />
            OK
          </Badge>
        )}
      </div>
    </div>
  );
}
