import fs from "fs/promises";
import path from "path";
import { log } from "./logger.js";
import { getDataRoot } from "./config.js";
import {
  loadAllSelfTweets,
  savePerformanceData,
  type PerformanceMatch,
} from "./storage.js";

/**
 * Bigram Dice coefficient for fuzzy string matching.
 * Returns a value between 0 (no match) and 1 (identical).
 */
export function similarity(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1;
  if (na.length < 2 || nb.length < 2) return 0;

  const bigrams = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const bi = s.slice(i, i + 2);
      map.set(bi, (map.get(bi) || 0) + 1);
    }
    return map;
  };

  const biA = bigrams(na);
  const biB = bigrams(nb);
  let intersection = 0;

  for (const [bi, count] of biA) {
    intersection += Math.min(count, biB.get(bi) || 0);
  }

  const totalA = na.length - 1;
  const totalB = nb.length - 1;

  return (2 * intersection) / (totalA + totalB);
}

/**
 * Load generated tweets from output/tweets/ markdown files.
 * Parses "---"-separated tweet blocks.
 */
async function loadGeneratedTweets(): Promise<string[]> {
  const root = getDataRoot();
  const dir = path.join(root, "output", "tweets");

  let files: string[];
  try {
    files = (await fs.readdir(dir))
      .filter((f) => f.endsWith(".md") && !f.includes("ab-variations"))
      .sort()
      .reverse()
      .slice(0, 7); // last 7 days
  } catch {
    return [];
  }

  const tweets: string[] = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(dir, file), "utf-8");
    const blocks = content
      .split("---")
      .map((b) => b.trim())
      .filter((b) => b.length > 20 && !b.startsWith("# Generated") && !b.startsWith("<!--"));
    tweets.push(...blocks);
  }
  return tweets;
}

/**
 * Match generated tweets against own scraped tweets using fuzzy matching.
 * Saves matches with engagement data to data/performance/.
 */
export async function trackPerformance(): Promise<PerformanceMatch[]> {
  const selfTweets = await loadAllSelfTweets();
  if (selfTweets.length === 0) {
    log.info("No self-scraped tweets — skipping performance tracking");
    return [];
  }

  const generated = await loadGeneratedTweets();
  if (generated.length === 0) {
    log.info("No generated tweets found — skipping performance tracking");
    return [];
  }

  log.info(`Matching ${generated.length} generated tweets against ${selfTweets.length} own tweets...`);

  const matches: PerformanceMatch[] = [];
  const THRESHOLD = 0.4; // Minimum similarity to count as a match

  for (const gen of generated) {
    let bestMatch = { sim: 0, tweet: selfTweets[0] };
    for (const own of selfTweets) {
      const sim = similarity(gen, own.text);
      if (sim > bestMatch.sim) {
        bestMatch = { sim, tweet: own };
      }
    }
    if (bestMatch.sim >= THRESHOLD) {
      matches.push({
        generatedText: gen,
        postedText: bestMatch.tweet.text,
        similarity: Math.round(bestMatch.sim * 100) / 100,
        likes: bestMatch.tweet.likes,
        retweets: bestMatch.tweet.retweets,
        replies: bestMatch.tweet.replies,
        views: bestMatch.tweet.views,
        postedAt: bestMatch.tweet.timestamp,
      });
    }
  }

  if (matches.length > 0) {
    await savePerformanceData(matches);
    log.success(`Found ${matches.length} matched generated→posted tweets`);
  } else {
    log.info("No matching generated→posted tweets found");
  }

  return matches;
}
