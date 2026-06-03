import { z } from "zod";

export const SubmitRequestSchema = z.object({
  resourceType: z.enum(["EVENT", "SERIES", "CHURCH"]),
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

export const RevokeAccessSchema = z.object({
  requestId: z.string().min(1),
});

export type SubmitRequestInput = z.infer<typeof SubmitRequestSchema>;
export type ReviewRequestInput = z.infer<typeof ReviewRequestSchema>;
export type CancelRequestInput = z.infer<typeof CancelRequestSchema>;
export type RevokeAccessInput = z.infer<typeof RevokeAccessSchema>;
