"use server";

import { del } from "@vercel/blob";
import { hasAnyGrant } from "@/domains/roles/lib/ability";
import { getAbility } from "@/domains/roles/lib/get-ability";

const ALLOWED_HOST_PATTERN = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

// Organisers (anyone holding a Grant) may delete cover uploads.
export async function deleteUploadedFileAction(url: string): Promise<void> {
  if (!hasAnyGrant(await getAbility())) return;

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
