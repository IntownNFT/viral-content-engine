import { generate } from "./claude.js";
import { SYSTEM_PROMPT_REELS, CONTENT_PILLARS } from "../config/prompts.js";
import { saveOutput, loadLatestTrends, type ScrapedData, type TrendsData } from "../utils/storage.js";
import { log } from "../utils/logger.js";

function buildTopics(scraped: ScrapedData[], trends?: TrendsData | null): string {
  const topTweets = scraped
    .flatMap((s) =>
      s.tweets.map((t) => ({
        ...t,
        handle: s.handle,
        score: t.likes + t.retweets * 3 + t.replies * 2,
      }))
    )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  let topics: string;

  if (topTweets.length > 0) {
    topics =
      "Trending topics from viral tweets in the niche:\n\n" +
      topTweets.map((t) => `- "${t.text}" (${t.likes} likes)`).join("\n");
  } else {
    topics =
      "Content pillars to draw from:\n" +
      CONTENT_PILLARS.map((p) => `- ${p}`).join("\n");
  }

  if (trends && trends.trends.length > 0) {
    topics +=
      "\n\nCurrently trending on X:\n" +
      trends.trends
        .slice(0, 10)
        .map((t) => `- ${t.name}`)
        .join("\n");
  }

  return topics;
}

export async function generateReels(scraped: ScrapedData[]): Promise<string> {
  log.info("Generating reel scripts...");

  const trends = await loadLatestTrends();
  const topics = buildTopics(scraped, trends);
  const date = new Date().toISOString().slice(0, 10);

  let trendHook = "";
  if (trends && trends.trends.length > 0) {
    trendHook = "\n6. If any trending topics tie into the niche, use them as hooks";
  }

  const userPrompt = `${topics}

Generate exactly 5 Instagram Reel / TikTok scripts. Each script should:

1. Be 30-60 seconds when read aloud
2. Have three clearly labeled sections: **HOOK** (first 2 seconds), **BODY**, **CTA**
3. Include [VISUAL NOTE] cues for B-roll, text overlays, or transitions
4. Cover a different angle on content creation, clipping, or organic growth
5. Reinforce the thesis: volume > quality, just post more${trendHook}

Format each script with a title, then the three sections. Separate scripts with "---".`;

  const raw = await generate(SYSTEM_PROMPT_REELS, userPrompt);

  const output = `# Reel Scripts — ${date}\n\n${raw}\n`;
  await saveOutput("reels", output);

  log.success("Reel scripts generated");
  return output;
}
