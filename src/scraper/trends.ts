import { log } from "../utils/logger.js";
import { saveTrendsData, type TrendingTopic } from "../utils/storage.js";
import { createBrowserContext, ensureLoggedIn } from "./auth.js";

function parsePostCount(text: string | null): number {
  if (!text) return 0;
  text = text.trim().replace(/,/g, "").replace(/ posts?/i, "");
  if (text.endsWith("K")) return Math.round(parseFloat(text) * 1_000);
  if (text.endsWith("M")) return Math.round(parseFloat(text) * 1_000_000);
  const n = parseInt(text, 10);
  return isNaN(n) ? 0 : n;
}

export async function scrapeTrends(): Promise<TrendingTopic[]> {
  log.info("Scraping trending topics from X...");

  const context = await createBrowserContext();

  try {
    const loggedIn = await ensureLoggedIn(context);
    if (!loggedIn) {
      log.warn("Not logged in — trending page may be limited");
    }

    const page = await context.newPage();

    await page.goto("https://x.com/explore/tabs/trending", {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for trend cells to load
    await page.waitForSelector('[data-testid="cellInnerDiv"]', { timeout: 15000 });

    // Scroll a few times to load more trends
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise((r) => setTimeout(r, 2000));
    }

    const cells = await page.$$('[data-testid="cellInnerDiv"]');
    const trends: TrendingTopic[] = [];
    const seen = new Set<string>();

    for (const cell of cells) {
      try {
        const text = await cell.innerText();
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length < 2) continue;

        // Typical structure: category line, trend name, post count line
        let name = "";
        let category = "";
        let postCount = 0;

        for (const line of lines) {
          if (/trending/i.test(line) && !name) {
            category = line.replace(/·.*$/, "").trim();
            continue;
          }
          if (/\d+[KM]?\s*posts?/i.test(line)) {
            postCount = parsePostCount(line);
            continue;
          }
          // Skip numbered positions like "1", "2", etc.
          if (/^\d+$/.test(line)) continue;
          // The trend name is usually the prominent text
          if (!name && line.length > 1 && !/^(trending|show more)$/i.test(line)) {
            name = line;
          }
        }

        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());

        trends.push({ name, category: category || "Trending", postCount });
      } catch {
        // Skip individual cell errors
      }
    }

    await page.close();

    // Cap at 30
    const capped = trends.slice(0, 30);
    log.success(`Scraped ${capped.length} trending topics`);

    // Save to storage
    await saveTrendsData({ scrapedAt: new Date().toISOString(), trends: capped });

    return capped;
  } catch (e) {
    log.error(`Failed to scrape trends: ${e instanceof Error ? e.message : e}`);
    return [];
  } finally {
    await context.browser()?.close();
  }
}
