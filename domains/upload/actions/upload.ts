"use server";

import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { sessionToClaims } from "@/domains/roles/lib/session";

const ALLOWED_HOST_PATTERN = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

export async function deleteUploadedFileAction(url: string): Promise<void> {
  const session = await auth();
  const claims = sessionToClaims(session);
  if (
    !claims ||
    (!claims.isPlatformAdmin && claims.churchMemberships.length === 0)
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
