jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
}));

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/domains/events/dal/attendance", () => ({
  attendEvent: jest.fn(),
  unattendEvent: jest.fn(),
  registerEvent: jest.fn(),
}));

import { updateTag } from "next/cache";
import {
  attendEventAction,
  unattendEventAction,
  registerEventAction,
} from "@/domains/events/actions/attendance";
import { auth } from "@/auth";
import {
  registerEvent as _registerEvent,
  attendEvent as _attendEvent,
  unattendEvent as _unattendEvent,
} from "@/domains/events/dal/attendance";

const mockUpdateTag = updateTag as jest.Mock;
const mockAuth = auth as jest.Mock;
const mockRegisterEvent = _registerEvent as jest.Mock;
const mockAttendEvent = _attendEvent as jest.Mock;
const mockUnattendEvent = _unattendEvent as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: {
      id: "user-1",
      onboardingCompleted: true,
      isEmailVerified: true,
    },
  });
  mockAttendEvent.mockResolvedValue({});
  mockUnattendEvent.mockResolvedValue({});
  mockRegisterEvent.mockResolvedValue({ success: true });
});

describe("attendEventAction", () => {
  it("calls attendEvent DAL and invalidates event cache tags", async () => {
    await attendEventAction("evt-1");

    expect(mockAttendEvent).toHaveBeenCalledWith("evt-1", "user-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("returns an error from the DAL when the event is not found or a draft", async () => {
    mockAttendEvent.mockResolvedValue({ error: "Event not found." });

    const result = await attendEventAction("evt-1");

    expect(result.error).toBeDefined();
  });

  it("returns an error when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await attendEventAction("evt-1");

    expect(result.error).toBeDefined();
    expect(mockAttendEvent).not.toHaveBeenCalled();
  });
});

describe("unattendEventAction", () => {
  it("calls unattendEvent DAL and invalidates event cache tags", async () => {
    await unattendEventAction("evt-1");

    expect(mockUnattendEvent).toHaveBeenCalledWith("evt-1", "user-1");
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("returns an error when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await unattendEventAction("evt-1");

    expect(result.error).toBeDefined();
    expect(mockUnattendEvent).not.toHaveBeenCalled();
  });
});

describe("registerEventAction", () => {
  it("calls registerEvent DAL with phone and notes, returns success", async () => {
    const result = await registerEventAction("evt-1", {
      phone: "07700000000",
      notes: "Vegetarian",
    });

    expect(mockRegisterEvent).toHaveBeenCalledWith(
      "evt-1",
      "user-1",
      expect.objectContaining({ phone: "07700000000", notes: "Vegetarian" })
    );
    expect(result.success).toBe(true);
    expect(mockUpdateTag).toHaveBeenCalledWith("event-evt-1");
  });

  it("calls registerEvent DAL with no optional fields when form is empty", async () => {
    const result = await registerEventAction("evt-1", {});

    expect(mockRegisterEvent).toHaveBeenCalledWith(
      "evt-1",
      "user-1",
      expect.objectContaining({ phone: undefined, notes: undefined })
    );
    expect(result.success).toBe(true);
  });

  it("returns an error when the user is not signed in", async () => {
    mockAuth.mockResolvedValue(null);

    const result = await registerEventAction("evt-1", {});

    expect(result.error).toBeDefined();
    expect(mockRegisterEvent).not.toHaveBeenCalled();
  });

  it("returns a DAL error when the event is a draft or does not exist", async () => {
    mockRegisterEvent.mockResolvedValue({ error: "Event not found." });

    const result = await registerEventAction("evt-1", {});

    expect(result.error).toBeDefined();
  });

  it("returns a fully booked error from the DAL", async () => {
    mockRegisterEvent.mockResolvedValue({
      error: "Sorry, this event is fully booked.",
    });

    const result = await registerEventAction("evt-1", {});

    expect(result.error).toBe("Sorry, this event is fully booked.");
  });

  it("passes mapped responses to registerEvent", async () => {
    await registerEventAction("evt-1", {
      responses: {
        q1: { answer: "yes", fileUrl: null },
        q2: { answer: null, fileUrl: "https://example.com/file.pdf" },
      },
    });
    expect(mockRegisterEvent).toHaveBeenCalledWith(
      "evt-1",
      expect.any(String), // userId
      expect.objectContaining({
        responses: expect.arrayContaining([
          { questionId: "q1", answer: "yes", fileUrl: null },
          {
            questionId: "q2",
            answer: null,
            fileUrl: "https://example.com/file.pdf",
          },
        ]),
      })
    );
  });
});
