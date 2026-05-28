import { NextRequest, NextResponse } from "next/server";
import { loadSoul, saveSoul } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await loadSoul();
  return NextResponse.json({ content });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (typeof body.content === "string") {
    await saveSoul(body.content);
  }
  return NextResponse.json({ ok: true });
}
