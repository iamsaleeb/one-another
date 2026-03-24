import "server-only";
import { prisma } from "@/lib/db";

/**
 * Returns true if the user has an explicit ChurchOrganiser assignment
 * for the given church. Returns false for any falsy input.
 */
export async function isOrganiserForChurch(
  userId: string | null | undefined,
  churchId: string | null | undefined
): Promise<boolean> {
  if (!userId || !churchId) return false;
  const record = await prisma.churchOrganiser.findUnique({
    where: { userId_churchId: { userId, churchId } },
    select: { userId: true },
  });
  return record !== null;
}
