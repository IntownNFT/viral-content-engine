"use client";

import { Loader2 } from "lucide-react";
import type { CommandStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CommandButtonProps {
  label: string;
  description?: string;
  status?: CommandStatus;
  onClick: () => void;
  className?: string;
  accent?: boolean;
}

export function CommandButton({ label, description, status, onClick, className, accent }: CommandButtonProps) {
  const state = status?.state || "idle";
  const isRunning = state === "running";
  const isError = state === "error";
  const isComplete = state === "complete";

  return (
    <div className="relative group/tip">
      <button
        onClick={onClick}
        disabled={isRunning}
        className={cn(
          "glass-interactive rounded-xl text-[12px] font-medium h-8 px-4 inline-flex items-center gap-1.5 disabled:opacity-50",
          !accent && "text-gray-1 hover:text-white",
          accent && "glass-tint-green text-apple-blue font-semibold hover:text-apple-blue",
          isRunning && "status-pulse glass-tint-gold text-apple-orange",
          isError && "glass-tint-red text-apple-red",
          isComplete && "glass-tint-apple-green text-apple-green",
          className
        )}
      >
        {isRunning && <Loader2 className="h-3 w-3 animate-spin" />}
        {label}
      </button>

      {description && (
        <div className="absolute top-full right-0 mt-2 w-64 opacity-0 invisible group-hover/tip:opacity-100 group-hover/tip:visible transition-all duration-200 z-50 pointer-events-none">
          <div className="bg-[#2C2C2E] border border-white/[0.1] rounded-xl p-3 shadow-lg shadow-black/40">
            <p className="text-[11px] font-semibold text-[#F5F5F7] mb-1">{label}</p>
            <p className="text-[11px] text-gray-1 leading-relaxed">{description}</p>
          </div>
        </div>
      )}
    </div>
  );
}
