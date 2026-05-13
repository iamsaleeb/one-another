import { type NextRequest, NextResponse } from "next/server";
import { processNotifications } from "@/lib/notifications/process";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processNotifications();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error(
      `[${new Date().toISOString()}] process-notifications cron error:`,
      err
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
