import { getResend } from "@/lib/email/resend";
import { SignInEmail } from "@/emails/sign-in-email";

export async function sendLoginOtp(email: string, otp: string): Promise<void> {
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from)
    throw new Error("RESEND_FROM_EMAIL environment variable is not set");

  const { error } = await getResend().emails.send({
    from,
    to: [email],
    subject: "Your 1Another sign-in code",
    react: SignInEmail({ otp }),
  });

  if (error) throw new Error("Failed to send sign-in email");
}
