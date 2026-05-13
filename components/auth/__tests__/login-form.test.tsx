import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions/auth", () => ({
  loginAction: jest.fn(),
}));

import { LoginForm } from "@/components/auth/login-form";
import { loginAction } from "@/lib/actions/auth";

const mockLoginAction = loginAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockLoginAction.mockResolvedValue({});
});

describe("LoginForm", () => {
  it("renders email and password inputs", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it("renders the login button", () => {
    render(<LoginForm />);
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("renders a link to the register page", () => {
    render(<LoginForm />);
    expect(screen.getByRole("link", { name: /sign up/i })).toHaveAttribute(
      "href",
      "/register"
    );
  });

  it("renders a link to the forgot password page", () => {
    render(<LoginForm />);
    expect(
      screen.getByRole("link", { name: /forgot your password/i })
    ).toHaveAttribute("href", "/forgot-password");
  });

  it("shows email field error when email is invalid", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "bad-email");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() =>
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    );
    expect(mockLoginAction).not.toHaveBeenCalled();
  });

  it("shows password field error when password is empty", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() =>
      expect(screen.getByText(/password is required/i)).toBeInTheDocument()
    );
    expect(mockLoginAction).not.toHaveBeenCalled();
  });

  it("shows a global error message returned from the server action", async () => {
    mockLoginAction.mockResolvedValue({ error: "Invalid email or password." });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() =>
      expect(screen.getByText("Invalid email or password.")).toBeInTheDocument()
    );
  });

  it("shows verify email error and link to register when pendingVerification is true", async () => {
    mockLoginAction.mockResolvedValue({
      error: "Please verify your email before signing in.",
      pendingVerification: true,
    });
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "pass1234");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() =>
      expect(screen.getByText(/verify your email/i)).toBeInTheDocument()
    );
    expect(
      screen.getByRole("link", { name: /go to sign up to verify/i })
    ).toHaveAttribute("href", "/register");
  });

  it("calls loginAction with typed data on valid submission", async () => {
    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(/email/i), "user@example.com");
    await userEvent.type(screen.getByLabelText(/password/i), "hunter2");
    await userEvent.click(screen.getByRole("button", { name: /login/i }));
    await waitFor(() =>
      expect(mockLoginAction).toHaveBeenCalledWith({
        email: "user@example.com",
        password: "hunter2",
      })
    );
  });

  it("updates email input value on change", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/email/i);
    await userEvent.type(emailInput, "test@example.com");
    expect(emailInput).toHaveValue("test@example.com");
  });
});
