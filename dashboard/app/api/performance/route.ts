import { NextResponse } from "next/server";
import { loadPerformanceData, loadAllSelfTweets } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const [matches, selfTweets] = await Promise.all([
    loadPerformanceData(30),
    loadAllSelfTweets(30),
  ]);

  // Score and sort own tweets for top performers list
  const topTweets = selfTweets
    .map((t) => ({
      text: t.text,
      likes: t.likes,
      retweets: t.retweets,
      replies: t.replies,
      views: t.views,
      timestamp: t.timestamp,
      url: t.url,
      score: t.likes + t.retweets * 3 + t.replies * 2,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  return NextResponse.json({ matches, topTweets });
}
