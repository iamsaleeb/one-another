import { render, screen, act, waitFor } from "@testing-library/react";
import { NotificationList } from "../notification-list";
import { markReadAction } from "@/domains/notifications/actions/notifications";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

jest.mock("@/domains/notifications/actions/notifications", () => ({
  markReadAction: jest.fn().mockResolvedValue(undefined),
  loadMoreNotificationsAction: jest.fn(),
}));

const mockMarkReadAction = jest.mocked(markReadAction);

jest.mock("@/domains/notifications/components/notification-item", () => ({
  NotificationItem: ({ notification }: { notification: { id: string } }) => (
    <div data-testid={`notification-${notification.id}`} />
  ),
}));

const unreadNotification = {
  id: "1",
  type: "EVENT_REMINDER",
  title: "Test event",
  body: "Starting soon",
  data: null,
  sentAt: new Date().toISOString(),
  readAt: null,
};

const readNotification = {
  id: "2",
  type: "EVENT_REMINDER",
  title: "Past event",
  body: "Already read",
  data: null,
  sentAt: new Date().toISOString(),
  readAt: new Date().toISOString(),
};

beforeEach(() => jest.clearAllMocks());

describe("NotificationList", () => {
  describe("filter='all' (default)", () => {
    it("calls markReadAction on mount when there are unread notifications", async () => {
      render(
        <NotificationList
          initialNotifications={[unreadNotification]}
          hasMore={false}
          filter="all"
        />
      );
      await waitFor(() => {
        expect(mockMarkReadAction).toHaveBeenCalled();
      });
    });

    it("does not call markReadAction when all notifications are already read", async () => {
      render(
        <NotificationList
          initialNotifications={[readNotification]}
          hasMore={false}
          filter="all"
        />
      );
      await act(async () => {});
      expect(mockMarkReadAction).not.toHaveBeenCalled();
    });
  });

  describe("filter='unread'", () => {
    it("does not call markReadAction even when there are unread notifications", async () => {
      render(
        <NotificationList
          initialNotifications={[unreadNotification]}
          hasMore={false}
          filter="unread"
        />
      );
      await act(async () => {});
      expect(mockMarkReadAction).not.toHaveBeenCalled();
    });

    it("only displays notifications where readAt is null", () => {
      render(
        <NotificationList
          initialNotifications={[unreadNotification, readNotification]}
          hasMore={false}
          filter="unread"
        />
      );
      expect(screen.getByTestId("notification-1")).toBeInTheDocument();
      expect(screen.queryByTestId("notification-2")).not.toBeInTheDocument();
    });
  });

  describe("filter='requests'", () => {
    it("renders empty state without calling markReadAction", async () => {
      render(
        <NotificationList
          initialNotifications={[unreadNotification]}
          hasMore={false}
          filter="requests"
        />
      );
      expect(mockMarkReadAction).not.toHaveBeenCalled();
      expect(screen.getByText("No requests yet")).toBeInTheDocument();
    });
  });
});
