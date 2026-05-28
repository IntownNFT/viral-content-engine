import { NextResponse } from "next/server";
import { getFiles } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const [tweets, blogs, reels] = await Promise.all([
    getFiles("tweets"),
    getFiles("blogs"),
    getFiles("reels"),
  ]);
  return NextResponse.json({ tweets, blogs, reels });
}
