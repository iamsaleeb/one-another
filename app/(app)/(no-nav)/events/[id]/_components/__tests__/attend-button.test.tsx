import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockPush = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockAttendEventAction = jest.fn();
const mockUnattendEventAction = jest.fn();

jest.mock("@/lib/actions/events-attendance", () => ({
  attendEventAction: (...args: unknown[]) => mockAttendEventAction(...args),
  unattendEventAction: (...args: unknown[]) => mockUnattendEventAction(...args),
}));

jest.mock("lucide-react", () => ({ Check: () => null }));

import { AttendButton } from "../attend-button";

beforeEach(() => {
  jest.clearAllMocks();
  mockAttendEventAction.mockResolvedValue(undefined);
  mockUnattendEventAction.mockResolvedValue(undefined);
});

const LOGIN_URL = "/login?callbackUrl=/events/evt-1&intent=attend&label=Test";

describe("AttendButton — guest (not authenticated)", () => {
  it("redirects to loginUrl when clicked", async () => {
    render(
      <AttendButton
        eventId="evt-1"
        isAttending={false}
        isAuthenticated={false}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /attend/i }));
    expect(mockPush).toHaveBeenCalledWith(LOGIN_URL);
  });

  it("does not call server action when guest clicks", async () => {
    render(
      <AttendButton
        eventId="evt-1"
        isAttending={false}
        isAuthenticated={false}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /attend/i }));
    expect(mockAttendEventAction).not.toHaveBeenCalled();
    expect(mockUnattendEventAction).not.toHaveBeenCalled();
  });
});

describe("AttendButton — authenticated", () => {
  it("calls attendEventAction when not attending", async () => {
    render(
      <AttendButton
        eventId="evt-1"
        isAttending={false}
        isAuthenticated={true}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /attend/i }));
    expect(mockAttendEventAction).toHaveBeenCalledWith("evt-1");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("calls unattendEventAction when already attending", async () => {
    render(
      <AttendButton
        eventId="evt-1"
        isAttending={true}
        isAuthenticated={true}
        loginUrl={LOGIN_URL}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /attending/i }));
    expect(mockUnattendEventAction).toHaveBeenCalledWith("evt-1");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows 'Attending' with outline variant when isAttending", () => {
    render(
      <AttendButton
        eventId="evt-1"
        isAttending={true}
        isAuthenticated={true}
        loginUrl={LOGIN_URL}
      />
    );
    expect(
      screen.getByRole("button", { name: /attending/i })
    ).toBeInTheDocument();
  });
});
