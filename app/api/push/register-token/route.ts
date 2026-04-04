import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(["android", "ios"]),
});

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

  const parsed = registerTokenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { token, platform } = parsed.data;

  await prisma.pushToken.upsert({
    where: { token },
    update: { userId: session.user.id, platform },
    create: { token, platform, userId: session.user.id },
  });

  return NextResponse.json({ ok: true });
}
