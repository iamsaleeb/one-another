"use server";

import { del } from "@vercel/blob";
import { getSessionUserId } from "@/domains/roles/lib/get-ability";
import { uploadOwner } from "../lib/paths";

const ALLOWED_HOST_PATTERN = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

// Users may delete only blobs they uploaded (see uploadPathname).
export async function deleteUploadedFileAction(url: string): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) return;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.protocol !== "https:") return;
  if (!ALLOWED_HOST_PATTERN.test(parsed.hostname)) return;
  if (uploadOwner(decodeURIComponent(parsed.pathname)) !== userId) return;

  await del(url);
}
