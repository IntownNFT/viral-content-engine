"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { sendFeedback } from "@/hooks/use-feedback";
import type { AbVariationGroup } from "@/lib/types";

interface AbGroupProps {
  group: AbVariationGroup;
  index: number;
}

const variants = [
  { key: "original" as const, label: "Original", tint: "glass-tint-green", dot: "bg-apple-blue", feedbackType: "ab-original" },
  { key: "variationA" as const, label: "Variation A", tint: "glass-tint-purple", dot: "bg-apple-purple", feedbackType: "ab-a" },
  { key: "variationB" as const, label: "Variation B", tint: "glass-tint-gold", dot: "bg-apple-orange", feedbackType: "ab-b" },
];

export function AbGroup({ group, index }: AbGroupProps) {
  const handleCopy = (text: string, feedbackType: string) => {
    navigator.clipboard.writeText(text);
    sendFeedback("copy", feedbackType, text);
    toast.success("Copied");
  };

  return (
    <div className="mb-6">
      <p className="text-[10px] text-gray-2 font-medium mb-3 uppercase tracking-widest">Group {index + 1}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {variants.map((v) => (
          <div
            key={v.key}
            className={`glass-card ${v.tint} rounded-2xl p-4 relative group`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${v.dot} shadow-[0_0_6px_currentColor]`} />
                <span className="text-[11px] font-medium text-gray-1">{v.label}</span>
              </div>
              <button
                className="glass-interactive rounded-lg h-6 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-gray-1 hover:text-white"
                onClick={() => handleCopy(group[v.key], v.feedbackType)}
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
            <p className="text-sm text-[#E5E5EA] leading-relaxed whitespace-pre-wrap">{group[v.key]}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
