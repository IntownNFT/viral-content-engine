import type { XTweet, XUser } from "./x-api.js";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function engagementLabel(t: XTweet): string {
  const parts: string[] = [];
  if (t.metrics.likes > 0) parts.push(`${t.metrics.likes} likes`);
  if (t.metrics.retweets > 0) parts.push(`${t.metrics.retweets} RTs`);
  if (t.metrics.replies > 0) parts.push(`${t.metrics.replies} replies`);
  if (t.metrics.impressions > 0) parts.push(`${t.metrics.impressions.toLocaleString()} views`);
  return parts.join(", ");
}

export function formatTweetMarkdown(t: XTweet): string {
  return `> **@${t.username}** — ${timeAgo(t.createdAt)}\n> ${t.text.replace(/\n/g, "\n> ")}\n>\n> ${engagementLabel(t)} — [link](${t.tweetUrl})`;
}

export function formatResultsMarkdown(tweets: XTweet[], query: string, cost: number): string {
  let md = `## Research: "${query}"\n\n`;
  md += `_${tweets.length} results | Est. cost: $${cost.toFixed(3)}_\n\n`;

  if (tweets.length === 0) {
    md += "_No results found._\n";
    return md;
  }

  for (let i = 0; i < tweets.length; i++) {
    md += `### ${i + 1}. @${tweets[i].username}\n\n`;
    md += formatTweetMarkdown(tweets[i]) + "\n\n";
  }

  return md;
}

export function formatProfileMarkdown(user: XUser, tweets: XTweet[]): string {
  let md = `## @${user.username} (${user.name})\n\n`;
  md += `${user.description}\n\n`;
  md += `**${user.followersCount.toLocaleString()}** followers · **${user.followingCount.toLocaleString()}** following · **${user.tweetCount.toLocaleString()}** tweets\n\n`;

  if (tweets.length > 0) {
    md += `### Recent tweets (last 7 days)\n\n`;
    for (const t of tweets) {
      md += formatTweetMarkdown(t) + "\n\n";
    }
  }

  return md;
}

export function formatResearchBriefing(
  topic: string,
  sections: { query: string; tweets: XTweet[] }[],
  totalCost: number
): string {
  const date = new Date().toISOString().slice(0, 10);
  let md = `# Research Briefing: ${topic}\n\n`;
  md += `_Generated: ${date} | Queries: ${sections.length} | Est. cost: $${totalCost.toFixed(3)}_\n\n---\n\n`;

  for (const section of sections) {
    md += `## "${section.query}"\n\n`;
    if (section.tweets.length === 0) {
      md += "_No results._\n\n";
      continue;
    }
    for (const t of section.tweets.slice(0, 10)) {
      md += `- **@${t.username}** (${engagementLabel(t)}): "${t.text.slice(0, 200)}${t.text.length > 200 ? "..." : ""}" — [link](${t.tweetUrl})\n`;
    }
    md += "\n";
  }

  return md;
}

// ---- JSON-safe versions for the API/dashboard ----

export interface TweetCard {
  id: string;
  username: string;
  name: string;
  text: string;
  timeAgo: string;
  likes: number;
  retweets: number;
  replies: number;
  impressions: number;
  tweetUrl: string;
  createdAt: string;
}

export function toTweetCard(t: XTweet): TweetCard {
  return {
    id: t.id,
    username: t.username,
    name: t.name,
    text: t.text,
    timeAgo: timeAgo(t.createdAt),
    likes: t.metrics.likes,
    retweets: t.metrics.retweets,
    replies: t.metrics.replies,
    impressions: t.metrics.impressions,
    tweetUrl: t.tweetUrl,
    createdAt: t.createdAt,
  };
}
