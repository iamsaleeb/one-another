import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Deprecated. Use /api/cron/process-notifications" },
    { status: 410 }
  );
}
