import { searchTweets, getThread, type XTweet, type SearchOptions } from "./x-api.js";
import { formatResearchBriefing, toTweetCard, type TweetCard } from "./format.js";
import { generate } from "../generator/claude.js";
import { log } from "../utils/logger.js";
import fs from "fs/promises";
import path from "path";
import { getDataRoot } from "../utils/config.js";

export interface ResearchResult {
  topic: string;
  queries: { query: string; tweets: TweetCard[]; count: number }[];
  totalTweets: number;
  totalCost: number;
  briefing: string;
  timestamp: string;
}

const DECOMPOSE_PROMPT = `You are a research query strategist for X/Twitter. Given a research topic, decompose it into 3-5 targeted search queries that cover different angles.

Rules:
- Use X search operators: from:user, -is:retweet, -is:reply, has:links, url:domain.com, OR, ()
- First query: direct keywords for the core topic
- Other queries: explore expert voices, pain points, success stories, linked resources
- Keep queries concise — X search has a 512 char limit
- Output ONLY the queries, one per line, no numbering, no labels, no explanation`;

/**
 * Use Claude to decompose a topic into multiple search queries.
 */
async function decomposeQueries(topic: string): Promise<string[]> {
  try {
    const raw = await generate(
      DECOMPOSE_PROMPT,
      `Research topic: "${topic}"`,
      512
    );
    return raw
      .split("\n")
      .map((q) => q.trim())
      .filter((q) => q.length > 3 && !q.startsWith("#") && !q.startsWith("-"));
  } catch (e) {
    log.warn(`Query decomposition failed, using raw topic: ${e instanceof Error ? e.message : e}`);
    return [topic];
  }
}

/**
 * Run a full research pass: decompose topic → multi-angle search → aggregate results.
 */
export async function runResearch(
  topic: string,
  opts: { quick?: boolean; since?: string; minLikes?: number } = {}
): Promise<ResearchResult> {
  log.info(`Researching: "${topic}"`);

  const queries = await decomposeQueries(topic);
  log.info(`Decomposed into ${queries.length} queries`);

  const searchOpts: SearchOptions = {
    maxResults: opts.quick ? 10 : 50,
    pages: opts.quick ? 1 : 2,
    since: opts.since || "7d",
    sortBy: "likes",
    minLikes: opts.minLikes || 0,
    noRetweets: true,
    noReplies: opts.quick,
    cacheTtl: opts.quick ? 3_600_000 : 900_000, // 1hr quick, 15min normal
  };

  const sections: { query: string; tweets: XTweet[] }[] = [];
  let totalCost = 0;

  for (const query of queries) {
    try {
      const { tweets, cost } = await searchTweets(query, searchOpts);
      sections.push({ query, tweets });
      totalCost += cost;
      log.info(`  "${query}" → ${tweets.length} results ($${cost.toFixed(3)})`);
    } catch (e) {
      log.warn(`  "${query}" failed: ${e instanceof Error ? e.message : e}`);
      sections.push({ query, tweets: [] });
    }
  }

  const briefing = formatResearchBriefing(topic, sections, totalCost);

  // Save briefing to disk
  const dir = path.join(getDataRoot(), "output", "research");
  await fs.mkdir(dir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  await fs.writeFile(path.join(dir, `${date}_${slug}.md`), briefing);

  const result: ResearchResult = {
    topic,
    queries: sections.map((s) => ({
      query: s.query,
      tweets: s.tweets.map(toTweetCard),
      count: s.tweets.length,
    })),
    totalTweets: sections.reduce((sum, s) => sum + s.tweets.length, 0),
    totalCost,
    briefing,
    timestamp: new Date().toISOString(),
  };

  log.success(`Research complete: ${result.totalTweets} tweets, $${totalCost.toFixed(3)}`);
  return result;
}

/**
 * Follow a thread and return formatted results.
 */
export async function followThread(tweetId: string): Promise<{ tweets: TweetCard[]; cost: number }> {
  log.info(`Following thread: ${tweetId}`);
  const { tweets, cost } = await getThread(tweetId);
  return {
    tweets: tweets.map(toTweetCard),
    cost,
  };
}
