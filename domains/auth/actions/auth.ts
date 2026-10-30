"use server";

import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  emailSchema,
  requestOtpSchema,
  type RequestOtpInput,
} from "../validations/auth";
import type { ActionResult } from "@/lib/types/action";
import { generateOtp, storeOtp, isOtpRateLimited } from "../email/otp";
import { sendLoginOtp } from "../email/send-login-otp";

export async function requestOtpAction(
  data: RequestOtpInput
): Promise<ActionResult> {
  const parsed = requestOtpSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { email } = parsed.data;

  const rateLimited = await isOtpRateLimited(`auth:${email}`);
  if (rateLimited) {
    return {
      error: "Too many requests. Please wait a moment before trying again.",
    };
  }

  await prisma.user.upsert({
    where: { email },
    create: { email },
    update: {},
  });

  const isDevBypass = process.env.VERCEL_ENV !== "production";
  const otp = isDevBypass ? "000000" : generateOtp();
  await storeOtp(`auth:${email}`, otp);

  if (!isDevBypass) {
    try {
      await sendLoginOtp(email, otp);
    } catch (err) {
      console.error("Failed to send OTP email:", err);
    }
  }

  return {};
}

export async function verifyOtpAction(
  email: string,
  otp: string,
  callbackUrl?: string
): Promise<ActionResult> {
  const emailParsed = emailSchema.safeParse(email);
  if (!emailParsed.success) {
    return { error: "Invalid request." };
  }
  const normalised = emailParsed.data;

  const rateLimited = await isOtpRateLimited(`verify:${normalised}`, 10);
  if (rateLimited) {
    return { error: "Too many requests. Please wait before trying again." };
  }

  const safeRedirect =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";
  try {
    await signIn("otp", {
      email: normalised,
      otp,
      redirectTo: safeRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Sign-in failed. Please try again." };
    }
    throw error; // Re-throw NEXT_REDIRECT
  }

  return {};
}

// `pushToken` is this device's push token, if it has one: the device stops
// getting the user's notifications once they have signed out of it. Their
// other devices keep theirs.
export async function signOutAction(pushToken?: string) {
  const session = await auth();
  if (session?.user?.id && typeof pushToken === "string" && pushToken) {
    await prisma.pushToken.deleteMany({
      where: { token: pushToken, userId: session.user.id },
    });
  }
  await signOut({ redirectTo: "/login" });
}

export async function deleteAccountAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    await signOut({ redirectTo: "/login" });
    return;
  }

  await prisma.user.delete({ where: { id: session.user.id } });
  await signOut({ redirectTo: "/login" });
}
