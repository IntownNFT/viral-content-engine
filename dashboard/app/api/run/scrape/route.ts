import { NextResponse } from "next/server";
import { loadCreators, scrapeCreators, scrapeSelf, log } from "@/lib/engine";
import { runCommand } from "@/lib/state";

export async function POST() {
  runCommand("scrape", async () => {
    const creators = await loadCreators();
    log.info(`Scraping ${creators.length} creator(s)...`);
    await scrapeCreators(creators);
    try {
      await scrapeSelf();
    } catch (e: any) {
      log.warn(`Self-scrape failed: ${e.message}`);
    }
    log.success("Scrape complete");
  }).catch((e: any) => log.error(`Scrape failed: ${e.message}`));
  return NextResponse.json({ ok: true, status: "started" });
}
