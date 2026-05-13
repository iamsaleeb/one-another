import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions/auth", () => ({
  sendPasswordResetOtpAction: jest.fn(),
  resetPasswordAction: jest.fn(),
}));

jest.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({
    value,
    onChange,
    maxLength,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    maxLength: number;
    disabled?: boolean;
  }) => (
    <input
      data-testid="otp-input"
      value={value}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
  InputOTPGroup: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  InputOTPSeparator: () => <span aria-hidden>-</span>,
  InputOTPSlot: () => null,
}));

jest.mock("input-otp", () => ({
  REGEXP_ONLY_DIGITS: /^\d*$/,
}));

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import {
  sendPasswordResetOtpAction,
  resetPasswordAction,
} from "@/lib/actions/auth";

const mockSendOtp = sendPasswordResetOtpAction as jest.Mock;
const mockReset = resetPasswordAction as jest.Mock;

// Use delay:null to skip userEvent's internal keypress delays in all tests
const user = userEvent.setup({ delay: null });

beforeEach(() => {
  jest.clearAllMocks();
  mockSendOtp.mockResolvedValue({});
  mockReset.mockResolvedValue({});
});

async function submitEmail(email = "user@example.com") {
  await user.type(screen.getByLabelText(/email/i), email);
  await user.click(screen.getByRole("button", { name: /send code/i }));
}

// Helper: render and advance to the reset step
async function goToResetStep() {
  render(<ForgotPasswordForm />);
  await submitEmail();
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /reset password/i })
    ).toBeInTheDocument()
  );
}

describe("ForgotPasswordForm — email step", () => {
  it("renders the email input and send code button", () => {
    render(<ForgotPasswordForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send code/i })
    ).toBeInTheDocument();
  });

  it("renders a back to sign in link", () => {
    render(<ForgotPasswordForm />);
    expect(
      screen.getByRole("link", { name: /back to sign in/i })
    ).toHaveAttribute("href", "/login");
  });

  it("shows validation error for invalid email", async () => {
    render(<ForgotPasswordForm />);
    await user.type(screen.getByLabelText(/email/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    );
    expect(mockSendOtp).not.toHaveBeenCalled();
  });

  it("calls sendPasswordResetOtpAction on valid submit", async () => {
    render(<ForgotPasswordForm />);
    await submitEmail();
    await waitFor(() =>
      expect(mockSendOtp).toHaveBeenCalledWith("user@example.com")
    );
  });

  it("transitions to the reset step after submitting email", async () => {
    render(<ForgotPasswordForm />);
    await submitEmail();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reset password/i })
      ).toBeInTheDocument()
    );
  });
});

describe("ForgotPasswordForm — reset step", () => {
  it("shows the email in the reset step description", async () => {
    await goToResetStep();
    expect(screen.getByText(/user@example.com/)).toBeInTheDocument();
  });

  it("renders OTP input, new password, confirm password, and reset button", async () => {
    await goToResetStep();
    expect(screen.getByTestId("otp-input")).toBeInTheDocument();
    expect(screen.getByLabelText(/^new password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset password/i })
    ).toBeInTheDocument();
  });

  it("renders the resend button as disabled initially", async () => {
    await goToResetStep();
    expect(screen.getByRole("button", { name: /resend in/i })).toBeDisabled();
  });

  it("enables resend button after the 60s cooldown", async () => {
    jest.useFakeTimers();
    // Re-create userEvent with fake timer support for this test
    const fakeUser = userEvent.setup({
      delay: null,
      advanceTimers: jest.advanceTimersByTime.bind(jest),
    });
    render(<ForgotPasswordForm />);
    await fakeUser.type(screen.getByLabelText(/email/i), "user@example.com");
    await fakeUser.click(screen.getByRole("button", { name: /send code/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /reset password/i })
      ).toBeInTheDocument()
    );
    for (let i = 0; i < 60; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
    }
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /resend code/i })
      ).not.toBeDisabled()
    );
    jest.useRealTimers();
  });

  it("calls resetPasswordAction with email, OTP, and new passwords on submit", async () => {
    await goToResetStep();
    await user.type(screen.getByTestId("otp-input"), "123456");
    await user.type(screen.getByLabelText(/^new password$/i), "newpass1");
    await user.type(screen.getByLabelText(/confirm new password/i), "newpass1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() =>
      expect(mockReset).toHaveBeenCalledWith("user@example.com", {
        otp: "123456",
        newPassword: "newpass1",
        confirmNewPassword: "newpass1",
      })
    );
  });

  it("shows error and clears OTP on invalid code", async () => {
    mockReset.mockResolvedValue({
      error: "Invalid or expired code. Please try again.",
    });
    await goToResetStep();
    await user.type(screen.getByTestId("otp-input"), "000000");
    await user.type(screen.getByLabelText(/^new password$/i), "newpass1");
    await user.type(screen.getByLabelText(/confirm new password/i), "newpass1");
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
    );
    expect(screen.getByTestId("otp-input")).toHaveValue("");
  });

  it("shows password mismatch error without calling resetPasswordAction", async () => {
    await goToResetStep();
    await user.type(screen.getByTestId("otp-input"), "123456");
    await user.type(screen.getByLabelText(/^new password$/i), "newpass1");
    await user.type(
      screen.getByLabelText(/confirm new password/i),
      "different1"
    );
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
    expect(mockReset).not.toHaveBeenCalled();
  });
});
