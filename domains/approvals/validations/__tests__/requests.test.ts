import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
  RevokeAccessSchema,
} from "../requests";

describe("SubmitRequestSchema", () => {
  it("accepts valid input without message", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "e1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid input with message", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "SERIES",
      resourceId: "s1",
      message: "I can help",
    });
    expect(result.success).toBe(true);
  });

  it("rejects message over 280 chars", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "e1",
      message: "a".repeat(281),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid resourceType", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "INVALID",
      resourceId: "e1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty resourceId", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("ReviewRequestSchema", () => {
  it("accepts APPROVED decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "r1",
      decision: "APPROVED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts DENIED decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "r1",
      decision: "DENIED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "r1",
      decision: "MAYBE",
    });
    expect(result.success).toBe(false);
  });
});

describe("CancelRequestSchema", () => {
  it("accepts valid requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "r1" });
    expect(result.success).toBe(true);
  });

  it("rejects empty requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "" });
    expect(result.success).toBe(false);
  });
});

describe("RevokeAccessSchema", () => {
  it("accepts valid requestId", () => {
    const result = RevokeAccessSchema.safeParse({ requestId: "r1" });
    expect(result.success).toBe(true);
  });
});
