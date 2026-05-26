import { z } from "zod";

export const requestOtpSchema = z.object({
  email: z.email({ error: "Invalid email address" }),
});

export const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type OtpInput = z.infer<typeof otpSchema>;
