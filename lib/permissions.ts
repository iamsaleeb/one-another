import "server-only";
import { prisma } from "@/lib/db";
import type { Session } from "next-auth";

/**
 * Token-based permission check using raw claims arrays — no DB hit.
 * Use in DAL functions that receive organiserChurchIds/adminChurchIds from server actions.
 */
export function canManageFromClaims(
  role: string | null | undefined,
  organiserChurchIds: string[],
  adminChurchIds: string[],
  churchId: string | null | undefined
): boolean {
  if (!churchId) return false;
  if (role === "ORGANISER") return organiserChurchIds.includes(churchId);
  if (role === "ADMIN") return adminChurchIds.includes(churchId);
  return false;
}

/**
 * Token-based permission check — no DB hit.
 * Use for page renders and read paths; keep DB checks for destructive admin actions.
 */
export function canManageChurchFromSession(
  session: Session | null,
  churchId: string
): boolean {
  if (!session?.user) return false;
  const { role, organiserChurchIds = [], adminChurchIds = [] } = session.user;
  if (role === "ORGANISER") return organiserChurchIds.includes(churchId);
  if (role === "ADMIN") return adminChurchIds.includes(churchId);
  return false;
}

/**
 * Returns true if the user has an explicit ChurchAdmin assignment
 * for the given church. Returns false for any falsy input.
 */
export async function isAdminForChurch(
  userId: string | null | undefined,
  churchId: string | null | undefined
): Promise<boolean> {
  if (!userId || !churchId) return false;
  const record = await prisma.churchAdmin.findUnique({
    where: { userId_churchId: { userId, churchId } },
    select: { userId: true },
  });
  return record !== null;
}

/**
 * Returns true if the user can manage the given church — either as an
 * organiser or as an admin. Returns false for any falsy input.
 */
export async function canManageChurch(
  userId: string | null | undefined,
  role: string | null | undefined,
  churchId: string | null | undefined
): Promise<boolean> {
  if (role === "ORGANISER") return isOrganiserForChurch(userId, churchId);
  if (role === "ADMIN") return isAdminForChurch(userId, churchId);
  return false;
}

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
