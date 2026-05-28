"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { ResearchResult } from "@/lib/types";

interface ResearchFormProps {
  onResult: (result: ResearchResult) => void;
}

export function ResearchForm({ onResult }: ResearchFormProps) {
  const [query, setQuery] = useState("");
  const [quick, setQuick] = useState(false);
  const [minLikes, setMinLikes] = useState("0");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
          quick,
          minLikes: parseInt(minLikes) || 0,
        }),
      });
      const data = await res.json();
      if (data.error) {
        toast.error(data.error);
      } else {
        onResult(data.result);
        toast.success(`Found ${data.result.totalTweets} results`);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 mb-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-[11px] text-zinc-500 mb-1.5">Search query</Label>
          <Input
            placeholder="e.g. content repurposing strategies"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="bg-white/[0.02] border-white/[0.06]"
          />
        </div>

        <div className="w-24">
          <Label className="text-[11px] text-zinc-500 mb-1.5">Min likes</Label>
          <Input
            type="number"
            value={minLikes}
            onChange={(e) => setMinLikes(e.target.value)}
            min="0"
            className="bg-white/[0.02] border-white/[0.06]"
          />
        </div>

        <label className="flex items-center gap-1.5 text-[12px] text-zinc-500 pb-2">
          <Checkbox checked={quick} onCheckedChange={(v) => setQuick(!!v)} />
          Quick
        </label>

        <button
          onClick={handleSubmit}
          disabled={loading || !query.trim()}
          className="glass-interactive glass-tint-green rounded-xl h-9 px-4 text-[12px] font-medium text-brand-green inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          Research
        </button>
      </div>
    </div>
  );
}
