import { type NextRequest, NextResponse } from "next/server";
import { processNotifications } from "@/domains/notifications/process";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    const secret = process.env.CRON_SECRET;
    const authHeader = request.headers.get("authorization");
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
