import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { token, platform } = body;

  if (!token || !platform || !["android", "ios"].includes(platform)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: session.user.id, platform },
    create: { token, platform, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
