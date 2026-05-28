import { NextResponse } from "next/server";
import { getStatuses } from "@/lib/state";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getStatuses());
}
