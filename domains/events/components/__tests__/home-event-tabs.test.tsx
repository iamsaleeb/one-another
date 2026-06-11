import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeEventTabs } from "@/domains/events/components/home-event-tabs";
import type { EventCardItem } from "@/lib/types/pagination";

jest.mock("@/domains/events/components/infinite-event-list", () => ({
  InfiniteEventList: ({
    emptyMessage,
    initialItems,
  }: {
    emptyMessage?: string;
    initialItems: EventCardItem[];
  }) => (
    <div data-testid="infinite-list">
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

jest.mock("lucide-react", () => ({ CalendarDays: () => null }));

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

const guestProps = {
  defaultFilter: "other" as const,
  followedPage: emptyPage,
  otherPage: { items: [makeItem("1")], nextCursor: null },
  savedPage: emptyPage,
  isAuthenticated: false,
  loadMoreFollowed: loadMore,
  loadMoreOther: loadMore,
  loadMoreSaved: loadMore,
};

const authProps = {
  defaultFilter: "followed" as const,
  followedPage: { items: [makeItem("f1")], nextCursor: null },
  otherPage: { items: [makeItem("o1")], nextCursor: null },
  savedPage: { items: [makeItem("s1")], nextCursor: null },
  isAuthenticated: true,
  loadMoreFollowed: loadMore,
  loadMoreOther: loadMore,
  loadMoreSaved: loadMore,
};

describe("HomeEventTabs", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("unauthenticated", () => {
    it("renders event list with no filter buttons", () => {
      render(<HomeEventTabs {...guestProps} />);
      expect(
        screen.queryByRole("button", { name: "Your churches" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "All events" })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Saved" })
      ).not.toBeInTheDocument();
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event 1");
    });

    it("does not show Saved button", () => {
      render(<HomeEventTabs {...guestProps} />);
      expect(screen.queryByText("Saved")).not.toBeInTheDocument();
    });
  });

  describe("authenticated", () => {
    it("shows three buttons", () => {
      render(<HomeEventTabs {...authProps} />);
      expect(
        screen.getByRole("button", { name: "Your churches" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "All events" })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Saved" })).toBeInTheDocument();
    });

    it("activates defaultFilter button on mount", () => {
      render(<HomeEventTabs {...authProps} />);
      expect(
        screen.getByRole("button", { name: "Your churches" })
      ).toHaveAttribute("data-state", "on");
      expect(
        screen.getByRole("button", { name: "All events" })
      ).toHaveAttribute("data-state", "off");
    });

    it("defaults to All events when defaultFilter is 'other'", () => {
      render(<HomeEventTabs {...authProps} defaultFilter="other" />);
      expect(
        screen.getByRole("button", { name: "All events" })
      ).toHaveAttribute("data-state", "on");
    });

    it("shows followed events when Your churches is active", () => {
      render(<HomeEventTabs {...authProps} />);
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event f1");
    });

    it("switches to All events list on click", async () => {
      const user = userEvent.setup();
      render(<HomeEventTabs {...authProps} />);
      await user.click(screen.getByRole("button", { name: "All events" }));
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event o1");
    });

    it("switches to Saved list on click", async () => {
      const user = userEvent.setup();
      render(<HomeEventTabs {...authProps} />);
      await user.click(screen.getByRole("button", { name: "Saved" }));
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event s1");
    });

    it("deselection guard: clicking active button keeps same list visible", async () => {
      const user = userEvent.setup();
      render(<HomeEventTabs {...authProps} />);
      // Your churches is active, click it again
      await user.click(screen.getByRole("button", { name: "Your churches" }));
      // Should still show followed events, not empty
      expect(screen.getByTestId("event-item")).toHaveTextContent("Event f1");
    });

    it("shows empty state message when followed page has no events", async () => {
      const user = userEvent.setup();
      render(
        <HomeEventTabs
          {...authProps}
          followedPage={emptyPage}
          defaultFilter="other"
        />
      );
      await user.click(screen.getByRole("button", { name: "Your churches" }));
      expect(
        screen.getByText(/no upcoming events from churches you follow/i)
      ).toBeInTheDocument();
    });
  });
});
