import "server-only";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import type { Actor } from "./can";

export function sessionToActor(session: Session | null): Actor | null {
  if (!session?.user) return null;
  return {
    id: session.user.id,
    isPlatformAdmin: session.user.isPlatformAdmin ?? false,
  };
}

export async function getActor(): Promise<Actor | null> {
  const session = await auth();
  return sessionToActor(session);
}
