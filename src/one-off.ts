import "dotenv/config";
import { generate } from "./generator/claude.js";
import { saveOutput } from "./utils/storage.js";
import { log } from "./utils/logger.js";

const SYSTEM = `You are a sharp, experienced content creator and developer writing a blog post in first person.
Your tone is conversational, punchy, and practitioner-level — you've built the thing, now you're teaching others.
Write in markdown. No fluff. Every sentence earns its place.`;

const PROMPT = `Write a blog article (1000-1500 words) titled something compelling about how I built a fully automated viral content engine.

Here's what I actually built — use these real details:

**The system:**
- A Node.js + TypeScript pipeline that runs daily
- Uses Playwright (headless browser) to scrape Twitter/X profiles of top creators in the content/clipping/organic marketing space
- Creators I track: @fyreinteractive, @adriansolarzz, @alexxgrowth, @danvsI, @iamshackelford
- Extracts tweet text, engagement metrics (likes, RTs, replies, views), timestamps
- Feeds that scraped data into the Claude API (Anthropic) as context
- Claude then generates 3 types of content daily:
  1. 10 original tweets (hot takes, hooks, threads, one-liners)
  2. 1 long-form blog article (800-1200 words, SEO-friendly, tweetable headers)
  3. 5 Instagram Reel / TikTok scripts (hook/body/CTA format, teleprompter-ready)
- Everything outputs as dated markdown files
- CLI commands: scrape, generate, or full daily pipeline
- Cookie persistence so Twitter login isn't needed every run
- Anti-detection: random delays, user-agent spoofing, slow scrolling

**The core thesis the content promotes:** Going viral is about output volume, not ad spend or video quality. Post more, clip more, repurpose more.

**Article angle:**
- Frame it as: "I got tired of staring at a blank screen every morning trying to think of content. So I built a system."
- Explain WHY volume matters (surface area for virality)
- Walk through the architecture simply — readers are creators, not engineers
- Emphasize that this took one afternoon to build, not months
- Include practical takeaways even for people who won't build their own
- End with a CTA about following for more content systems / automation

Make it real, make it useful, make it something people would actually share.`;

async function main() {
  log.info("Generating custom blog article...");
  const content = await generate(SYSTEM, PROMPT, 4096);
  await saveOutput("blogs", `${content}\n`, "how-i-built-viral-content-engine");
  log.success("Done!");
  console.log("\n" + content);
}

main().catch((e) => {
  log.error(e.message);
  process.exit(1);
});
