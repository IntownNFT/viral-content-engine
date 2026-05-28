import { NextResponse } from "next/server";
import { scrapeTrends, log } from "@/lib/engine";
import { runCommand } from "@/lib/state";

export async function POST() {
  runCommand("trends", async () => {
    await scrapeTrends();
  }).catch((e: any) => log.error(`Trends failed: ${e.message}`));
  return NextResponse.json({ ok: true, status: "started" });
}
