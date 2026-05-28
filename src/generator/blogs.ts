import { generate } from "./claude.js";
import { buildBlogSystemPrompt, loadPillars, withSoul } from "../config/prompts.js";
import { loadSoul } from "../config/soul.js";
import { saveOutput, loadLatestTrends, loadAllSelfTweets, type ScrapedData, type ScrapedTweet, type TrendsData } from "../utils/storage.js";
import { log } from "../utils/logger.js";

async function pickTopic(scraped: ScrapedData[], trends?: TrendsData | null): Promise<string> {
  // Find the single most-engaged tweet to inspire the blog topic
  const allTweets = scraped.flatMap((s) =>
    s.tweets.map((t) => ({
      ...t,
      handle: s.handle,
      score: t.likes + t.retweets * 3 + t.replies * 2,
    }))
  );

  const top = allTweets.sort((a, b) => b.score - a.score)[0];

  let topic: string;
  if (top) {
    topic = `Inspiration tweet (from @${top.handle}, ${top.likes} likes):\n"${top.text}"`;
  } else {
    // Fallback: pick a random pillar
    const pillars = await loadPillars();
    const pillar = pillars[Math.floor(Math.random() * pillars.length)];
    topic = `Write about this content pillar: ${pillar}`;
  }

  if (trends && trends.trends.length > 0) {
    topic +=
      "\n\nCurrently trending on X:\n" +
      trends.trends
        .slice(0, 10)
        .map((t) => `- ${t.name}`)
        .join("\n");
  }

  return topic;
}

function buildBlogVoiceReference(selfTweets: ScrapedTweet[]): string {
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
    "These are the user's own top-performing tweets. " +
    "Match the user's tone, vocabulary, and personality in the blog. " +
    "Write as if they authored it.\n\n" +
    scored.map((t) => `"${t.text}"`).join("\n\n")
  );
}

export async function generateBlog(scraped: ScrapedData[]): Promise<string> {
  log.info("Generating blog article...");

  const soul = await loadSoul();
  const trends = await loadLatestTrends();
  const selfTweets = await loadAllSelfTweets();
  const topic = await pickTopic(scraped, trends);
  const voiceRef = buildBlogVoiceReference(selfTweets);
  const date = new Date().toISOString().slice(0, 10);

  let trendHook = "";
  if (trends && trends.trends.length > 0) {
    trendHook = "\n7. Consider weaving in relevant trending topics for timeliness";
  }

  const userPrompt = `${topic}

Write a blog article (800-1200 words) inspired by this topic. The article should:

1. Have a compelling, contrarian headline
2. Start with a hook that challenges conventional wisdom
3. Use H2 headers that each work as standalone tweets
4. Include actionable takeaways in bullet points after each section
5. End with a clear CTA (follow, subscribe, or start creating)
6. Reinforce the thesis: posting volume and repurposing > polished production${trendHook}

Format as clean markdown. The article should double as a script someone could read on camera.${voiceRef}`;

  const blogPrompt = await buildBlogSystemPrompt();
  const raw = await generate(withSoul(blogPrompt, soul), userPrompt, 4096);

  const output = `<!-- Generated: ${date} -->\n\n${raw}\n`;
  await saveOutput("blogs", output);

  log.success("Blog article generated");
  return output;
}
