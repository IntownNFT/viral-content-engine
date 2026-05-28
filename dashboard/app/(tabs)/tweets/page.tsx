"use client";

import { useContent } from "@/hooks/use-content";
import { ContentCard } from "@/components/content-card";
import { TweetBlock } from "@/components/tweet-block";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

function parseTweets(content: string): string[] {
  return content
    .split(/\n---\n/)
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith("#"));
}

export default function TweetsPage() {
  const { content } = useContent();

  if (!content) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const files = content.tweets;
  const totalTweets = files.reduce((acc, f) => acc + parseTweets(f.content).length, 0);

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center mb-4">
          <MessageSquare className="h-6 w-6 text-gray-2" />
        </div>
        <p className="text-lg font-medium text-gray-1">No tweets generated yet</p>
        <p className="text-sm text-gray-2 mt-1">Click &quot;Generate&quot; or &quot;Daily&quot; to create content</p>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-green">Create</span>
        </div>
        <h2 className="text-xl font-semibold text-white">Generated Tweets</h2>
        <p className="text-sm text-gray-1 mt-0.5">{totalTweets} tweets across {files.length} session{files.length !== 1 ? "s" : ""}</p>
      </div>

      {files.map((file, i) => {
        const tweets = parseTweets(file.content);
        return (
          <ContentCard key={file.name} file={file} defaultOpen={i === 0}>
            {tweets.map((tweet, j) => (
              <TweetBlock key={j} text={tweet} index={j} />
            ))}
          </ContentCard>
        );
      })}
    </div>
  );
}
