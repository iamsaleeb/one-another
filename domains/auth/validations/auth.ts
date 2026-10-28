import { z } from "zod";

// One account per address however it is typed: trimmed and lowercased before
// it is checked, stored or looked up.
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Invalid email address" }));

export const requestOtpSchema = z.object({
  email: emailSchema,
});

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
