import { getResend } from "@/lib/email/resend";
import { VerificationEmail } from "@/emails/verification-email";

export async function sendVerificationEmail(
  email: string,
  name: string,
  otp: string
): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from)
    throw new Error("RESEND_FROM_EMAIL environment variable is not set");
  const { error } = await getResend().emails.send({
    from,
    to: [email],
    subject: "Your 1Another verification code",
    react: VerificationEmail({ name, otp }),
  });

  if (error) {
    throw new Error("Failed to send verification email");
  }
}
