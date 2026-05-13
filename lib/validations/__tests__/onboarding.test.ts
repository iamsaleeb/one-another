import { z } from "zod";
import { onboardingSchema } from "@/lib/validations/onboarding";

describe("onboardingSchema", () => {
  it("accepts all fields omitted (all optional)", () => {
    expect(onboardingSchema.safeParse({}).success).toBe(true);
  });

  it("accepts valid phone, dateOfBirth and image", () => {
    expect(
      onboardingSchema.safeParse({
        phone: "+44 7700 900000",
        dateOfBirth: "1990-05-15",
        image: "https://example.com/photo.jpg",
      }).success
    ).toBe(true);
  });

  it("accepts today as dateOfBirth", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(onboardingSchema.safeParse({ dateOfBirth: today }).success).toBe(
      true
    );
  });

  // ── image ──────────────────────────────────────────────────────────────────

  it("rejects an invalid image URL", () => {
    const result = onboardingSchema.safeParse({ image: "not-a-url" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.image).toBeDefined();
    }
  });

  it("rejects a relative image path", () => {
    const result = onboardingSchema.safeParse({ image: "/images/photo.jpg" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.image).toBeDefined();
    }
  });

  // ── dateOfBirth ─────────────────────────────────────────────────────────────

  it("rejects a future dateOfBirth", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = onboardingSchema.safeParse({
      dateOfBirth: future.toISOString().split("T")[0],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });

  it("rejects a DD/MM/YYYY formatted date", () => {
    const result = onboardingSchema.safeParse({ dateOfBirth: "15/05/1990" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });

  it("rejects a date with wrong separator", () => {
    const result = onboardingSchema.safeParse({ dateOfBirth: "1990.05.15" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });

  it("rejects a date-time ISO string", () => {
    const result = onboardingSchema.safeParse({
      dateOfBirth: "1990-05-15T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });

  it("rejects an impossible calendar date", () => {
    const result = onboardingSchema.safeParse({ dateOfBirth: "1990-13-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });
});
