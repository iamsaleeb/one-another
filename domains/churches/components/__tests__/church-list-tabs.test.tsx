import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChurchListTabs } from "@/domains/churches/components/church-list-tabs";

jest.mock("@/domains/churches/components/follow-button", () => ({
  FollowButton: ({
    churchId,
    isFollowing,
  }: {
    churchId: string;
    isFollowing: boolean;
  }) => (
    <span data-testid={`follow-${churchId}`}>
      {isFollowing ? "Following" : "Follow"}
    </span>
  ),
}));

jest.mock("lucide-react", () => ({ Church: () => null, MapPin: () => null }));

const churches = [
  { id: "ch-1", name: "Grace Church", address: "1 Main St", photoUrl: null },
  { id: "ch-2", name: "Hope Church", address: null, photoUrl: null },
];

describe("ChurchListTabs", () => {
  it("shows every church on the All tab with its follow state", () => {
    render(
      <ChurchListTabs
        churches={churches}
        followedIds={["ch-2"]}
        isAuthenticated={true}
      />
    );
    expect(screen.getByText("Grace Church")).toBeInTheDocument();
    expect(screen.getByText("Hope Church")).toBeInTheDocument();
    expect(screen.getByText("1 Main St")).toBeInTheDocument();
    expect(screen.getByTestId("follow-ch-1")).toHaveTextContent("Follow");
    expect(screen.getByTestId("follow-ch-2")).toHaveTextContent("Following");
  });

  it("shows only followed churches on the Following tab", async () => {
    render(
      <ChurchListTabs
        churches={churches}
        followedIds={["ch-2"]}
        isAuthenticated={true}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Following" }));
    expect(screen.queryByText("Grace Church")).not.toBeInTheDocument();
    expect(screen.getByText("Hope Church")).toBeInTheDocument();
  });

  it("shows an empty message when following no churches", async () => {
    render(
      <ChurchListTabs
        churches={churches}
        followedIds={[]}
        isAuthenticated={true}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Following" }));
    expect(
      screen.getByText("You're not following any churches yet")
    ).toBeInTheDocument();
  });

  it("hides the tabs for guests and lists every church", () => {
    render(
      <ChurchListTabs
        churches={churches}
        followedIds={[]}
        isAuthenticated={false}
      />
    );
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("Grace Church")).toBeInTheDocument();
    expect(screen.getByText("Hope Church")).toBeInTheDocument();
  });
});
