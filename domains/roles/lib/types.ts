import type { ChurchRole } from "@prisma/client";

export type ScopeContext =
  | { scope: "PLATFORM" }
  | { scope: "CHURCH"; churchId: string }
  | { scope: "EVENT"; eventId: string; churchId: string };

export interface RoleClaims {
  isPlatformAdmin: boolean;
  churchMemberships: Array<{ churchId: string; role: ChurchRole }>;
}

export interface RoleActionState {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
}
