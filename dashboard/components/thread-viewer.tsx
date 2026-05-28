"use client";

import { useState } from "react";
import { XTweetCard } from "./x-tweet-card";
import { Loader2 } from "lucide-react";
import type { TweetCard } from "@/lib/types";

interface ThreadViewerProps {
  tweetId: string;
}

export function ThreadViewer({ tweetId }: ThreadViewerProps) {
  const [tweets, setTweets] = useState<TweetCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useState(() => {
    fetch("/api/research/thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tweetId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setTweets(data.tweets || []);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  });

  if (loading) {
    return (
      <div className="ml-6 border-l-2 border-[#333] pl-4 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-[#666]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="ml-6 border-l-2 border-red-500/30 pl-4 py-2 text-xs text-red-400">
        Thread error: {error}
      </div>
    );
  }

  if (tweets.length === 0) {
    return (
      <div className="ml-6 border-l-2 border-[#333] pl-4 py-2 text-xs text-[#666]">
        No thread found
      </div>
    );
  }

  return (
    <div className="ml-6 border-l-2 border-brand-green/30 pl-4 py-2">
      {tweets.map((tweet) => (
        <XTweetCard key={tweet.id} tweet={tweet} />
      ))}
    </div>
  );
}
