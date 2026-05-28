import { NextRequest, NextResponse } from "next/server";
import { unfollowCreator } from "@/lib/engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.handle) await unfollowCreator(body.handle);
  return NextResponse.json({ ok: true });
}
