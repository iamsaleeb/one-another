jest.mock("@/domains/auth/email/resend", () => ({
  getResend: jest.fn(),
}));

jest.mock("@/emails/sign-in-email", () => ({
  SignInEmail: jest.fn(() => null),
}));

import { sendLoginOtp } from "@/domains/auth/email/send-login-otp";
import { getResend } from "@/domains/auth/email/resend";

const mockSend = jest.fn();
const mockGetResend = getResend as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetResend.mockReturnValue({ emails: { send: mockSend } });
  process.env.RESEND_FROM_EMAIL = "noreply@example.com";
});

afterEach(() => {
  delete process.env.RESEND_FROM_EMAIL;
});

describe("sendLoginOtp", () => {
  it("sends email with correct subject and recipient", async () => {
    mockSend.mockResolvedValue({ error: null });
    await sendLoginOtp("user@example.com", "123456");
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "noreply@example.com",
        to: ["user@example.com"],
        subject: "Your 1Another sign-in code",
      })
    );
  });

  it("throws when RESEND_FROM_EMAIL is not set", async () => {
    delete process.env.RESEND_FROM_EMAIL;
    await expect(sendLoginOtp("user@example.com", "123456")).rejects.toThrow(
      "RESEND_FROM_EMAIL"
    );
  });

  it("throws when Resend returns an error", async () => {
    mockSend.mockResolvedValue({ error: { message: "quota exceeded" } });
    await expect(sendLoginOtp("user@example.com", "123456")).rejects.toThrow(
      "Failed to send sign-in email"
    );
  });

  it("passes the OTP to the email template", async () => {
    mockSend.mockResolvedValue({ error: null });
    const { SignInEmail } = await import("@/emails/sign-in-email");
    await sendLoginOtp("user@example.com", "999888");
    expect(SignInEmail).toHaveBeenCalledWith({ otp: "999888" });
  });
});
