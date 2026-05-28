import type { BrowserContext } from "playwright";
import { log } from "../utils/logger.js";
import { saveScrapedData, saveSelfScrapedData, type ScrapedTweet } from "../utils/storage.js";
import { createBrowserContext, ensureLoggedIn } from "./auth.js";
import { getMyHandle } from "../utils/config.js";

function randomDelay(min = 2000, max = 5000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

function parseMetric(text: string | null): number {
  if (!text) return 0;
  text = text.trim().replace(/,/g, "");
  if (text.endsWith("K")) return Math.round(parseFloat(text) * 1_000);
  if (text.endsWith("M")) return Math.round(parseFloat(text) * 1_000_000);
  const n = parseInt(text, 10);
  return isNaN(n) ? 0 : n;
}

export interface ScrapeProfileOptions {
  maxAgeHours?: number;
  scrollCount?: number;
}

export async function scrapeTweetsFromProfile(
  context: BrowserContext,
  handle: string,
  options: ScrapeProfileOptions = {}
): Promise<ScrapedTweet[]> {
  const { maxAgeHours = 48, scrollCount = 5 } = options;
  const page = await context.newPage();
  const tweets: ScrapedTweet[] = [];

  try {
    log.info(`Scraping @${handle}...`);
    await page.goto(`https://x.com/${handle}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for tweet articles to load
    await page.waitForSelector('article[data-testid="tweet"]', { timeout: 15000 });

    // Scroll a few times to load more tweets
    const SCROLL_COUNT = scrollCount;
    for (let i = 0; i < SCROLL_COUNT; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await randomDelay(1500, 3000);
    }

    // Extract tweet data
    const articles = await page.$$('article[data-testid="tweet"]');
    log.info(`Found ${articles.length} tweet elements for @${handle}`);

    for (const article of articles) {
      try {
        // Tweet text
        const textEl = await article.$('[data-testid="tweetText"]');
        const text = textEl ? (await textEl.innerText()).trim() : "";
        if (!text) continue;

        // Tweet link (for ID and URL)
        const timeLink = await article.$("a time");
        const linkEl = timeLink ? await timeLink.evaluateHandle((el) => el.closest("a")) : null;
        const href = linkEl ? await (linkEl as any).getAttribute("href") : null;
        const id = href ? href.split("/").pop() || "" : "";
        const url = href ? `https://x.com${href}` : "";

        // Timestamp
        const timeEl = await article.$("time");
        const timestamp = timeEl ? (await timeEl.getAttribute("datetime")) || "" : "";

        // Filter: only tweets within maxAgeHours
        if (timestamp) {
          const tweetDate = new Date(timestamp);
          const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
          if (tweetDate < cutoff) continue;
        }

        // Media presence
        const hasMedia =
          (await article.$('[data-testid="tweetPhoto"]')) !== null ||
          (await article.$("video")) !== null;

        // Engagement metrics
        const replyEl = await article.$('[data-testid="reply"] span');
        const retweetEl = await article.$('[data-testid="retweet"] span');
        const likeEl = await article.$('[data-testid="like"] span');

        // Views are in the analytics link
        const viewsEl = await article.$('a[href*="/analytics"] span');

        const replies = parseMetric(replyEl ? await replyEl.innerText() : null);
        const retweets = parseMetric(retweetEl ? await retweetEl.innerText() : null);
        const likes = parseMetric(likeEl ? await likeEl.innerText() : null);
        const views = parseMetric(viewsEl ? await viewsEl.innerText() : null);

        tweets.push({ id, text, likes, retweets, replies, views, hasMedia, timestamp, url });
      } catch {
        // Skip individual tweet parsing errors
      }
    }

    log.success(`Scraped ${tweets.length} recent tweets from @${handle}`);
  } catch (e) {
    log.error(`Failed to scrape @${handle}: ${e instanceof Error ? e.message : e}`);
  } finally {
    await page.close();
  }

  return tweets;
}

export async function scrapeCreators(handles: string[]): Promise<void> {
  if (handles.length === 0) {
    log.warn("No creators to scrape. Add handles in src/config/creators.ts");
    return;
  }

  const context = await createBrowserContext();

  try {
    const loggedIn = await ensureLoggedIn(context);
    if (!loggedIn) {
      log.warn("Not logged in — scraping public profiles only (limited data)");
    }

    for (const handle of handles) {
      await randomDelay(2000, 4000);

      const tweets = await scrapeTweetsFromProfile(context, handle);

      await saveScrapedData({
        handle,
        scrapedAt: new Date().toISOString(),
        tweets,
      });
    }
  } finally {
    await context.browser()?.close();
  }
}

export async function scrapeSelf(): Promise<void> {
  const handle = getMyHandle();
  if (!handle) {
    log.info("No MY_TWITTER_HANDLE set — skipping self-scrape");
    return;
  }

  log.info(`Self-scraping @${handle}...`);
  const context = await createBrowserContext();

  try {
    await ensureLoggedIn(context);
    const tweets = await scrapeTweetsFromProfile(context, handle, {
      maxAgeHours: 336, // 14 days
      scrollCount: 10,
    });

    await saveSelfScrapedData({
      handle,
      scrapedAt: new Date().toISOString(),
      tweets,
    });

    log.success(`Self-scraped ${tweets.length} tweets from @${handle}`);
  } finally {
    await context.browser()?.close();
  }
}
