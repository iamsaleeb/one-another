"use client";

import { usePathname, useParams } from "next/navigation";

export function useIsDetailPage(): boolean {
  const pathname = usePathname();
  const params = useParams();
  const id = params?.id ?? null;
  const isDetailPage =
    (pathname.startsWith("/events/") ||
      pathname.startsWith("/churches/") ||
      pathname.startsWith("/series/")) &&
    id !== null;
  const isCreatePage =
    pathname === "/events/create" || pathname === "/series/create";
  const isProfilePage = pathname.startsWith("/profile");
  return isDetailPage || isCreatePage || isProfilePage;
}
