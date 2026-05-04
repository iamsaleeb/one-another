"use server";

import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";

const ALLOWED_HOST_PATTERN = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

export async function deleteUploadedFileAction(url: string): Promise<void> {
  const session = await auth();
  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  ) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.protocol !== "https:") return;
  if (!ALLOWED_HOST_PATTERN.test(parsed.hostname)) return;

  await del(url);
}
