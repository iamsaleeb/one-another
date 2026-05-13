import { getResend } from "@/lib/email/resend";
import { ResetPasswordEmail } from "@/emails/reset-password-email";

export async function sendPasswordResetEmail(
  email: string,
  otp: string
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from)
    throw new Error("RESEND_FROM_EMAIL environment variable is not set");
  const { error } = await getResend().emails.send({
    from,
    to: [email],
    subject: "Reset your 1Another password",
    react: ResetPasswordEmail({ otp }),
  });

  if (error) {
    throw new Error("Failed to send password reset email");
  }
}
