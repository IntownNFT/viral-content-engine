import { NextResponse } from "next/server";
import {
  heartbeatCheck,
  markTaskComplete,
  loadCreators,
  scrapeCreators,
  scrapeTrends,
  loadLatestScrapedData,
  generateTweets,
  generateBlog,
  generateReels,
  runLearnPass,
  log,
} from "@/lib/engine";
import { runCommand } from "@/lib/state";

export async function POST() {
  const { readyTasks } = await heartbeatCheck();
  const ran: string[] = [];

  for (const task of readyTasks) {
    try {
      switch (task.name) {
        case "daily":
          runCommand("daily", async () => {
            const creators = await loadCreators();
            await scrapeCreators(creators);
            try { await scrapeTrends(); } catch {}
            const scraped = await loadLatestScrapedData();
            await generateTweets(scraped, { abTest: false });
            await generateBlog(scraped);
            await generateReels(scraped);
            try { await runLearnPass(); } catch {}
          }).catch((e: any) => log.error(`Heartbeat daily failed: ${e.message}`));
          ran.push("daily");
          break;
        case "trends":
          runCommand("trends", async () => {
            await scrapeTrends();
          }).catch((e: any) => log.error(`Heartbeat trends failed: ${e.message}`));
          ran.push("trends");
          break;
        case "learn":
          runCommand("learn", async () => {
            await runLearnPass();
          }).catch((e: any) => log.error(`Heartbeat learn failed: ${e.message}`));
          ran.push("learn");
          break;
      }
      await markTaskComplete(task.name);
    } catch (e: any) {
      log.error(`Heartbeat task ${task.name} failed: ${e.message}`);
    }
  }

  return NextResponse.json({ ok: true, ran, total: readyTasks.length });
}
