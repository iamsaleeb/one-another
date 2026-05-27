import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockFollowChurchAction = jest.fn();
const mockUnfollowChurchAction = jest.fn();

jest.mock("@/domains/churches/actions/churches", () => ({
  followChurchAction: (...args: unknown[]) => mockFollowChurchAction(...args),
  unfollowChurchAction: (...args: unknown[]) =>
    mockUnfollowChurchAction(...args),
}));

jest.mock("lucide-react", () => ({ Check: () => null }));

import { FollowButton } from "../follow-button";

beforeEach(() => {
  jest.clearAllMocks();
  mockFollowChurchAction.mockResolvedValue(undefined);
  mockUnfollowChurchAction.mockResolvedValue(undefined);
});

const LOGIN_URL =
  "/login?callbackUrl=/churches/ch-1&intent=follow&label=Grace+Church";

describe("FollowButton — guest (not authenticated)", () => {
  it("redirects to loginUrl when clicked", async () => {
    render(
      <FollowButton
        churchId="ch-1"
        isFollowing={false}
        isAuthenticated={false}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /follow/i }));
    expect(mockPush).toHaveBeenCalledWith(LOGIN_URL);
  });

  it("does not call server action when guest clicks", async () => {
    render(
      <FollowButton
        churchId="ch-1"
        isFollowing={false}
        isAuthenticated={false}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /follow/i }));
    expect(mockFollowChurchAction).not.toHaveBeenCalled();
    expect(mockUnfollowChurchAction).not.toHaveBeenCalled();
  });
});

describe("FollowButton — authenticated", () => {
  it("calls followChurchAction when not following", async () => {
    render(
      <FollowButton
        churchId="ch-1"
        isFollowing={false}
        isAuthenticated={true}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /follow/i }));
    expect(mockFollowChurchAction).toHaveBeenCalledWith("ch-1");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls unfollowChurchAction when already following", async () => {
    render(
      <FollowButton
        churchId="ch-1"
        isFollowing={true}
        isAuthenticated={true}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /following/i }));
    expect(mockUnfollowChurchAction).toHaveBeenCalledWith("ch-1");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows 'Following' with outline variant when isFollowing", () => {
    render(
      <FollowButton
        churchId="ch-1"
        isFollowing={true}
        isAuthenticated={true}
        loginUrl={LOGIN_URL}
      />
    );
    expect(
      screen.getByRole("button", { name: /following/i })
    ).toBeInTheDocument();
  });
});
