import { NextRequest, NextResponse } from "next/server";
import {
  loadCreators,
  scrapeCreators,
  scrapeSelf,
  scrapeTrends,
  loadLatestScrapedData,
  generateTweets,
  generateBlog,
  generateReels,
  runLearnPass,
  log,
} from "@/lib/engine";
import { runCommand } from "@/lib/state";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const ab = !!body.ab;
  runCommand("daily", async () => {
    const creators = await loadCreators();
    log.info(`Scraping ${creators.length} creator(s)...`);
    await scrapeCreators(creators);
    try {
      await scrapeSelf();
    } catch (e: any) {
      log.warn(`Self-scrape failed: ${e.message}`);
    }
    try {
      await scrapeTrends();
    } catch (e: any) {
      log.warn(`Trends scrape failed: ${e.message}`);
    }
    const scraped = await loadLatestScrapedData();
    await generateTweets(scraped, { abTest: ab });
    await generateBlog(scraped);
    await generateReels(scraped);
    log.success("Daily pipeline complete");
    try {
      await runLearnPass();
    } catch (e: any) {
      log.warn(`Auto-learn skipped: ${e.message}`);
    }
  }).catch((e: any) => log.error(`Daily failed: ${e.message}`));
  return NextResponse.json({ ok: true, status: "started" });
}
