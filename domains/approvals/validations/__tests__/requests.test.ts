import {
  SubmitRequestSchema,
  ReviewRequestSchema,
  CancelRequestSchema,
} from "../requests";

describe("SubmitRequestSchema", () => {
  it("accepts valid EVENT request with message", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "evt-1",
      message: "I can help with AV",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid request without message", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "SERIES",
      resourceId: "ser-1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown resourceType", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "UNKNOWN",
      resourceId: "r-1",
    });
    expect(result.success).toBe(false);
  });

  it("rejects message over 280 chars", () => {
    const result = SubmitRequestSchema.safeParse({
      resourceType: "EVENT",
      resourceId: "r-1",
      message: "a".repeat(281),
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
      requestId: "req-1",
      decision: "APPROVED",
    });
    expect(result.success).toBe(true);
  });

  it("accepts DENIED decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "req-1",
      decision: "DENIED",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid decision", () => {
    const result = ReviewRequestSchema.safeParse({
      requestId: "req-1",
      decision: "MAYBE",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing requestId", () => {
    const result = ReviewRequestSchema.safeParse({ decision: "APPROVED" });
    expect(result.success).toBe(false);
  });
});

describe("CancelRequestSchema", () => {
  it("accepts valid requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "req-1" });
    expect(result.success).toBe(true);
  });

  it("rejects missing requestId", () => {
    const result = CancelRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty requestId", () => {
    const result = CancelRequestSchema.safeParse({ requestId: "" });
    expect(result.success).toBe(false);
  });
});
