"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Pencil, Check, X, Twitter } from "lucide-react";
import { toast } from "sonner";
import { sendFeedback } from "@/hooks/use-feedback";

interface TweetBlockProps {
  text: string;
  index: number;
}

export function TweetBlock({ text, index }: TweetBlockProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);

  const charCount = text.length;
  const isOverLimit = charCount > 280;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    sendFeedback("copy", "tweets", text);
    toast.success("Copied to clipboard");
  };

  const handleSave = () => {
    sendFeedback("edit", "tweets", text, editText);
    setEditing(false);
    toast.success("Edit saved to feedback log");
  };

  const handleCancel = () => {
    setEditText(text);
    setEditing(false);
  };

  return (
    <div className="tweet-preview p-5 mb-3 group">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg glass-interactive text-[11px] font-bold text-gray-1">
            {index + 1}
          </div>
          <div className="flex items-center gap-1.5">
            <Twitter className="h-3 w-3 text-gray-2" />
            <span className="text-[11px] text-gray-2 font-medium">Tweet</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                className="glass-interactive glass-tint-apple-green rounded-lg h-7 px-2.5 text-[11px] font-medium text-apple-green inline-flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="glass-interactive glass-tint-red rounded-lg h-7 px-2.5 text-[11px] font-medium text-apple-red inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCopy}
                className="glass-interactive rounded-lg h-7 px-2.5 text-[11px] font-medium text-gray-1 hover:text-white inline-flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
              <button
                onClick={() => setEditing(true)}
                className="glass-interactive rounded-lg h-7 px-2.5 text-[11px] font-medium text-gray-1 hover:text-white inline-flex items-center gap-1"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {editing ? (
        <Textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          className="font-sans text-sm min-h-[100px] rounded-xl"
          rows={4}
        />
      ) : (
        <p className="text-[14px] leading-[1.7] text-[#E5E5EA] whitespace-pre-wrap">
          {text}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-mono ${isOverLimit ? "text-apple-red" : charCount > 250 ? "text-apple-orange" : "text-gray-2"}`}>
            {charCount}/280
          </span>
          {text.split("\n").length > 3 && (
            <span className="text-[10px] text-gray-2 glass-interactive rounded-md px-2 py-0.5">
              Thread potential
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
