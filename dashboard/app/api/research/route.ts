import { NextRequest, NextResponse } from "next/server";
import { runResearch } from "@/lib/engine";
import { setStatus, setLatestResearch } from "@/lib/state";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const query = body.query || "";
  if (!query) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  try {
    setStatus("research", { state: "running", startedAt: new Date().toISOString() });
    const result = await runResearch(query, {
      quick: body.quick || false,
      minLikes: body.minLikes || 0,
    });
    setLatestResearch(result);
    setStatus("research", {
      state: "complete",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, result });
  } catch (e: any) {
    setStatus("research", {
      state: "error",
      completedAt: new Date().toISOString(),
      error: e.message,
    });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
