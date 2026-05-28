"use client";

import { Copy, MessageSquare, ExternalLink, Heart, Repeat2, Eye } from "lucide-react";
import { toast } from "sonner";
import { sendFeedback } from "@/hooks/use-feedback";
import type { TweetCard } from "@/lib/types";

interface XTweetCardProps {
  tweet: TweetCard;
  onThread?: (tweetId: string) => void;
}

export function XTweetCard({ tweet, onThread }: XTweetCardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(tweet.text);
    sendFeedback("copy", "x-research", tweet.text);
    toast.success("Copied");
  };

  return (
    <div className="glass-card rounded-2xl p-4 mb-3 group">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-[#E5E5EA]">@{tweet.username}</span>
          <span className="text-[11px] text-gray-2">{tweet.timeAgo}</span>
        </div>
      </div>

      <p className="text-sm text-[#E5E5EA] whitespace-pre-wrap mb-3 leading-relaxed">{tweet.text}</p>

      <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
        <div className="flex items-center gap-4 text-[11px] text-gray-2">
          <span className="flex items-center gap-1">
            <Heart className="h-3 w-3" /> {tweet.likes}
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 className="h-3 w-3" /> {tweet.retweets}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> {tweet.replies}
          </span>
          {tweet.impressions > 0 && (
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" /> {tweet.impressions.toLocaleString()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onThread && (
            <button
              onClick={() => onThread(tweet.id)}
              className="glass-interactive rounded-lg h-7 px-2.5 text-[11px] font-medium text-gray-1 hover:text-apple-blue inline-flex items-center gap-1"
            >
              <MessageSquare className="h-3 w-3" />
              Thread
            </button>
          )}
          <button
            onClick={handleCopy}
            className="glass-interactive rounded-lg h-7 px-2.5 text-[11px] font-medium text-gray-1 hover:text-white inline-flex items-center gap-1"
          >
            <Copy className="h-3 w-3" />
            Copy
          </button>
          <a
            href={tweet.tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-interactive rounded-lg h-7 px-2.5 text-[11px] font-medium text-gray-1 hover:text-white inline-flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            View
          </a>
        </div>
      </div>
    </div>
  );
}
