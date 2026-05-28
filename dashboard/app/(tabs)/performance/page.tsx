"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Heart, Repeat2, MessageCircle, Eye, ArrowUpRight } from "lucide-react";

interface TopTweet {
  text: string;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  timestamp: string;
  url: string;
  score: number;
}

interface PerformanceMatch {
  generatedText: string;
  postedText: string;
  similarity: number;
  likes: number;
  retweets: number;
  replies: number;
  views: number;
  postedAt: string;
}

interface PerformanceData {
  matches: PerformanceMatch[];
  topTweets: TopTweet[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(ts: string): string {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/performance")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const hasTopTweets = data && data.topTweets.length > 0;
  const hasMatches = data && data.matches.length > 0;

  if (!hasTopTweets && !hasMatches) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-5/60 flex items-center justify-center mb-4">
          <BarChart3 className="h-6 w-6 text-gray-2" />
        </div>
        <p className="text-lg font-medium text-gray-1">No performance data yet</p>
        <p className="text-sm text-gray-2 mt-1">
          Set your handle in Settings, then run Scrape to collect your tweets
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Analytics</span>
        <h2 className="text-xl font-semibold text-white mt-1">Performance</h2>
        <p className="text-sm text-gray-1 mt-0.5">
          Your tweet performance and generated-to-posted matches
        </p>
      </div>

      {/* Top Own Tweets */}
      {hasTopTweets && (
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-[#E5E5EA] mb-3">Your Top Tweets</h3>
          <div className="space-y-2">
            {data!.topTweets.map((tweet, i) => (
              <Card key={i}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[#F5F5F7] leading-relaxed line-clamp-3">
                        {tweet.text}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-apple-red">
                          <Heart className="h-3 w-3" />
                          {formatNumber(tweet.likes)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-apple-green">
                          <Repeat2 className="h-3 w-3" />
                          {formatNumber(tweet.retweets)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-apple-blue">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(tweet.replies)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-2">
                          <Eye className="h-3 w-3" />
                          {formatNumber(tweet.views)}
                        </span>
                        {tweet.timestamp && (
                          <span className="text-[10px] text-gray-3">{timeAgo(tweet.timestamp)}</span>
                        )}
                      </div>
                    </div>
                    {tweet.url && (
                      <a
                        href={tweet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 glass-interactive rounded-lg h-7 w-7 flex items-center justify-center text-gray-2 hover:text-white"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Generated → Posted Matches */}
      {hasMatches && (
        <div>
          <h3 className="text-sm font-semibold text-[#E5E5EA] mb-3">
            Generated → Posted Matches
          </h3>
          <div className="space-y-3">
            {data!.matches
              .sort((a, b) => b.similarity - a.similarity)
              .map((match, i) => (
                <Card key={i}>
                  <CardContent className="py-3 px-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-2">
                          Generated
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-1 leading-relaxed line-clamp-3">
                        {match.generatedText}
                      </p>
                    </div>
                    <div className="divider-glass" />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-apple-blue">
                          Posted
                        </span>
                        <span className="glass-tint-green rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-apple-green">
                          {Math.round(match.similarity * 100)}% match
                        </span>
                      </div>
                      <p className="text-[13px] text-[#F5F5F7] leading-relaxed line-clamp-3">
                        {match.postedText}
                      </p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="inline-flex items-center gap-1 text-[11px] text-apple-red">
                          <Heart className="h-3 w-3" />
                          {formatNumber(match.likes)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-apple-green">
                          <Repeat2 className="h-3 w-3" />
                          {formatNumber(match.retweets)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-apple-blue">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(match.replies)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-2">
                          <Eye className="h-3 w-3" />
                          {formatNumber(match.views)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
