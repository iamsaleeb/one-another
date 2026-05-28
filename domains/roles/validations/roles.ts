import { z } from "zod";
import { ChurchRole, EventRole, PlatformRole } from "@prisma/client";

export const AssignChurchRoleSchema = z.object({
  userId: z.string().min(1),
  churchId: z.string().min(1),
  role: z.enum(ChurchRole),
});

export const AssignEventRoleSchema = z.object({
  userId: z.string().min(1),
  eventId: z.string().min(1),
  role: z.enum(EventRole),
});

export const AssignPlatformRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(PlatformRole),
});

export const RemoveChurchMembershipSchema = z.object({
  userId: z.string().min(1),
  churchId: z.string().min(1),
});

export const RemoveEventStaffSchema = z.object({
  userId: z.string().min(1),
  eventId: z.string().min(1),
});

export type AssignChurchRoleInput = z.infer<typeof AssignChurchRoleSchema>;
export type AssignEventRoleInput = z.infer<typeof AssignEventRoleSchema>;
export type AssignPlatformRoleInput = z.infer<typeof AssignPlatformRoleSchema>;
export type RemoveChurchMembershipInput = z.infer<
  typeof RemoveChurchMembershipSchema
>;
export type RemoveEventStaffInput = z.infer<typeof RemoveEventStaffSchema>;
