import { NextResponse } from "next/server";
import { runLearnPass, log } from "@/lib/engine";
import { runCommand } from "@/lib/state";

export async function POST() {
  runCommand("learn", async () => {
    await runLearnPass();
  }).catch((e: any) => log.error(`Learn failed: ${e.message}`));
  return NextResponse.json({ ok: true, status: "started" });
}
