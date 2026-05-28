"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Save, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface SoulEditorProps {
  content: string;
  onRefresh: () => void;
}

export function SoulEditor({ content, onRefresh }: SoulEditorProps) {
  const [text, setText] = useState(content);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setText(content);
  }, [content]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/soul", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      onRefresh();
      toast.success("Soul saved");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLearn = async () => {
    try {
      await fetch("/api/run/learn", { method: "POST" });
      toast.success("Learn pass started — soul.md will update from feedback");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const hasChanges = text !== content;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/50">
        <span className="text-sm font-medium text-zinc-300">soul.md</span>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLearn}
            className="h-8 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/50"
          >
            <Sparkles className="h-3 w-3 mr-1.5" />
            Learn from Feedback
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="h-8 text-xs"
          >
            <Save className="h-3 w-3 mr-1.5" />
            Save
          </Button>
        </div>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="font-mono text-sm min-h-[450px] border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 resize-y"
        placeholder="Your style guide content..."
      />
    </div>
  );
}
