import { generate } from "./claude.js";
import { SYSTEM_PROMPT_TWEETS, SYSTEM_PROMPT_VARIATIONS } from "../config/prompts.js";
import {
  saveOutput,
  loadLatestTrends,
  saveAbVariations,
  type ScrapedData,
  type TrendsData,
  type AbVariationGroup,
} from "../utils/storage.js";
import { log } from "../utils/logger.js";

function buildContext(scraped: ScrapedData[], trends?: TrendsData | null): string {
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

  let context: string;

  if (topTweets.length === 0) {
    context = "No scraped tweets available. Generate original content based on the content pillars.";
  } else {
    context =
      "Here are the top-performing recent tweets from creators in this niche:\n\n" +
      topTweets
        .map(
          (t) =>
            `@${t.handle} (${t.likes} likes, ${t.retweets} RTs, ${t.views} views):\n"${t.text}"`
        )
        .join("\n\n");
  }

  if (trends && trends.trends.length > 0) {
    context +=
      "\n\n---\n\nCurrently trending on X:\n" +
      trends.trends
        .slice(0, 15)
        .map((t) => `- ${t.name} (${t.category}${t.postCount ? `, ${t.postCount} posts` : ""})`)
        .join("\n");
  }

  return context;
}

function parseVariations(raw: string): AbVariationGroup[] {
  const groups: AbVariationGroup[] = [];
  const blocks = raw.split("===").map((b) => b.trim()).filter(Boolean);

  for (const block of blocks) {
    const originalMatch = block.match(/ORIGINAL:\s*\n([\s\S]*?)(?=\nVARIATION A:)/i);
    const varAMatch = block.match(/VARIATION A:\s*\n([\s\S]*?)(?=\nVARIATION B:)/i);
    const varBMatch = block.match(/VARIATION B:\s*\n([\s\S]*?)$/i);

    if (originalMatch && varAMatch && varBMatch) {
      groups.push({
        original: originalMatch[1].trim(),
        variationA: varAMatch[1].trim(),
        variationB: varBMatch[1].trim(),
      });
    }
  }

  return groups;
}

async function generateVariations(originalTweets: string): Promise<{ markdown: string; groups: AbVariationGroup[] }> {
  log.info("Generating A/B tweet variations...");

  // Extract individual tweets from the generated output
  const tweets = originalTweets
    .split("---")
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !t.startsWith("# Generated"));

  const userPrompt = `Here are ${tweets.length} original tweets. For each one, generate Variation A (different hook) and Variation B (different format).

${tweets.map((t, i) => `Tweet ${i + 1}:\n${t}`).join("\n\n")}

Remember: output each group as ORIGINAL / VARIATION A / VARIATION B, separated by "===".`;

  const raw = await generate(SYSTEM_PROMPT_VARIATIONS, userPrompt, 8192);
  const groups = parseVariations(raw);

  const date = new Date().toISOString().slice(0, 10);

  // Build readable markdown
  let markdown = `# A/B Tweet Variations — ${date}\n\n`;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    markdown += `## Tweet ${i + 1}\n\n`;
    markdown += `**Original:**\n${g.original}\n\n`;
    markdown += `**Variation A:**\n${g.variationA}\n\n`;
    markdown += `**Variation B:**\n${g.variationB}\n\n`;
    markdown += `---\n\n`;
  }

  return { markdown, groups };
}

export async function generateTweets(
  scraped: ScrapedData[],
  options: { abTest?: boolean } = {}
): Promise<string> {
  log.info("Generating tweets...");

  const trends = await loadLatestTrends();
  const context = buildContext(scraped, trends);
  const date = new Date().toISOString().slice(0, 10);

  let trendHook = "";
  if (trends && trends.trends.length > 0) {
    trendHook = "\n\nIf any trending topics relate to content creation, incorporate them as timely hooks.";
  }

  const userPrompt = `${context}

Based on the patterns you see in these viral tweets, generate exactly 10 original tweets about clipping, content creation, and organic marketing.

Mix these formats:
1. 3 punchy one-liners / hot takes
2. 2 "most people" or "unpopular opinion" hooks
3. 2 listicle-style tweets (use line breaks)
4. 1 personal story/lesson format
5. 2 thread starters (first tweet of a thread, ending with "🧵" or "A thread:")

Each tweet should reinforce the core thesis: volume > quality.${trendHook}

Output each tweet separated by "---". No numbering, no labels.`;

  const raw = await generate(SYSTEM_PROMPT_TWEETS, userPrompt);

  const output = `# Generated Tweets — ${date}\n\n${raw}\n`;
  await saveOutput("tweets", output);

  log.success("Tweets generated");

  // A/B variation pass
  if (options.abTest) {
    const { markdown, groups } = await generateVariations(raw);
    await saveOutput("tweets", markdown, "ab-variations");
    await saveAbVariations({ generatedAt: new Date().toISOString(), groups });
    log.success("A/B variations generated");
  }

  return output;
}
