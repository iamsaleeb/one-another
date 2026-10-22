export type UploadVariant = "profile" | "cover" | "response";

// Every blob lives under its uploader, `<variant>/<userId>/<filename>`, so
// ownership can be checked from the pathname alone.
export function uploadPathname(
  variant: UploadVariant,
  userId: string,
  filename: string
): string {
  return `${variant}/${userId}/${filename}`;
}

// The uploader recorded in a blob pathname, or null if it is not one of ours.
export function uploadOwner(pathname: string): string | null {
  const [variant, userId, ...rest] = pathname.replace(/^\//, "").split("/");
  if (!["profile", "cover", "response"].includes(variant)) return null;
  if (!userId || rest.length === 0) return null;
  return userId;
}
