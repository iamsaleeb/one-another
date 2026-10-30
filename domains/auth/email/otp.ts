import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const RATE_LIMIT_TTL_SECONDS = 60;

// Wrong guesses a sign-in code takes before it is spent.
export const MAX_OTP_ATTEMPTS = 5;

// One request per identifier per window. The window is a row keyed by the
// identifier, so of two requests at once only one can create it.
export async function isOtpRateLimited(
  identifier: string,
  ttlSeconds = RATE_LIMIT_TTL_SECONDS
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const now = new Date();
  await prisma.verificationToken.deleteMany({
    where: { identifier: key, expires: { lte: now } },
  });
  try {
    await prisma.verificationToken.create({
      data: {
        identifier: key,
        token: "rate-limit",
        expires: new Date(now.getTime() + ttlSeconds * 1000),
      },
    });
    return false;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    )
      return true;
    throw err;
  }
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

export async function storeOtp(
  identifier: string,
  otp: string,
  ttlMinutes = 15
): Promise<void> {
  const expires = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const hashed = hashOtp(otp);
  // Atomic delete+create — VerificationToken has a composite PK so upsert isn't available
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier } }),
    prisma.verificationToken.create({
      data: { identifier, token: hashed, expires },
    }),
  ]);
}

// Every caller that checks a code comes through here, the sign-in endpoint
// included, so the attempt limit cannot be skipped.
export async function verifyOtp(
  identifier: string,
  otp: string
): Promise<boolean> {
  // Each guess claims one of the code's attempts before it is compared, so
  // guesses sent at once cannot share an attempt.
  const { count } = await prisma.verificationToken.updateMany({
    where: {
      identifier,
      expires: { gt: new Date() },
      attempts: { lt: MAX_OTP_ATTEMPTS },
    },
    data: { attempts: { increment: 1 } },
  });
  if (count === 0) return false;

  const record = await prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (!record) return false;

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(record.token, "hex");
  const actual = Buffer.from(hashOtp(otp), "hex");
  const valid =
    expected.length === actual.length &&
    crypto.timingSafeEqual(expected, actual);

  if (valid) {
    // Single-use: delete immediately after successful verification
    await prisma.verificationToken.deleteMany({ where: { identifier } });
  }
  return valid;
}
