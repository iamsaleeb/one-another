// Mocks must be declared before imports (jest.mock is hoisted)
jest.mock("@/auth", () => ({
  signIn: jest.fn(),
  signOut: jest.fn(),
  auth: jest.fn(),
}));

jest.mock("next-auth", () => {
  class AuthError extends Error {
    type: string;
    constructor(type: string, options?: unknown) {
      super(type);
      this.type = type;
      this.name = "AuthError";
      void options;
    }
  }
  return { AuthError };
});

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/email/otp", () => ({
  generateOtp: jest.fn(),
  storeOtp: jest.fn(),
  verifyOtp: jest.fn(),
  isOtpRateLimited: jest.fn().mockResolvedValue(false),
}));

jest.mock("@/lib/email/send-login-otp", () => ({
  sendLoginOtp: jest.fn(),
}));

import {
  requestOtpAction,
  verifyOtpAction,
  signOutAction,
  deleteAccountAction,
} from "@/lib/actions/auth";
import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/db";
import {
  generateOtp,
  storeOtp,
  verifyOtp,
  isOtpRateLimited,
} from "@/lib/email/otp";
import { sendLoginOtp } from "@/lib/email/send-login-otp";

const mockSignIn = signIn as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockAuth = auth as jest.Mock;
const mockUpsert = prisma.user.upsert as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockDelete = prisma.user.delete as jest.Mock;
const mockGenerateOtp = generateOtp as jest.Mock;
const mockStoreOtp = storeOtp as jest.Mock;
const mockVerifyOtp = verifyOtp as jest.Mock;
const mockIsOtpRateLimited = isOtpRateLimited as jest.Mock;
const mockSendLoginOtp = sendLoginOtp as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateOtp.mockReturnValue("123456");
  mockStoreOtp.mockResolvedValue(undefined);
  mockSendLoginOtp.mockResolvedValue(undefined);
  mockVerifyOtp.mockResolvedValue(false);
  mockIsOtpRateLimited.mockResolvedValue(false);
  mockUpsert.mockResolvedValue({ id: "u1", email: "user@example.com" });
  mockUpdate.mockResolvedValue({});
});

// ─────────────────────────────────────────────────────────────────────────────
// requestOtpAction
// ─────────────────────────────────────────────────────────────────────────────
describe("requestOtpAction", () => {
  it("returns fieldErrors for invalid email", async () => {
    const result = await requestOtpAction({ email: "not-an-email" });
    expect(result.fieldErrors?.email).toBeDefined();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("returns rate limit error when rate-limited", async () => {
    mockIsOtpRateLimited.mockResolvedValue(true);
    const result = await requestOtpAction({ email: "user@example.com" });
    expect(result.error).toMatch(/too many requests/i);
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockStoreOtp).not.toHaveBeenCalled();
  });

  it("upserts user (creates if new, no-op if existing)", async () => {
    await requestOtpAction({ email: "new@example.com" });
    expect(mockUpsert).toHaveBeenCalledWith({
      where: { email: "new@example.com" },
      create: { email: "new@example.com" },
      update: {},
    });
  });

  it("stores OTP under auth: key", async () => {
    await requestOtpAction({ email: "user@example.com" });
    expect(mockStoreOtp).toHaveBeenCalledWith("auth:user@example.com", "123456");
  });

  it("sends login OTP email", async () => {
    await requestOtpAction({ email: "user@example.com" });
    expect(mockSendLoginOtp).toHaveBeenCalledWith("user@example.com", "123456");
  });

  it("returns {} on success", async () => {
    const result = await requestOtpAction({ email: "user@example.com" });
    expect(result).toEqual({});
  });

  it("returns {} even when email send fails (non-fatal)", async () => {
    mockSendLoginOtp.mockRejectedValue(new Error("SMTP error"));
    const result = await requestOtpAction({ email: "user@example.com" });
    expect(result).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyOtpAction
// ─────────────────────────────────────────────────────────────────────────────
describe("verifyOtpAction", () => {
  it("returns error for invalid email", async () => {
    const result = await verifyOtpAction("not-an-email", "123456");
    expect(result.error).toBeDefined();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("returns error for invalid OTP", async () => {
    mockVerifyOtp.mockResolvedValue(false);
    const result = await verifyOtpAction("user@example.com", "000000");
    expect(result.error).toBeDefined();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("sets emailVerified on valid OTP before signIn", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockSignIn.mockImplementation(() => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    });
    try {
      await verifyOtpAction("user@example.com", "123456");
    } catch {}
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      data: { emailVerified: expect.any(Date) },
    });
  });

  it("calls signIn with otp provider and redirectTo /", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockSignIn.mockImplementation(() => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    });
    try {
      await verifyOtpAction("user@example.com", "123456");
    } catch {}
    expect(mockSignIn).toHaveBeenCalledWith("otp", {
      email: "user@example.com",
      redirectTo: "/",
    });
  });

  it("re-throws NEXT_REDIRECT", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), {
      digest: "NEXT_REDIRECT",
    });
    mockSignIn.mockRejectedValue(redirectError);
    await expect(
      verifyOtpAction("user@example.com", "123456")
    ).rejects.toThrow("NEXT_REDIRECT");
  });

  it("returns error for AuthError", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"));
    const result = await verifyOtpAction("user@example.com", "123456");
    expect(result.error).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// signOutAction
// ─────────────────────────────────────────────────────────────────────────────
describe("signOutAction", () => {
  it("calls signOut with /login redirect", async () => {
    mockSignOut.mockImplementation(() => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    });
    try {
      await signOutAction();
    } catch {}
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// deleteAccountAction
// ─────────────────────────────────────────────────────────────────────────────
describe("deleteAccountAction", () => {
  it("calls signOut when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    mockSignOut.mockResolvedValue(undefined);
    await deleteAccountAction();
    expect(mockDelete).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });

  it("deletes user and calls signOut when authenticated", async () => {
    mockAuth.mockResolvedValue({ user: { id: "u1" } });
    mockDelete.mockResolvedValue({});
    mockSignOut.mockImplementation(() => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT" });
    });
    try {
      await deleteAccountAction();
    } catch {}
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
