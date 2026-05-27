import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockToastInfo = jest.fn();

jest.mock("sonner", () => ({
  toast: { info: (...args: unknown[]) => mockToastInfo(...args) },
}));

import { SocialAuthButtons } from "@/domains/auth/components/social-auth-buttons";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SocialAuthButtons", () => {
  it("renders Google, Apple, and Facebook buttons", () => {
    render(<SocialAuthButtons />);
    expect(
      screen.getByRole("button", { name: /continue with google/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with apple/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /continue with facebook/i })
    ).toBeInTheDocument();
  });

  it("shows Google coming soon toast on click", async () => {
    render(<SocialAuthButtons />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with google/i })
    );
    expect(mockToastInfo).toHaveBeenCalledWith("Google sign-in coming soon");
  });

  it("shows Apple coming soon toast on click", async () => {
    render(<SocialAuthButtons />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with apple/i })
    );
    expect(mockToastInfo).toHaveBeenCalledWith("Apple sign-in coming soon");
  });

  it("shows Facebook coming soon toast on click", async () => {
    render(<SocialAuthButtons />);
    await userEvent.click(
      screen.getByRole("button", { name: /continue with facebook/i })
    );
    expect(mockToastInfo).toHaveBeenCalledWith("Facebook sign-in coming soon");
  });
});
