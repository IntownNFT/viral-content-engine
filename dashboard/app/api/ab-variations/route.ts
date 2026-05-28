import { NextResponse } from "next/server";
import { loadLatestAbVariations } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await loadLatestAbVariations();
  return NextResponse.json(data || { generatedAt: null, groups: [] });
}
