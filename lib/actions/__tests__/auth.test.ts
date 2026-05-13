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

jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("@/lib/email/otp", () => ({
  generateOtp: jest.fn(),
  storeOtp: jest.fn(),
  verifyOtp: jest.fn(),
}));

jest.mock("@/lib/email/send-verification", () => ({
  sendVerificationEmail: jest.fn(),
}));

jest.mock("@/lib/email/send-password-reset", () => ({
  sendPasswordResetEmail: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

jest.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    },
  },
}));

import {
  loginAction,
  registerAction,
  verifyRegistrationOtpAction,
  sendPasswordResetOtpAction,
  resetPasswordAction,
  signOutAction,
} from "@/lib/actions/auth";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { generateOtp, storeOtp, verifyOtp } from "@/lib/email/otp";
import { sendVerificationEmail } from "@/lib/email/send-verification";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

const mockSignIn = signIn as jest.Mock;
const mockSignOut = signOut as jest.Mock;
const mockBcryptHash = bcrypt.hash as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockCreate = prisma.user.create as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;
const mockGenerateOtp = generateOtp as jest.Mock;
const mockStoreOtp = storeOtp as jest.Mock;
const mockVerifyOtp = verifyOtp as jest.Mock;
const mockSendVerificationEmail = sendVerificationEmail as jest.Mock;
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.Mock;
const mockRedirect = redirect as unknown as jest.Mock;

const verifiedUser = {
  id: "u1",
  email: "user@example.com",
  emailVerified: new Date(),
};
const unverifiedUser = {
  id: "u1",
  email: "user@example.com",
  emailVerified: null,
  name: "User",
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateOtp.mockReturnValue("123456");
  mockStoreOtp.mockResolvedValue(undefined);
  mockSendVerificationEmail.mockResolvedValue(undefined);
  mockSendPasswordResetEmail.mockResolvedValue(undefined);
  mockVerifyOtp.mockResolvedValue(false);
});

// ─────────────────────────────────────────────────────────────────────────────
// loginAction
// ─────────────────────────────────────────────────────────────────────────────
describe("loginAction", () => {
  it("returns fieldErrors when email is invalid", async () => {
    const result = await loginAction({ email: "bad-email", password: "pass" });
    expect(result.fieldErrors?.email).toBeDefined();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("returns fieldErrors when password is empty", async () => {
    const result = await loginAction({
      email: "user@example.com",
      password: "",
    });
    expect(result.fieldErrors?.password).toBeDefined();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("returns pendingVerification error when user exists but is unverified", async () => {
    mockFindUnique.mockResolvedValue(unverifiedUser);
    const result = await loginAction({
      email: "user@example.com",
      password: "pass",
    });
    expect(result.pendingVerification).toBe(true);
    expect(result.error).toMatch(/verify your email/i);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls signIn and returns {} when user is verified", async () => {
    mockFindUnique.mockResolvedValue(verifiedUser);
    mockSignIn.mockResolvedValue(undefined);
    const result = await loginAction({
      email: "user@example.com",
      password: "hunter2",
    });
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "hunter2",
      redirectTo: "/",
    });
    expect(result).toEqual({});
  });

  it("calls signIn when no user found in pre-check (NextAuth handles wrong creds)", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockSignIn.mockResolvedValue(undefined);
    await loginAction({ email: "user@example.com", password: "hunter2" });
    expect(mockSignIn).toHaveBeenCalled();
  });

  it('returns "Invalid email or password" for CredentialsSignin AuthError', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"));
    const result = await loginAction({
      email: "user@example.com",
      password: "wrong",
    });
    expect(result.error).toBe("Invalid email or password.");
  });

  it("returns generic error message for other AuthError types", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockSignIn.mockRejectedValue(new AuthError("OAuthSignInError"));
    const result = await loginAction({
      email: "user@example.com",
      password: "pass",
    });
    expect(result.error).toBe("Something went wrong. Please try again.");
  });

  it("re-throws non-AuthError exceptions", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockSignIn.mockRejectedValue(new Error("DB down"));
    await expect(
      loginAction({ email: "user@example.com", password: "pass" })
    ).rejects.toThrow("DB down");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// registerAction
// ─────────────────────────────────────────────────────────────────────────────
describe("registerAction", () => {
  const validData = {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "securepass",
    confirmPassword: "securepass",
  };

  it("returns fieldErrors for invalid data without hitting the DB", async () => {
    const result = await registerAction({ ...validData, name: "J" });
    expect(result.fieldErrors?.name).toBeDefined();
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  it("returns email fieldError when verified user already exists", async () => {
    mockFindUnique.mockResolvedValue(verifiedUser);
    const result = await registerAction(validData);
    expect(result.fieldErrors?.email).toContain(
      "An account with this email already exists."
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("resends OTP and returns pendingVerification when unverified user exists", async () => {
    mockFindUnique.mockResolvedValue(unverifiedUser);
    const result = await registerAction(validData);
    expect(mockStoreOtp).toHaveBeenCalledWith(
      "register:jane@example.com",
      "123456"
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "jane@example.com",
      "User",
      "123456"
    );
    expect(result.pendingVerification).toBe(true);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("creates user, sends OTP, and returns pendingVerification on success", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("hashed-password");
    mockCreate.mockResolvedValue({ id: "new-id" });

    const result = await registerAction(validData);

    expect(mockBcryptHash).toHaveBeenCalledWith("securepass", 12);
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "hashed-password",
        emailVerified: null,
      },
    });
    expect(mockStoreOtp).toHaveBeenCalledWith(
      "register:jane@example.com",
      "123456"
    );
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      "jane@example.com",
      "Jane Doe",
      "123456"
    );
    expect(result.pendingVerification).toBe(true);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("returns email fieldError on P2002 race condition", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("hashed");
    const p2002 = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint",
      { code: "P2002", clientVersion: "6.0.0" }
    );
    mockCreate.mockRejectedValue(p2002);
    const result = await registerAction(validData);
    expect(result.fieldErrors?.email).toContain(
      "An account with this email already exists."
    );
  });

  it("re-throws non-Prisma errors from create", async () => {
    mockFindUnique.mockResolvedValue(null);
    mockBcryptHash.mockResolvedValue("hashed");
    mockCreate.mockRejectedValue(new Error("DB failure"));
    await expect(registerAction(validData)).rejects.toThrow("DB failure");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// verifyRegistrationOtpAction
// ─────────────────────────────────────────────────────────────────────────────
describe("verifyRegistrationOtpAction", () => {
  it("returns error when OTP is invalid or expired", async () => {
    mockVerifyOtp.mockResolvedValue(false);
    const result = await verifyRegistrationOtpAction(
      "jane@example.com",
      "000000",
      "pass"
    );
    expect(result.error).toMatch(/invalid or expired/i);
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("sets emailVerified and signs user in on valid OTP", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({ id: "u1" });
    mockSignIn.mockResolvedValue(undefined);

    const result = await verifyRegistrationOtpAction(
      "jane@example.com",
      "123456",
      "securepass"
    );

    expect(mockVerifyOtp).toHaveBeenCalledWith(
      "register:jane@example.com",
      "123456"
    );
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { email: "jane@example.com" },
      data: { emailVerified: expect.any(Date) },
    });
    expect(mockSignIn).toHaveBeenCalledWith("credentials", {
      email: "jane@example.com",
      password: "securepass",
      redirectTo: "/onboarding",
    });
    expect(result).toEqual({});
  });

  it("returns error when sign-in fails with AuthError after verification", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({ id: "u1" });
    mockSignIn.mockRejectedValue(new AuthError("CredentialsSignin"));
    const result = await verifyRegistrationOtpAction(
      "jane@example.com",
      "123456",
      "securepass"
    );
    expect(result.error).toMatch(/sign-in failed/i);
  });

  it("re-throws non-AuthError exceptions from signIn", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({ id: "u1" });
    mockSignIn.mockRejectedValue(new Error("Network error"));
    await expect(
      verifyRegistrationOtpAction("jane@example.com", "123456", "securepass")
    ).rejects.toThrow("Network error");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendPasswordResetOtpAction
// ─────────────────────────────────────────────────────────────────────────────
describe("sendPasswordResetOtpAction", () => {
  it("returns {} silently when user is not found", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await sendPasswordResetOtpAction("ghost@example.com");
    expect(result).toEqual({});
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("returns {} silently when user exists but is unverified", async () => {
    mockFindUnique.mockResolvedValue(unverifiedUser);
    const result = await sendPasswordResetOtpAction("user@example.com");
    expect(result).toEqual({});
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("stores OTP and sends reset email when user is verified", async () => {
    mockFindUnique.mockResolvedValue(verifiedUser);
    const result = await sendPasswordResetOtpAction("user@example.com");
    expect(mockStoreOtp).toHaveBeenCalledWith(
      "reset:user@example.com",
      "123456"
    );
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      "user@example.com",
      "123456"
    );
    expect(result).toEqual({});
  });

  it("returns {} silently even when email send throws", async () => {
    mockFindUnique.mockResolvedValue(verifiedUser);
    mockSendPasswordResetEmail.mockRejectedValue(new Error("SMTP error"));
    const result = await sendPasswordResetOtpAction("user@example.com");
    expect(result).toEqual({});
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// resetPasswordAction
// ─────────────────────────────────────────────────────────────────────────────
describe("resetPasswordAction", () => {
  const validData = {
    otp: "123456",
    newPassword: "newpass1",
    confirmNewPassword: "newpass1",
  };

  it("returns fieldErrors when password is too short", async () => {
    const result = await resetPasswordAction("user@example.com", {
      otp: "123456",
      newPassword: "short",
      confirmNewPassword: "short",
    });
    expect(result.fieldErrors?.newPassword).toBeDefined();
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it("returns fieldErrors when passwords do not match", async () => {
    const result = await resetPasswordAction("user@example.com", {
      otp: "123456",
      newPassword: "newpass1",
      confirmNewPassword: "different1",
    });
    expect(result.fieldErrors?.confirmNewPassword).toBeDefined();
  });

  it("returns error when OTP is invalid or expired", async () => {
    mockVerifyOtp.mockResolvedValue(false);
    const result = await resetPasswordAction("user@example.com", validData);
    expect(result.error).toMatch(/invalid or expired/i);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("updates password and redirects on success", async () => {
    mockVerifyOtp.mockResolvedValue(true);
    mockBcryptHash.mockResolvedValue("new-hashed");
    mockUpdate.mockResolvedValue({ id: "u1" });

    await resetPasswordAction("user@example.com", validData);

    expect(mockVerifyOtp).toHaveBeenCalledWith(
      "reset:user@example.com",
      "123456"
    );
    expect(mockBcryptHash).toHaveBeenCalledWith("newpass1", 12);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      data: { password: "new-hashed" },
    });
    expect(mockRedirect).toHaveBeenCalledWith("/login?reset=success");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// signOutAction
// ─────────────────────────────────────────────────────────────────────────────
describe("signOutAction", () => {
  it("calls signOut with redirect to /login", async () => {
    mockSignOut.mockResolvedValue(undefined);
    await signOutAction();
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: "/login" });
  });
});
