"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { updateTag } from "next/cache";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/onboarding";
import type { ActionResult } from "@/lib/actions/auth";
import { parseDateOfBirth } from "@/lib/datetime";

export async function completeOnboardingAction(
  data: OnboardingInput
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  const parsed = onboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { phone, dateOfBirth, image } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone: phone || null,
      dateOfBirth: dateOfBirth ? parseDateOfBirth(dateOfBirth) : null,
      image: image || null,
      onboardingCompleted: true,
    },
  });

  updateTag(`user-${session.user.id}`);

  return {};
}

export async function skipOnboardingAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { onboardingCompleted: true },
  });

  return {};
}
