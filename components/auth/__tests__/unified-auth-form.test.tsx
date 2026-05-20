import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRequestOtpAction = jest.fn();
const mockVerifyOtpAction = jest.fn();

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
  async function navigateToOtpStep() {
    render(<UnifiedAuthForm />);
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
});
