"use client";

import { useState, useEffect } from "react";
import { ResearchForm } from "@/components/research-form";
import { XTweetCard } from "@/components/x-tweet-card";
import { ThreadViewer } from "@/components/thread-viewer";
import { useResearchLatest } from "@/hooks/use-content";
import { Search } from "lucide-react";
import type { ResearchResult } from "@/lib/types";

export default function ResearchPage() {
  const { research: latestResearch } = useResearchLatest();
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (latestResearch && !result) {
      setResult(latestResearch);
    }
  }, [latestResearch, result]);

  const handleResult = (res: ResearchResult) => {
    setResult(res);
    setExpandedThreads(new Set());
  };

  const toggleThread = (tweetId: string) => {
    setExpandedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(tweetId)) next.delete(tweetId);
      else next.add(tweetId);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Discover</span>
        <h2 className="text-xl font-semibold text-white mt-1">Research</h2>
        <p className="text-sm text-gray-1 mt-0.5">Search X for trending topics, threads, and inspiration</p>
      </div>

      <div className="glass-card rounded-xl p-5 mb-6">
        <ResearchForm onResult={handleResult} />
      </div>

      {result && (
        <div>
          <div className="mb-4 pb-4 border-b border-gray-5">
            <h3 className="text-lg font-semibold text-white">{result.topic}</h3>
            <p className="text-xs text-gray-1 mt-1">
              {result.totalTweets} tweets across {result.queries.length} queries
              {result.totalCost > 0 && ` · $${result.totalCost.toFixed(3)}`}
            </p>
          </div>

          {result.queries.map((q, qi) => (
            <div key={qi} className="mb-8">
              <h4 className="text-sm font-medium text-gray-1 mb-3 flex items-center gap-2">
                <Search className="h-3.5 w-3.5" />
                &ldquo;{q.query}&rdquo;
                <span className="text-gray-2">({q.count})</span>
              </h4>
              {q.tweets.map((tweet) => (
                <div key={tweet.id}>
                  <XTweetCard tweet={tweet} onThread={toggleThread} />
                  {expandedThreads.has(tweet.id) && <ThreadViewer tweetId={tweet.id} />}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!result && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gray-5/60 flex items-center justify-center mb-4">
            <Search className="h-6 w-6 text-gray-2" />
          </div>
          <p className="text-gray-1">Enter a query above to research topics on X</p>
        </div>
      )}
    </div>
  );
}
