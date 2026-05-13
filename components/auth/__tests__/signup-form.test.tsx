import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

jest.mock("@/lib/actions/auth", () => ({
  registerAction: jest.fn(),
  verifyRegistrationOtpAction: jest.fn(),
}));

jest.mock("@/components/auth/verify-email-form", () => ({
  VerifyEmailForm: ({ email }: { email: string }) => (
    <div data-testid="verify-email-form">OTP form for {email}</div>
  ),
}));

import { SignupForm } from "@/components/auth/signup-form";
import { registerAction } from "@/lib/actions/auth";

const mockRegisterAction = registerAction as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockRegisterAction.mockResolvedValue({});
});

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText(/full name/i), "Jane Doe");
  await userEvent.type(screen.getByLabelText(/^email$/i), "jane@example.com");
  await userEvent.type(screen.getByLabelText(/^password$/i), "securepass");
  await userEvent.type(
    screen.getByLabelText(/confirm password/i),
    "securepass"
  );
}

describe("SignupForm", () => {
  it("renders all four input fields", () => {
    render(<SignupForm />);
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^email$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it("renders the create account button", () => {
    render(<SignupForm />);
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });

  it("renders a link back to the login page", () => {
    render(<SignupForm />);
    expect(screen.getByRole("link", { name: /sign in/i })).toHaveAttribute(
      "href",
      "/login"
    );
  });

  it("shows name field error when name is too short", async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/full name/i), "J");
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );
    await waitFor(() =>
      expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument()
    );
    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  it("shows password mismatch error", async () => {
    render(<SignupForm />);
    await userEvent.type(screen.getByLabelText(/full name/i), "Jane Doe");
    await userEvent.type(screen.getByLabelText(/^email$/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/^password$/i), "securepass");
    await userEvent.type(
      screen.getByLabelText(/confirm password/i),
      "different"
    );
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );
    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    );
    expect(mockRegisterAction).not.toHaveBeenCalled();
  });

  it("shows a global error returned from the server action", async () => {
    mockRegisterAction.mockResolvedValue({ error: "Something went wrong." });
    render(<SignupForm />);
    await fillValidForm();
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );
    await waitFor(() =>
      expect(screen.getByText("Something went wrong.")).toBeInTheDocument()
    );
  });

  it("shows email field error returned from the server action", async () => {
    mockRegisterAction.mockResolvedValue({
      fieldErrors: { email: ["An account with this email already exists."] },
    });
    render(<SignupForm />);
    await fillValidForm();
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );
    await waitFor(() =>
      expect(
        screen.getByText("An account with this email already exists.")
      ).toBeInTheDocument()
    );
  });

  it("calls registerAction with typed data on valid submission", async () => {
    render(<SignupForm />);
    await fillValidForm();
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );
    await waitFor(() =>
      expect(mockRegisterAction).toHaveBeenCalledWith({
        name: "Jane Doe",
        email: "jane@example.com",
        password: "securepass",
        confirmPassword: "securepass",
      })
    );
  });

  it("transitions to the OTP step when registerAction returns pendingVerification", async () => {
    mockRegisterAction.mockResolvedValue({ pendingVerification: true });
    render(<SignupForm />);
    await fillValidForm();
    await userEvent.click(
      screen.getByRole("button", { name: /create account/i })
    );
    await waitFor(() =>
      expect(screen.getByTestId("verify-email-form")).toBeInTheDocument()
    );
    expect(screen.getByText(/jane@example.com/)).toBeInTheDocument();
  });

  it("updates name field value on change", async () => {
    render(<SignupForm />);
    const nameInput = screen.getByLabelText(/full name/i);
    await userEvent.type(nameInput, "Jane Doe");
    expect(nameInput).toHaveValue("Jane Doe");
  });
});
