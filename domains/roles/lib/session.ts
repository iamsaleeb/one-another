import "server-only";
import { cache } from "react";
import { auth } from "@/auth";
import { createActor, createGuestActor, type Actor } from "./actor";

export const getActor = cache(async (): Promise<Actor> => {
  const session = await auth();
  if (!session?.user?.id) return createGuestActor();
  return createActor(session.user.id, session.user.isPlatformAdmin ?? false);
});
