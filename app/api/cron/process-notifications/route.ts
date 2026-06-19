import { type NextRequest, NextResponse } from "next/server";
import { processNotifications } from "@/domains/notifications/process";

export async function GET(request: NextRequest) {
  if (process.env.VERCEL) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
