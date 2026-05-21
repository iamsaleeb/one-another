import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRequestOtpAction = jest.fn();
const mockVerifyOtpAction = jest.fn();
const mockRouterPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

jest.mock("@/lib/actions/auth", () => ({
  requestOtpAction: (...args: unknown[]) => mockRequestOtpAction(...args),
  verifyOtpAction: (...args: unknown[]) => mockVerifyOtpAction(...args),
}));

jest.mock("@/components/auth/social-auth-buttons", () => ({
  SocialAuthButtons: () => <div data-testid="social-auth-buttons" />,
}));

jest.mock("next/link", () => {
  const MockLink = ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => <a href={href}>{children}</a>;
  MockLink.displayName = "MockLink";
  return MockLink;
});

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
    onComplete?: () => void;
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
          onComplete();
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

import { UnifiedAuthForm } from "@/components/auth/unified-auth-form";

beforeEach(() => {
  jest.clearAllMocks();
  mockRequestOtpAction.mockResolvedValue({});
  mockVerifyOtpAction.mockResolvedValue({});
});

describe("UnifiedAuthForm — email step", () => {
  it("renders email input and Continue button", () => {
    render(<UnifiedAuthForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue/i })
    ).toBeInTheDocument();
  });

  it("renders social auth buttons", () => {
    render(<UnifiedAuthForm />);
    expect(screen.getByTestId("social-auth-buttons")).toBeInTheDocument();
  });

  it("renders terms and privacy links", () => {
    render(<UnifiedAuthForm />);
    expect(
      screen.getByRole("link", { name: /terms of service/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /privacy policy/i })
    ).toBeInTheDocument();
  });

  it("calls requestOtpAction with email on submit", async () => {
    render(<UnifiedAuthForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(mockRequestOtpAction).toHaveBeenCalledWith({
        email: "user@example.com",
      });
    });
  });

  it("shows OTP step after successful email submit", async () => {
    render(<UnifiedAuthForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it("shows error alert when requestOtpAction returns error", async () => {
    mockRequestOtpAction.mockResolvedValue({ error: "Too many requests" });
    render(<UnifiedAuthForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => {
      expect(screen.getByText("Too many requests")).toBeInTheDocument();
    });
  });
});

describe("UnifiedAuthForm — OTP step", () => {
  async function navigateToOtpStep(props: { devMode?: boolean } = {}) {
    render(<UnifiedAuthForm {...props} />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    await waitFor(() => screen.getByText(/check your email/i));
  }

  it("shows the email address in the OTP step description", async () => {
    await navigateToOtpStep();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
  });

  it("renders Verify button and resend link", async () => {
    await navigateToOtpStep();
    expect(screen.getByRole("button", { name: /verify/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /resend in/i })
    ).toBeInTheDocument();
  });

  it("renders Use a different email back button", async () => {
    await navigateToOtpStep();
    expect(
      screen.getByRole("button", { name: /use a different email/i })
    ).toBeInTheDocument();
  });

  it("returns to email step when back button clicked", async () => {
    await navigateToOtpStep();
    await userEvent.click(
      screen.getByRole("button", { name: /use a different email/i })
    );
    await waitFor(() => {
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });
  });

  it("calls router.push('/') on successful OTP verify", async () => {
    await navigateToOtpStep();
    await userEvent.type(screen.getByTestId("otp-input"), "123456");
    await waitFor(() => {
      expect(mockVerifyOtpAction).toHaveBeenCalledWith(
        "user@example.com",
        "123456"
      );
      expect(mockRouterPush).toHaveBeenCalledWith("/");
    });
  });

  it("does not call router.push on verify error", async () => {
    mockVerifyOtpAction.mockResolvedValue({ error: "Invalid code" });
    await navigateToOtpStep();
    await userEvent.type(screen.getByTestId("otp-input"), "000000");
    await waitFor(() => {
      expect(screen.getByText("Invalid code")).toBeInTheDocument();
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });

  it("shows dev hint with 000000 when devMode=true", async () => {
    await navigateToOtpStep({ devMode: true });
    expect(screen.getByText(/dev environment/i)).toBeInTheDocument();
    expect(screen.getByText("000000")).toBeInTheDocument();
  });

  it("does not show dev hint when devMode=false", async () => {
    await navigateToOtpStep({ devMode: false });
    expect(screen.queryByText(/dev environment/i)).not.toBeInTheDocument();
  });
});
