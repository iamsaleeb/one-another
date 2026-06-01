import { z } from "zod";
import { ResourceType } from "@prisma/client";

export const SubmitRequestSchema = z.object({
  resourceType: z.nativeEnum(ResourceType),
  resourceId: z.string().min(1),
  message: z.string().max(280).optional(),
});

export const ReviewRequestSchema = z.object({
  requestId: z.string().min(1),
  decision: z.enum(["APPROVED", "DENIED"]),
});

export const CancelRequestSchema = z.object({
  requestId: z.string().min(1),
});

export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>;
export type ReviewRequestInput = z.infer<typeof ReviewRequestSchema>;
export type CancelRequestInput = z.infer<typeof CancelRequestSchema>;

export const RevokeAccessSchema = CancelRequestSchema;
export type RevokeAccessInput = CancelRequestInput;
