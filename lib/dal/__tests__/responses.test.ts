jest.mock("@/lib/db", () => ({
  prisma: {
    eventQuestion: { findMany: jest.fn() },
    eventAttendeeResponse: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { saveResponses } from "@/lib/dal/responses";
import { prisma } from "@/lib/db";

const mockQuestionFindMany = prisma.eventQuestion.findMany as jest.Mock;
const mockResponseUpsert = prisma.eventAttendeeResponse.upsert as jest.Mock;
const mockTransaction = prisma.$transaction as jest.Mock;

const baseQuestions = [
  { id: "q-1", required: false },
  { id: "q-2", required: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockQuestionFindMany.mockResolvedValue(baseQuestions);
  // Array-form $transaction — execute all ops
  mockTransaction.mockImplementation(async (ops: Array<Promise<unknown>>) =>
    Promise.all(ops)
  );
  mockResponseUpsert.mockResolvedValue({});
});

describe("saveResponses", () => {
  it("upserts valid responses", async () => {
    const responses = [
      { questionId: "q-1", answer: "Alice", fileUrl: null },
      { questionId: "q-2", answer: "Bob", fileUrl: null },
    ];

    await saveResponses("attendee-1", responses, "evt-1");

    expect(mockTransaction).toHaveBeenCalled();
    expect(mockResponseUpsert).toHaveBeenCalledTimes(2);
    expect(mockResponseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventAttendeeId_questionId: {
            eventAttendeeId: "attendee-1",
            questionId: "q-1",
          },
        },
        create: expect.objectContaining({ answer: "Alice" }),
      })
    );
  });

  it("silently skips questionIds that do not belong to the event", async () => {
    const responses = [
      { questionId: "q-1", answer: "Alice", fileUrl: null },
      { questionId: "foreign-q", answer: "hack", fileUrl: null },
    ];

    await saveResponses("attendee-1", responses, "evt-1");

    expect(mockResponseUpsert).toHaveBeenCalledTimes(1);
    const calledWith = mockResponseUpsert.mock.calls[0][0];
    expect(calledWith.where.eventAttendeeId_questionId.questionId).toBe("q-1");
  });

  it("rejects file URLs that do not start with https://", async () => {
    const responses = [
      { questionId: "q-1", answer: null, fileUrl: "http://evil.com/file.pdf" },
    ];

    await saveResponses("attendee-1", responses, "evt-1");

    // Response filtered out — no upserts
    expect(mockResponseUpsert).not.toHaveBeenCalled();
  });

  it("accepts file URLs that start with https://", async () => {
    const responses = [
      {
        questionId: "q-1",
        answer: null,
        fileUrl: "https://blob.vercel.com/file.pdf",
      },
    ];

    await saveResponses("attendee-1", responses, "evt-1");

    expect(mockResponseUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          fileUrl: "https://blob.vercel.com/file.pdf",
        }),
      })
    );
  });

  it("returns early without writing when the event has no questions", async () => {
    mockQuestionFindMany.mockResolvedValue([]);
    const responses = [{ questionId: "q-1", answer: "Alice", fileUrl: null }];

    await saveResponses("attendee-1", responses, "evt-1");

    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("throws when a required question has no answer", async () => {
    mockQuestionFindMany.mockResolvedValue([
      { id: "q-1", required: true },
      { id: "q-2", required: false },
    ]);

    const responses = [
      { questionId: "q-2", answer: "optional", fileUrl: null },
    ];

    await expect(
      saveResponses("attendee-1", responses, "evt-1")
    ).rejects.toThrow(
      "All required questions must be answered before registering."
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("throws when a required question answer is blank whitespace", async () => {
    mockQuestionFindMany.mockResolvedValue([{ id: "q-1", required: true }]);

    const responses = [{ questionId: "q-1", answer: "   ", fileUrl: null }];

    await expect(
      saveResponses("attendee-1", responses, "evt-1")
    ).rejects.toThrow(
      "All required questions must be answered before registering."
    );
  });

  it("accepts a required question answered with a file URL", async () => {
    mockQuestionFindMany.mockResolvedValue([{ id: "q-1", required: true }]);

    const responses = [
      {
        questionId: "q-1",
        answer: null,
        fileUrl: "https://blob.vercel.com/doc.pdf",
      },
    ];

    await expect(
      saveResponses("attendee-1", responses, "evt-1")
    ).resolves.toBeUndefined();
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("throws when a required question is missing from responses entirely", async () => {
    mockQuestionFindMany.mockResolvedValue([
      { id: "q-required", required: true },
    ]);

    await expect(saveResponses("attendee-1", [], "evt-1")).rejects.toThrow(
      "All required questions must be answered before registering."
    );
  });
});
