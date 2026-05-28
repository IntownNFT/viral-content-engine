"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X, Plus, User } from "lucide-react";
import { toast } from "sonner";

interface CreatorListProps {
  creators: string[];
  onRefresh: () => void;
}

export function CreatorList({ creators, onRefresh }: CreatorListProps) {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    const h = handle.trim().replace(/^@/, "");
    if (!h) return;
    setLoading(true);
    try {
      await fetch("/api/creators/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: h }),
      });
      setHandle("");
      onRefresh();
      toast.success(`Following @${h}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (h: string) => {
    try {
      await fetch("/api/creators/unfollow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: h }),
      });
      onRefresh();
      toast.success(`Unfollowed @${h}`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      {/* Add form */}
      <div className="flex gap-2 px-5 py-4 border-b border-white/[0.05]">
        <Input
          placeholder="@handle"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={loading}
          className="glass-interactive glass-tint-green rounded-xl h-9 px-3 text-[12px] font-medium text-apple-blue shrink-0 inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-white/[0.03]">
        {creators.map((c) => (
          <div
            key={c}
            className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] group transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl glass-interactive flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-gray-2" />
              </div>
              <span className="text-sm font-mono text-[#E5E5EA]">@{c}</span>
            </div>
            <button
              className="glass-interactive glass-tint-red rounded-lg h-7 w-7 flex items-center justify-center opacity-0 group-hover:opacity-100 text-gray-2 hover:text-apple-red transition-all"
              onClick={() => handleRemove(c)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {creators.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-2">No creators followed yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
