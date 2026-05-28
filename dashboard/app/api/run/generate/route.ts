import { NextRequest, NextResponse } from "next/server";
import {
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
  runCommand("generate", async () => {
    const scraped = await loadLatestScrapedData();
    await generateTweets(scraped, { abTest: ab });
    await generateBlog(scraped);
    await generateReels(scraped);
    log.success("All content generated");
    try {
      await runLearnPass();
    } catch (e: any) {
      log.warn(`Auto-learn skipped: ${e.message}`);
    }
  }).catch((e: any) => log.error(`Generate failed: ${e.message}`));
  return NextResponse.json({ ok: true, status: "started" });
}
