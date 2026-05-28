import { NextResponse } from "next/server";
import { getHeartbeatStatus } from "@/lib/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getHeartbeatStatus();
  return NextResponse.json(status);
}
