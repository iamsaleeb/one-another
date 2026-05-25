import { render, screen, act, waitFor } from "@testing-library/react";
import { InfiniteEventList } from "@/domains/events/components/infinite-event-list";
import type { EventCardItem } from "@/types/pagination";

// Mock EventCard to keep tests simple
jest.mock("@/domains/events/components/event-card", () => ({
  EventCard: ({ event }: { event: { title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));

// Mock EmptyState
jest.mock("@/components/empty-state", () => ({
  EmptyState: ({ label }: { label: string }) => (
    <div data-testid="empty-state">{label}</div>
  ),
}));

// Mock Skeleton
jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

// Mock lucide icon used by EmptyState
jest.mock("lucide-react", () => ({ CalendarDays: () => null }));

const makeItem = (id: string): EventCardItem => ({
  id,
  title: `Event ${id}`,
  datetime: null,
  tag: "Worship",
  host: null,
  church: { name: "Test Church" },
});

let intersectionCallback: (
  entries: IntersectionObserverEntry[]
) => void = () => {};

beforeEach(() => {
  jest.clearAllMocks();
  global.IntersectionObserver = jest.fn((cb) => {
    intersectionCallback = cb;
    return {
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    };
  }) as unknown as typeof IntersectionObserver;
});

describe("InfiniteEventList", () => {
  it("renders all initial items", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1"), makeItem("2")]}
        initialCursor={null}
        loadMore={jest.fn()}
      />
    );
    expect(screen.getAllByTestId("event-card")).toHaveLength(2);
  });

  it("renders the title when provided", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor={null}
        loadMore={jest.fn()}
        title="Upcoming Events"
      />
    );
    expect(screen.getByText("Upcoming Events")).toBeInTheDocument();
  });

  it("shows empty state when no items and no cursor", () => {
    render(
      <InfiniteEventList
        initialItems={[]}
        initialCursor={null}
        loadMore={jest.fn()}
        emptyMessage="Nothing here"
      />
    );
    expect(screen.getByTestId("empty-state")).toHaveTextContent("Nothing here");
  });

  it("does not show empty state when items exist", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor={null}
        loadMore={jest.fn()}
      />
    );
    expect(screen.queryByTestId("empty-state")).not.toBeInTheDocument();
  });

  it("does not render sentinel when cursor is null", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor={null}
        loadMore={jest.fn()}
      />
    );
    // No IntersectionObserver should be created
    expect(global.IntersectionObserver).not.toHaveBeenCalled();
  });

  it("sets up IntersectionObserver when cursor is not null", () => {
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={jest.fn()}
      />
    );
    expect(global.IntersectionObserver).toHaveBeenCalled();
  });

  it("calls loadMore with current cursor when sentinel intersects", async () => {
    const loadMore = jest
      .fn()
      .mockResolvedValue({ items: [], nextCursor: null });
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await waitFor(() => {
      expect(loadMore).toHaveBeenCalledWith("cursor-1");
    });
  });

  it("appends new items after loadMore resolves", async () => {
    const loadMore = jest.fn().mockResolvedValue({
      items: [makeItem("2"), makeItem("3")],
      nextCursor: null,
    });
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await waitFor(() => {
      expect(screen.getAllByTestId("event-card")).toHaveLength(3);
    });
  });

  it("does not call loadMore when isIntersecting is false", async () => {
    const loadMore = jest.fn();
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: false } as IntersectionObserverEntry,
      ]);
    });
    expect(loadMore).not.toHaveBeenCalled();
  });

  it("stops setting up observer after nextCursor becomes null", async () => {
    const loadMore = jest
      .fn()
      .mockResolvedValue({ items: [makeItem("2")], nextCursor: null });
    render(
      <InfiniteEventList
        initialItems={[makeItem("1")]}
        initialCursor="cursor-1"
        loadMore={loadMore}
      />
    );
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    await waitFor(() => expect(loadMore).toHaveBeenCalledTimes(1));
    // After cursor becomes null the observer should not be re-registered
    act(() => {
      intersectionCallback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ]);
    });
    expect(loadMore).toHaveBeenCalledTimes(1);
  });
});
