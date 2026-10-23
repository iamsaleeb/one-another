"use server";

import {
  cancelAccessRequest,
  requestAccess,
  revokeHelper,
  reviewAccessRequest,
} from "@/domains/roles/access";
import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
  RevokeAccessSchema,
} from "../validations/requests";
import type { AccessRequestActionState } from "../lib/types";

// Thin: parse, then hand the change to the Grant module (domains/roles/access).

export async function submitRequestAction(
  input: unknown
): Promise<AccessRequestActionState> {
  const parsed = SubmitRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  const { resourceType, resourceId, message } = parsed.data;
  return requestAccess({ type: resourceType, id: resourceId }, message);
}

export async function reviewRequestAction(
  input: unknown
): Promise<AccessRequestActionState> {
  const parsed = ReviewRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  return reviewAccessRequest(parsed.data.requestId, parsed.data.decision);
}

export async function cancelRequestAction(
  input: unknown
): Promise<AccessRequestActionState> {
  const parsed = CancelRequestSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  return cancelAccessRequest(parsed.data.requestId);
}

export async function revokeAccessAction(
  input: unknown
): Promise<AccessRequestActionState> {
  const parsed = RevokeAccessSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid input." };

  return revokeHelper(parsed.data.requestId);
}
