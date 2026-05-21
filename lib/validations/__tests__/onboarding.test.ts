import { z } from "zod";
import { onboardingSchema } from "@/lib/validations/onboarding";

describe("onboardingSchema", () => {
  const validBase = { name: "Jane Doe" };

  // ── name ───────────────────────────────────────────────────────────────────

  it("rejects when name is missing", () => {
    const result = onboardingSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toBeDefined();
    }
  });

  it("rejects a name shorter than 2 characters", () => {
    const result = onboardingSchema.safeParse({ name: "J" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.name).toContain(
        "Name must be at least 2 characters"
      );
    }
  });

  it("accepts name with exactly 2 characters", () => {
    expect(onboardingSchema.safeParse({ name: "Jo" }).success).toBe(true);
  });

  it("accepts valid name with optional fields omitted", () => {
    expect(onboardingSchema.safeParse(validBase).success).toBe(true);
  });

  it("accepts all fields provided", () => {
    expect(
      onboardingSchema.safeParse({
        name: "Jane Doe",
        phone: "+44 7700 900000",
        dateOfBirth: "1990-05-15",
        image: "https://example.com/photo.jpg",
      }).success
    ).toBe(true);
  });

  // ── image ──────────────────────────────────────────────────────────────────

  it("rejects an invalid image URL", () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      image: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.image).toBeDefined();
    }
  });

  it("rejects a relative image path", () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      image: "/images/photo.jpg",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.image).toBeDefined();
    }
  });

  // ── dateOfBirth ─────────────────────────────────────────────────────────────

  it("accepts today as dateOfBirth", () => {
    const today = new Date().toISOString().split("T")[0];
    expect(
      onboardingSchema.safeParse({ ...validBase, dateOfBirth: today }).success
    ).toBe(true);
  });

  it("rejects a future dateOfBirth", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    const result = onboardingSchema.safeParse({
      ...validBase,
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
    const result = onboardingSchema.safeParse({
      ...validBase,
      dateOfBirth: "15/05/1990",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });

  it("rejects a date with wrong separator", () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
      dateOfBirth: "1990.05.15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });

  it("rejects a date-time ISO string", () => {
    const result = onboardingSchema.safeParse({
      ...validBase,
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
    const result = onboardingSchema.safeParse({
      ...validBase,
      dateOfBirth: "1990-13-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        z.flattenError(result.error).fieldErrors.dateOfBirth
      ).toBeDefined();
    }
  });
});
