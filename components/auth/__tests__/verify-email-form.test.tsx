import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions/auth", () => ({
  verifyRegistrationOtpAction: jest.fn(),
  registerAction: jest.fn(),
}));

jest.mock("@/components/ui/input-otp", () => ({
  InputOTP: ({
    value,
    onChange,
    onComplete,
    maxLength,
    disabled,
  }: {
    value: string;
    onChange: (v: string) => void;
    onComplete?: (v: string) => void;
    maxLength: number;
    disabled?: boolean;
  }) => (
    <input
      data-testid="otp-input"
      value={value}
      maxLength={maxLength}
      disabled={disabled}
      onChange={(e) => {
        onChange(e.target.value);
        if (e.target.value.length === maxLength && onComplete) {
          onComplete(e.target.value);
        }
      }}
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

import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import {
  verifyRegistrationOtpAction,
  registerAction,
} from "@/lib/actions/auth";

const mockVerify = verifyRegistrationOtpAction as jest.Mock;
const mockRegister = registerAction as jest.Mock;

const user = userEvent.setup({ delay: null });

const defaultProps = {
  email: "jane@example.com",
  password: "securepass",
  registrationData: {
    name: "Jane Doe",
    email: "jane@example.com",
    password: "securepass",
    confirmPassword: "securepass",
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({});
  mockRegister.mockResolvedValue({ pendingVerification: true });
});

describe("VerifyEmailForm", () => {
  it("displays the user email in the description", () => {
    render(<VerifyEmailForm {...defaultProps} />);
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
  });

  it("renders the OTP input and verify button", () => {
    render(<VerifyEmailForm {...defaultProps} />);
    expect(screen.getByTestId("otp-input")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /verify email/i })
    ).toBeInTheDocument();
  });

  it("renders the resend button as disabled initially", () => {
    render(<VerifyEmailForm {...defaultProps} />);
    expect(screen.getByRole("button", { name: /resend in/i })).toBeDisabled();
  });

  it("enables the resend button after the 60s cooldown", async () => {
    jest.useFakeTimers();
    render(<VerifyEmailForm {...defaultProps} />);
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

  // Typing 6 digits triggers onComplete which auto-submits — covers both manual and auto paths
  it("calls verifyRegistrationOtpAction when 6 digits are entered", async () => {
    render(<VerifyEmailForm {...defaultProps} />);
    await user.type(screen.getByTestId("otp-input"), "123456");
    await waitFor(() =>
      expect(mockVerify).toHaveBeenCalledWith(
        "jane@example.com",
        "123456",
        "securepass"
      )
    );
  });

  it("shows error message and clears OTP on invalid code", async () => {
    mockVerify.mockResolvedValue({
      error: "Invalid or expired code. Please try again.",
    });
    render(<VerifyEmailForm {...defaultProps} />);
    await user.type(screen.getByTestId("otp-input"), "000000");
    await waitFor(() =>
      expect(screen.getByText(/invalid or expired code/i)).toBeInTheDocument()
    );
    expect(screen.getByTestId("otp-input")).toHaveValue("");
  });

  it("calls registerAction when resend code is clicked after cooldown", async () => {
    jest.useFakeTimers();
    render(<VerifyEmailForm {...defaultProps} />);
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
    await user.click(screen.getByRole("button", { name: /resend code/i }));
    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith(defaultProps.registrationData)
    );
  });
});
