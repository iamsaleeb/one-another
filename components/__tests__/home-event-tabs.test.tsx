import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeEventTabs } from "@/components/home-event-tabs";
import type { EventCardItem } from "@/types/pagination";

jest.mock("@/components/infinite-event-list", () => ({
  InfiniteEventList: ({
    title,
    emptyMessage,
    initialItems,
  }: {
    title?: string;
    emptyMessage?: string;
    initialItems: EventCardItem[];
  }) => (
    <div data-testid="infinite-list">
      {title && <span data-testid="list-title">{title}</span>}
      {initialItems.length === 0 && emptyMessage && (
        <span data-testid="empty-msg">{emptyMessage}</span>
      )}
      {initialItems.map((i) => (
        <div key={i.id} data-testid="event-item">
          {i.title}
        </div>
      ))}
    </div>
  ),
}));

jest.mock("lucide-react", () => ({
  CalendarDays: () => null,
  LogIn: () => null,
}));

const makeItem = (id: string): EventCardItem => ({
  id,
  title: `Event ${id}`,
  datetime: null,
  tag: "Worship",
  host: null,
  church: { name: "Test Church" },
});

const emptyPage = { items: [], nextCursor: null };
const loadMore = jest.fn();

describe("HomeEventTabs", () => {
  beforeEach(() => jest.clearAllMocks());

  it("defaults to 'other' tab when defaultTab is 'other'", () => {
    render(
      <HomeEventTabs
        defaultTab="other"
        followedPage={emptyPage}
        otherPage={{ items: [makeItem("1")], nextCursor: null }}
        isAuthenticated={false}
        loadMoreFollowed={loadMore}
        loadMoreOther={loadMore}
      />
    );
    expect(screen.getByRole("tab", { name: "Other events" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  it("defaults to 'followed' tab when defaultTab is 'followed'", () => {
    render(
      <HomeEventTabs
        defaultTab="followed"
        followedPage={{ items: [makeItem("1")], nextCursor: null }}
        otherPage={emptyPage}
        isAuthenticated={true}
        loadMoreFollowed={loadMore}
        loadMoreOther={loadMore}
      />
    );
    expect(screen.getByRole("tab", { name: "Your churches" })).toHaveAttribute(
      "data-state",
      "active"
    );
  });

  it("shows sign-in prompt on 'Your churches' tab when not authenticated", () => {
    render(
      <HomeEventTabs
        defaultTab="followed"
        followedPage={emptyPage}
        otherPage={emptyPage}
        isAuthenticated={false}
        loadMoreFollowed={loadMore}
        loadMoreOther={loadMore}
      />
    );
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it("shows empty state on 'Your churches' tab when authenticated with no events", async () => {
    render(
      <HomeEventTabs
        defaultTab="other"
        followedPage={emptyPage}
        otherPage={emptyPage}
        isAuthenticated={true}
        loadMoreFollowed={loadMore}
        loadMoreOther={loadMore}
      />
    );
    // Switch to the followed tab
    const user = userEvent.setup();
    await user.click(screen.getByRole("tab", { name: "Your churches" }));
    expect(
      screen.getByText(/no upcoming events from churches you follow/i)
    ).toBeInTheDocument();
  });

  it("renders followed events when present", () => {
    render(
      <HomeEventTabs
        defaultTab="followed"
        followedPage={{
          items: [makeItem("a"), makeItem("b")],
          nextCursor: null,
        }}
        otherPage={emptyPage}
        isAuthenticated={true}
        loadMoreFollowed={loadMore}
        loadMoreOther={loadMore}
      />
    );
    expect(screen.getAllByTestId("event-item")).toHaveLength(2);
  });
});
