import { NextResponse } from "next/server";
import { loadCreators } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const creators = await loadCreators();
  return NextResponse.json(creators);
}
