"use server";

import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requestOtpSchema, type RequestOtpInput } from "@/lib/validations/auth";
import { generateOtp, storeOtp, isOtpRateLimited } from "@/lib/email/otp";
import { sendLoginOtp } from "@/lib/email/send-login-otp";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

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

  const isPreview = process.env.VERCEL_ENV === "preview";
  const otp = isPreview ? "000000" : generateOtp();
  await storeOtp(`auth:${email}`, otp);

  if (!isPreview) {
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
  otp: string
): Promise<ActionResult> {
  const emailParsed = z.string().email().safeParse(email);
  if (!emailParsed.success) {
    return { error: "Invalid or expired code. Please try again." };
  }

  const rateLimited = await isOtpRateLimited(`verify:${email}`, 10);
  if (rateLimited) {
    return { error: "Too many requests. Please wait before trying again." };
  }

  try {
    await signIn("otp", { email, otp, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Sign-in failed. Please try again." };
    }
    throw error; // Re-throw NEXT_REDIRECT
  }

  return {};
}

export async function signOutAction() {
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
