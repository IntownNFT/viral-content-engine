import { NextRequest, NextResponse } from "next/server";
import { followThread } from "@/lib/engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.tweetId) {
    return NextResponse.json({ error: "tweetId required" }, { status: 400 });
  }
  try {
    const result = await followThread(body.tweetId);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
