import { generate } from "./claude.js";
import { buildReelSystemPrompt, loadPillars, withSoul } from "../config/prompts.js";
import { loadSoul } from "../config/soul.js";
import { saveOutput, loadLatestTrends, loadAllSelfTweets, type ScrapedData, type ScrapedTweet, type TrendsData } from "../utils/storage.js";
import { log } from "../utils/logger.js";

async function buildTopics(scraped: ScrapedData[], trends?: TrendsData | null): Promise<string> {
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
    const pillars = await loadPillars();
    topics =
      "Content pillars to draw from:\n" +
      pillars.map((p) => `- ${p}`).join("\n");
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

function buildReelVoiceReference(selfTweets: ScrapedTweet[]): string {
  if (selfTweets.length === 0) return "";

  const scored = selfTweets
    .map((t) => ({
      ...t,
      score: t.likes + t.retweets * 3 + t.replies * 2,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  return (
    "\n\n--- YOUR VOICE REFERENCE ---\n" +
    "These are the user's own top tweets. " +
    "Match their speaking cadence, hooks, and natural phrasing in the scripts. " +
    "The scripts should sound like the user talking on camera.\n\n" +
    scored.map((t) => `"${t.text}"`).join("\n\n")
  );
}

export async function generateReels(scraped: ScrapedData[]): Promise<string> {
  log.info("Generating reel scripts...");

  const soul = await loadSoul();
  const trends = await loadLatestTrends();
  const selfTweets = await loadAllSelfTweets();
  const topics = await buildTopics(scraped, trends);
  const voiceRef = buildReelVoiceReference(selfTweets);
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

Format each script with a title, then the three sections. Separate scripts with "---".${voiceRef}`;

  const reelPrompt = await buildReelSystemPrompt();
  const raw = await generate(withSoul(reelPrompt, soul), userPrompt);

  const output = `# Reel Scripts — ${date}\n\n${raw}\n`;
  await saveOutput("reels", output);

  log.success("Reel scripts generated");
  return output;
}
