// The rules live in the Event lifecycle (see __tests__/attendance.db.test.ts);
// this covers only how the registration form becomes a Registration.
jest.mock("@/domains/events/lifecycle", () => ({
  attendEvent: jest.fn(),
  unattendEvent: jest.fn(),
}));

import { registerEventAction } from "@/domains/events/actions/attendance";
import { attendEvent } from "@/domains/events/lifecycle";

const mockAttendEvent = attendEvent as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockAttendEvent.mockResolvedValue({});
});

describe("registerEventAction", () => {
  it("attends with the form's details and trimmed answers", async () => {
    const result = await registerEventAction("evt-1", {
      phone: "07700000000",
      notes: "Vegetarian",
      responses: {
        q1: { answer: "  yes ", fileUrl: null },
        q2: { answer: "   ", fileUrl: "https://example.com/file.pdf" },
      },
    });

    expect(mockAttendEvent).toHaveBeenCalledWith("evt-1", {
      phone: "07700000000",
      notes: "Vegetarian",
      selectedDays: undefined,
      responses: [
        { questionId: "q1", answer: "yes", fileUrl: null },
        {
          questionId: "q2",
          answer: null,
          fileUrl: "https://example.com/file.pdf",
        },
      ],
    });
    expect(result).toEqual({ success: true });
  });

  it("passes the lifecycle's refusal through", async () => {
    mockAttendEvent.mockResolvedValue({
      error: "Sorry, this event is fully booked.",
    });

    expect(await registerEventAction("evt-1", {})).toEqual({
      error: "Sorry, this event is fully booked.",
    });
  });
});
