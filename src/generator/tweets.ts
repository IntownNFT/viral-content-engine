import { generate } from "./claude.js";
import { SYSTEM_PROMPT_TWEETS, CONTENT_PILLARS } from "../config/prompts.js";
import { saveOutput, type ScrapedData } from "../utils/storage.js";
import { log } from "../utils/logger.js";

function buildContext(scraped: ScrapedData[]): string {
  const topTweets = scraped
    .flatMap((s) =>
      s.tweets.map((t) => ({
        ...t,
        handle: s.handle,
        score: t.likes + t.retweets * 3 + t.replies * 2,
      }))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  if (topTweets.length === 0) {
    return "No scraped tweets available. Generate original content based on the content pillars.";
  }

  return (
    "Here are the top-performing recent tweets from creators in this niche:\n\n" +
    topTweets
      .map(
        (t) =>
          `@${t.handle} (${t.likes} likes, ${t.retweets} RTs, ${t.views} views):\n"${t.text}"`
      )
      .join("\n\n")
  );
}

export async function generateTweets(scraped: ScrapedData[]): Promise<string> {
  log.info("Generating tweets...");

  const context = buildContext(scraped);
  const date = new Date().toISOString().slice(0, 10);

  const userPrompt = `${context}

Based on the patterns you see in these viral tweets, generate exactly 10 original tweets about clipping, content creation, and organic marketing.

Mix these formats:
1. 3 punchy one-liners / hot takes
2. 2 "most people" or "unpopular opinion" hooks
3. 2 listicle-style tweets (use line breaks)
4. 1 personal story/lesson format
5. 2 thread starters (first tweet of a thread, ending with "🧵" or "A thread:")

Each tweet should reinforce the core thesis: volume > quality.

Output each tweet separated by "---". No numbering, no labels.`;

  const raw = await generate(SYSTEM_PROMPT_TWEETS, userPrompt);

  const output = `# Generated Tweets — ${date}\n\n${raw}\n`;
  await saveOutput("tweets", output);

  log.success("Tweets generated");
  return output;
}
