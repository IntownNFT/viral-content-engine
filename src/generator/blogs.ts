import { generate } from "./claude.js";
import { SYSTEM_PROMPT_BLOGS, CONTENT_PILLARS } from "../config/prompts.js";
import { saveOutput, type ScrapedData } from "../utils/storage.js";
import { log } from "../utils/logger.js";

function pickTopic(scraped: ScrapedData[]): string {
  // Find the single most-engaged tweet to inspire the blog topic
  const allTweets = scraped.flatMap((s) =>
    s.tweets.map((t) => ({
      ...t,
      handle: s.handle,
      score: t.likes + t.retweets * 3 + t.replies * 2,
    }))
  );

  const top = allTweets.sort((a, b) => b.score - a.score)[0];

  if (top) {
    return `Inspiration tweet (from @${top.handle}, ${top.likes} likes):\n"${top.text}"`;
  }

  // Fallback: pick a random pillar
  const pillar = CONTENT_PILLARS[Math.floor(Math.random() * CONTENT_PILLARS.length)];
  return `Write about this content pillar: ${pillar}`;
}

export async function generateBlog(scraped: ScrapedData[]): Promise<string> {
  log.info("Generating blog article...");

  const topic = pickTopic(scraped);
  const date = new Date().toISOString().slice(0, 10);

  const userPrompt = `${topic}

Write a blog article (800-1200 words) inspired by this topic. The article should:

1. Have a compelling, contrarian headline
2. Start with a hook that challenges conventional wisdom
3. Use H2 headers that each work as standalone tweets
4. Include actionable takeaways in bullet points after each section
5. End with a clear CTA (follow, subscribe, or start creating)
6. Reinforce the thesis: posting volume and repurposing > polished production

Format as clean markdown. The article should double as a script someone could read on camera.`;

  const raw = await generate(SYSTEM_PROMPT_BLOGS, userPrompt, 4096);

  const output = `<!-- Generated: ${date} -->\n\n${raw}\n`;
  await saveOutput("blogs", output);

  log.success("Blog article generated");
  return output;
}
