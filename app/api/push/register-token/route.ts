import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { token, platform } = body as Record<string, unknown>;

  if (
    typeof token !== "string" ||
    typeof platform !== "string" ||
    !["android", "ios"].includes(platform)
  ) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: session.user.id, platform },
    create: { token, platform, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
