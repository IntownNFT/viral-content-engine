import { NextRequest, NextResponse } from "next/server";
import { logFeedback } from "@/lib/engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  await logFeedback({
    type: body.type || "copy",
    contentType: body.contentType || "unknown",
    original: body.original || "",
    edited: body.edited,
    timestamp: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
