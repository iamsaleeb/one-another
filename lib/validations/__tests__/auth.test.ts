import { z } from "zod";
import { requestOtpSchema, otpSchema } from "@/lib/validations/auth";

describe("requestOtpSchema", () => {
  it("accepts a valid email", () => {
    expect(
      requestOtpSchema.safeParse({ email: "user@example.com" }).success
    ).toBe(true);
  });

  it("rejects an invalid email format", () => {
    const result = requestOtpSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.email).toContain(
        "Invalid email address"
      );
    }
  });

  it("rejects an empty email", () => {
    const result = requestOtpSchema.safeParse({ email: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.email).toBeDefined();
    }
  });
});

describe("otpSchema", () => {
  it("accepts a 6-digit string", () => {
    expect(otpSchema.safeParse({ otp: "123456" }).success).toBe(true);
  });

  it("rejects fewer than 6 digits", () => {
    expect(otpSchema.safeParse({ otp: "12345" }).success).toBe(false);
  });

  it("rejects more than 6 digits", () => {
    expect(otpSchema.safeParse({ otp: "1234567" }).success).toBe(false);
  });

  it("rejects non-digit characters", () => {
    expect(otpSchema.safeParse({ otp: "12345a" }).success).toBe(false);
  });

  it("rejects empty string", () => {
    expect(otpSchema.safeParse({ otp: "" }).success).toBe(false);
  });
});
