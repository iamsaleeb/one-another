import crypto from "crypto";
import { prisma } from "@/lib/db";

const RATE_LIMIT_TTL_SECONDS = 60;

export async function isOtpRateLimited(
  identifier: string,
  ttlSeconds = RATE_LIMIT_TTL_SECONDS
): Promise<boolean> {
  const key = `ratelimit:${identifier}`;
  const existing = await prisma.verificationToken.findFirst({
    where: { identifier: key, expires: { gt: new Date() } },
    select: { expires: true },
  });
  if (existing) return true;
  const expires = new Date(Date.now() + ttlSeconds * 1000);
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { identifier: key } }),
    prisma.verificationToken.create({
      data: { identifier: key, token: "rate-limit", expires },
    }),
  ]);
  return false;
}

export function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

export function hashOtp(otp: string): string {
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

export async function verifyOtp(
  identifier: string,
  otp: string
): Promise<boolean> {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier },
    orderBy: { expires: "desc" },
  });
  if (!record || record.expires < new Date()) return false;

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
