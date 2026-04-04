"use server";

import { auth, signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
} from "@/lib/validations/auth";
import { generateOtp, storeOtp, verifyOtp } from "@/lib/email/otp";
import { sendVerificationEmail } from "@/lib/email/send-verification";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  pendingVerification?: boolean;
}

export async function loginAction(data: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // Check if user exists but is unverified before attempting sign-in
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { emailVerified: true },
  });
  if (user && !user.emailVerified) {
    return {
      error: "Please verify your email before signing in. Check your inbox for a verification code.",
      pendingVerification: true,
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong. Please try again." };
      }
    }
    throw error;
  }

  return {};
}

export async function registerAction(data: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.emailVerified) {
      return { fieldErrors: { email: ["An account with this email already exists."] } };
    }
    // User exists but is unverified — resend OTP and let them continue verifying
    const otp = generateOtp();
    await storeOtp(`register:${email}`, otp);
    try {
      await sendVerificationEmail(email, existing.name ?? name, otp);
    } catch {
      // Email failure is non-fatal — user can resend from the verification step
    }
    return { pendingVerification: true };
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: { name, email, password: hashedPassword, emailVerified: null },
    });
  } catch (error) {
    // Handle race condition where another request created the same email
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { fieldErrors: { email: ["An account with this email already exists."] } };
    }
    throw error;
  }

  const otp = generateOtp();
  await storeOtp(`register:${email}`, otp);
  try {
    await sendVerificationEmail(email, name, otp);
  } catch {
    // Email failure is non-fatal — user can resend from the verification step
  }

  return { pendingVerification: true };
}

export async function verifyRegistrationOtpAction(
  email: string,
  otp: string,
  password: string
): Promise<ActionResult> {
  const valid = await verifyOtp(`register:${email}`, otp);
  if (!valid) {
    return { error: "Invalid or expired code. Please try again." };
  }

  await prisma.user.update({
    where: { email },
    data: { emailVerified: new Date() },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/onboarding",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Verification succeeded but sign-in failed. Please log in." };
    }
    throw error;
  }

  return {};
}

export async function sendPasswordResetOtpAction(email: string): Promise<ActionResult> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true },
  });

  // Always return success to prevent email enumeration
  if (!user || !user.emailVerified) {
    return {};
  }

  try {
    const otp = generateOtp();
    await storeOtp(`reset:${email}`, otp);
    await sendPasswordResetEmail(email, otp);
  } catch {
    // Silently swallow — we never reveal whether the email was sent
  }

  return {};
}

export async function resetPasswordAction(
  email: string,
  data: ResetPasswordInput
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(data);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { otp, newPassword } = parsed.data;

  const valid = await verifyOtp(`reset:${email}`, otp);
  if (!valid) {
    return { error: "Invalid or expired code. Please try again." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  });

  redirect("/login?reset=success");
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

  // Delete the user – all related data cascades (sessions, accounts, attendances, follows, tokens, etc.)
  // Events and series created by the user are preserved but their createdById is set to null (SetNull)
  await prisma.user.delete({ where: { id: session.user.id } });

  // Sign out to clear the session cookie and redirect to login
  await signOut({ redirectTo: "/login" });
}
