import { NextResponse } from "next/server";
import { getLatestResearch } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getLatestResearch() || {});
}
