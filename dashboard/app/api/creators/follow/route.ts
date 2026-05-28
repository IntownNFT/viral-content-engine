import { NextRequest, NextResponse } from "next/server";
import { followCreator } from "@/lib/engine";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (body.handle) await followCreator(body.handle);
  return NextResponse.json({ ok: true });
}
