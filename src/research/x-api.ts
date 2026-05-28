import { log } from "../utils/logger.js";
import { cacheGet, cacheSet } from "./cache.js";

// ---- Types ----

export interface TweetMetrics {
  likes: number;
  retweets: number;
  replies: number;
  quotes: number;
  impressions: number;
  bookmarks: number;
}

export interface XTweet {
  id: string;
  text: string;
  authorId: string;
  username: string;
  name: string;
  createdAt: string;
  conversationId: string;
  metrics: TweetMetrics;
  urls: string[];
  mentions: string[];
  hashtags: string[];
  tweetUrl: string;
}

export interface XUser {
  id: string;
  username: string;
  name: string;
  description: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  verified: boolean;
}

export interface SearchOptions {
  maxResults?: number;
  pages?: number;
  since?: string;
  sortBy?: "likes" | "retweets" | "impressions" | "recency";
  minLikes?: number;
  noReplies?: boolean;
  noRetweets?: boolean;
  fromUser?: string;
  cacheTtl?: number;
}

// ---- API helpers ----

const RATE_DELAY = 350; // ms between paginated requests
const TWEET_FIELDS = "created_at,public_metrics,author_id,conversation_id,entities";
const USER_FIELDS = "username,name,description,public_metrics,verified";
const EXPANSIONS = "author_id";

function getToken(): string {
  const token = process.env.X_BEARER_TOKEN;
  if (!token) {
    throw new Error("X_BEARER_TOKEN not set. Add it to your .env file.");
  }
  return token;
}

function parseSince(since: string): string {
  const match = since.match(/^(\d+)([mhd])$/);
  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2];
    const ms = unit === "m" ? amount * 60_000 : unit === "h" ? amount * 3_600_000 : amount * 86_400_000;
    return new Date(Date.now() - ms).toISOString();
  }
  // Assume ISO timestamp
  return new Date(since).toISOString();
}

async function xFetch(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`https://api.x.com/2${endpoint}`);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const resp = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    if (resp.status === 429) {
      const resetAt = resp.headers.get("x-rate-limit-reset");
      const waitSec = resetAt ? Math.max(0, Number(resetAt) - Math.floor(Date.now() / 1000)) : 60;
      throw new Error(`X API rate limited. Resets in ${waitSec}s`);
    }
    throw new Error(`X API error ${resp.status}: ${text.slice(0, 200)}`);
  }

  return resp.json();
}

function mapTweet(tweet: any, users: Map<string, any>): XTweet {
  const user = users.get(tweet.author_id) || { username: "unknown", name: "Unknown" };
  const metrics = tweet.public_metrics || {};
  const entities = tweet.entities || {};

  return {
    id: tweet.id,
    text: tweet.text,
    authorId: tweet.author_id,
    username: user.username,
    name: user.name,
    createdAt: tweet.created_at,
    conversationId: tweet.conversation_id || tweet.id,
    metrics: {
      likes: metrics.like_count || 0,
      retweets: metrics.retweet_count || 0,
      replies: metrics.reply_count || 0,
      quotes: metrics.quote_count || 0,
      impressions: metrics.impression_count || 0,
      bookmarks: metrics.bookmark_count || 0,
    },
    urls: (entities.urls || []).map((u: any) => u.expanded_url).filter(Boolean),
    mentions: (entities.mentions || []).map((m: any) => m.username).filter(Boolean),
    hashtags: (entities.hashtags || []).map((h: any) => h.tag).filter(Boolean),
    tweetUrl: `https://x.com/${user.username}/status/${tweet.id}`,
  };
}

function buildUserMap(includes: any): Map<string, any> {
  const map = new Map<string, any>();
  if (includes?.users) {
    for (const u of includes.users) {
      map.set(u.id, u);
    }
  }
  return map;
}

function sortTweets(tweets: XTweet[], by: string): XTweet[] {
  const key = by === "impressions" ? "impressions"
    : by === "retweets" ? "retweets"
    : by === "recency" ? null
    : "likes";

  if (!key) return tweets; // Already in recency order from API
  return [...tweets].sort((a, b) => b.metrics[key] - a.metrics[key]);
}

function dedupe(tweets: XTweet[]): XTweet[] {
  const seen = new Set<string>();
  return tweets.filter((t) => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });
}

// ---- Public API ----

export async function searchTweets(query: string, opts: SearchOptions = {}): Promise<{ tweets: XTweet[]; cost: number }> {
  const maxResults = Math.min(opts.maxResults || 100, 100);
  const pages = opts.pages || 1;
  const noRetweets = opts.noRetweets !== false;
  const noReplies = opts.noReplies || false;

  let fullQuery = query;
  if (noRetweets) fullQuery += " -is:retweet";
  if (noReplies) fullQuery += " -is:reply";
  if (opts.fromUser) fullQuery += ` from:${opts.fromUser.replace(/^@/, "")}`;

  // Check cache
  const cacheParams = { query: fullQuery, maxResults, pages, since: opts.since || "" };
  const cached = await cacheGet<{ tweets: XTweet[]; cost: number }>("search", cacheParams);
  if (cached) {
    log.info(`[cache hit] search: "${query}"`);
    return cached;
  }

  const allTweets: XTweet[] = [];
  let nextToken: string | undefined;
  let rawCount = 0;

  const params: Record<string, string> = {
    query: fullQuery,
    max_results: String(maxResults),
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: EXPANSIONS,
  };

  if (opts.since) {
    params.start_time = parseSince(opts.since);
  }

  for (let page = 0; page < pages; page++) {
    if (nextToken) params.next_token = nextToken;

    const data = await xFetch("/tweets/search/recent", params);
    rawCount += data.meta?.result_count || 0;

    if (data.data) {
      const users = buildUserMap(data.includes);
      allTweets.push(...data.data.map((t: any) => mapTweet(t, users)));
    }

    nextToken = data.meta?.next_token;
    if (!nextToken) break;
    if (page < pages - 1) await new Promise((r) => setTimeout(r, RATE_DELAY));
  }

  let results = dedupe(allTweets);

  // Post-hoc filtering
  if (opts.minLikes) {
    results = results.filter((t) => t.metrics.likes >= opts.minLikes!);
  }

  // Sort
  results = sortTweets(results, opts.sortBy || "likes");

  const cost = rawCount * 0.005;
  const result = { tweets: results, cost };

  // Cache the result
  await cacheSet("search", cacheParams, result, opts.cacheTtl || 15 * 60 * 1000);

  return result;
}

export async function getThread(tweetId: string): Promise<{ tweets: XTweet[]; cost: number }> {
  // First get the tweet to find conversation_id
  const cached = await cacheGet<{ tweets: XTweet[]; cost: number }>("thread", { tweetId });
  if (cached) return cached;

  const tweetData = await xFetch(`/tweets/${tweetId}`, {
    "tweet.fields": "conversation_id",
  });

  const convId = tweetData.data?.conversation_id || tweetId;

  const params: Record<string, string> = {
    query: `conversation_id:${convId}`,
    max_results: "100",
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: EXPANSIONS,
  };

  const data = await xFetch("/tweets/search/recent", params);
  const rawCount = (data.meta?.result_count || 0) + 1; // +1 for the lookup

  const users = buildUserMap(data.includes);
  const tweets = data.data ? data.data.map((t: any) => mapTweet(t, users)) : [];

  // Sort by creation time (thread order)
  tweets.sort((a: XTweet, b: XTweet) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const result = { tweets, cost: rawCount * 0.005 };
  await cacheSet("thread", { tweetId }, result);
  return result;
}

export async function getProfile(username: string): Promise<{ user: XUser | null; tweets: XTweet[]; cost: number }> {
  const clean = username.replace(/^@/, "");

  const cached = await cacheGet<{ user: XUser | null; tweets: XTweet[]; cost: number }>("profile", { username: clean });
  if (cached) return cached;

  // Lookup user
  const userData = await xFetch(`/users/by/username/${clean}`, {
    "user.fields": USER_FIELDS,
  });

  let user: XUser | null = null;
  if (userData.data) {
    const u = userData.data;
    const pm = u.public_metrics || {};
    user = {
      id: u.id,
      username: u.username,
      name: u.name,
      description: u.description || "",
      followersCount: pm.followers_count || 0,
      followingCount: pm.following_count || 0,
      tweetCount: pm.tweet_count || 0,
      verified: u.verified || false,
    };
  }

  // Get recent tweets
  const { tweets, cost: searchCost } = await searchTweets("", {
    fromUser: clean,
    maxResults: 20,
    since: "7d",
  });

  const cost = 0.01 + searchCost; // User lookup + search cost
  const result = { user, tweets, cost };
  await cacheSet("profile", { username: clean }, result);
  return result;
}

export async function getTweet(tweetId: string): Promise<{ tweet: XTweet | null; cost: number }> {
  const cached = await cacheGet<{ tweet: XTweet | null; cost: number }>("tweet", { tweetId });
  if (cached) return cached;

  const data = await xFetch(`/tweets/${tweetId}`, {
    "tweet.fields": TWEET_FIELDS,
    "user.fields": USER_FIELDS,
    expansions: EXPANSIONS,
  });

  let tweet: XTweet | null = null;
  if (data.data) {
    const users = buildUserMap(data.includes);
    tweet = mapTweet(data.data, users);
  }

  const result = { tweet, cost: 0.005 };
  await cacheSet("tweet", { tweetId }, result);
  return result;
}
