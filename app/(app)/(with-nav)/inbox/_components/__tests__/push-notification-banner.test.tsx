import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PushNotificationBanner } from "../push-notification-banner";

const mockCheckPermissions = jest.fn();
const mockRequestPermissions = jest.fn();
const mockAppAddListener = jest.fn();

jest.mock("@capacitor/core", () => ({
  Capacitor: {
    isNativePlatform: jest.fn().mockReturnValue(false),
    getPlatform: jest.fn().mockReturnValue("android"),
  },
}));

jest.mock("@capacitor/app", () => ({
  App: {
    addListener: (...args: unknown[]) => mockAppAddListener(...args),
  },
}));

jest.mock("@capacitor/push-notifications", () => ({
  PushNotifications: {
    checkPermissions: (...args: unknown[]) => mockCheckPermissions(...args),
    requestPermissions: (...args: unknown[]) => mockRequestPermissions(...args),
  },
}));

const { Capacitor } = jest.requireMock("@capacitor/core") as {
  Capacitor: { isNativePlatform: jest.Mock; getPlatform: jest.Mock };
};

beforeEach(() => {
  jest.clearAllMocks();
  sessionStorage.clear();
  Capacitor.isNativePlatform.mockReturnValue(false);
  mockAppAddListener.mockResolvedValue({ remove: jest.fn() });
});

describe("PushNotificationBanner", () => {
  it("renders nothing on web", () => {
    Capacitor.isNativePlatform.mockReturnValue(false);

    const { container } = render(<PushNotificationBanner />);

    expect(container.firstChild).toBeNull();
    expect(mockCheckPermissions).not.toHaveBeenCalled();
  });

  it("renders nothing when permissions already granted", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "granted" });

    const { container } = render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    expect(container.firstChild).toBeNull();
  });

  it('shows banner when permission is "prompt"', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "prompt" });

    render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    expect(screen.getByText("Notifications are off")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Enable push notifications so you never miss an event update."
      )
    ).toBeInTheDocument();
  });

  it('shows banner when permission is "denied"', async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "denied" });

    render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    expect(screen.getByText("Notifications are off")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Push notifications are disabled. If prompted, allow notifications to stay up to date."
      )
    ).toBeInTheDocument();
  });

  it("requests permissions when enable button clicked", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "prompt" });
    // Return denied to avoid triggering window.location.reload in test
    mockRequestPermissions.mockResolvedValue({ receive: "denied" });

    render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    await act(async () => {
      await userEvent.click(screen.getByText("Enable notifications"));
    });

    expect(mockRequestPermissions).toHaveBeenCalled();
  });

  it("updates state to denied when permission request denied", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "prompt" });
    mockRequestPermissions.mockResolvedValue({ receive: "denied" });

    render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    await act(async () => {
      await userEvent.click(screen.getByText("Enable notifications"));
    });

    expect(
      screen.getByText(
        "Push notifications are disabled. If prompted, allow notifications to stay up to date."
      )
    ).toBeInTheDocument();
  });

  it("persists dismissal in sessionStorage", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "prompt" });

    render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    await act(async () => {
      await userEvent.click(screen.getByLabelText("Dismiss"));
    });

    expect(sessionStorage.getItem("push-banner-dismissed")).toBe("1");
    expect(screen.queryByText("Notifications are off")).not.toBeInTheDocument();
  });

  it("stays hidden when sessionStorage has dismiss flag", async () => {
    sessionStorage.setItem("push-banner-dismissed", "1");
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "denied" });

    const { container } = render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    expect(container.firstChild).toBeNull();
  });

  it("listens for app resume via Capacitor App plugin", async () => {
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "denied" });

    render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    expect(mockAppAddListener).toHaveBeenCalledWith(
      "resume",
      expect.any(Function)
    );
  });

  it("cleans up resume listener on unmount", async () => {
    const removeMock = jest.fn();
    mockAppAddListener.mockResolvedValue({ remove: removeMock });
    Capacitor.isNativePlatform.mockReturnValue(true);
    mockCheckPermissions.mockResolvedValue({ receive: "denied" });

    const { unmount } = render(<PushNotificationBanner />);
    await act(() => Promise.resolve());

    unmount();
    await act(() => Promise.resolve());

    expect(removeMock).toHaveBeenCalled();
  });
});
