import { prisma } from "@/lib/db";
import {
  isOtpRateLimited,
  MAX_OTP_ATTEMPTS,
  storeOtp,
  verifyOtp,
} from "../otp";

const ID = "auth:user@example.com";

describe("verifyOtp", () => {
  it("accepts the right code once", async () => {
    await storeOtp(ID, "123456");

    expect(await verifyOtp(ID, "123456")).toBe(true);
    expect(await verifyOtp(ID, "123456")).toBe(false);
  });

  it("refuses an expired code", async () => {
    await storeOtp(ID, "123456", -1);

    expect(await verifyOtp(ID, "123456")).toBe(false);
  });

  it("spends the code after too many wrong guesses", async () => {
    await storeOtp(ID, "123456");
    for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) {
      expect(await verifyOtp(ID, "000000")).toBe(false);
    }

    expect(await verifyOtp(ID, "123456")).toBe(false);
  });

  it("lets no more guesses through when they arrive at once", async () => {
    await storeOtp(ID, "123456");

    await Promise.all(
      Array.from({ length: MAX_OTP_ATTEMPTS * 4 }, () =>
        verifyOtp(ID, "000000")
      )
    );

    const row = await prisma.verificationToken.findFirstOrThrow({
      where: { identifier: ID },
    });
    expect(row.attempts).toBe(MAX_OTP_ATTEMPTS);
    expect(await verifyOtp(ID, "123456")).toBe(false);
  });

  it("starts a new code with a fresh count", async () => {
    await storeOtp(ID, "123456");
    for (let i = 0; i < MAX_OTP_ATTEMPTS; i++) await verifyOtp(ID, "000000");

    await storeOtp(ID, "654321");

    expect(await verifyOtp(ID, "654321")).toBe(true);
  });
});

describe("isOtpRateLimited", () => {
  it("limits a second request inside the window", async () => {
    expect(await isOtpRateLimited(ID)).toBe(false);
    expect(await isOtpRateLimited(ID)).toBe(true);
  });

  it("opens again once the window has passed", async () => {
    expect(await isOtpRateLimited(ID, -1)).toBe(false);
    expect(await isOtpRateLimited(ID)).toBe(false);
  });

  it("lets one of several requests at once through", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => isOtpRateLimited(ID))
    );

    expect(results.filter((limited) => !limited)).toHaveLength(1);
  });
});
