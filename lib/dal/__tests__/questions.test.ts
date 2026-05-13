jest.mock("@/lib/db", () => ({
  prisma: {
    eventAttendeeResponse: { count: jest.fn() },
    eventQuestion: { deleteMany: jest.fn(), createMany: jest.fn() },
    questionLibraryItem: { upsert: jest.fn() },
    $transaction: jest.fn(),
  },
}));

import { syncEventQuestions } from "@/lib/dal/questions";
import { prisma } from "@/lib/db";
import { QuestionType } from "@prisma/client";

const mockTransaction = prisma.$transaction as jest.Mock;
const mockResponseCount = prisma.eventAttendeeResponse.count as jest.Mock;
const mockQuestionDeleteMany = prisma.eventQuestion.deleteMany as jest.Mock;
const mockQuestionCreateMany = prisma.eventQuestion.createMany as jest.Mock;
const mockLibraryUpsert = prisma.questionLibraryItem.upsert as jest.Mock;

const baseQuestion = {
  id: "q-1",
  type: QuestionType.SHORT_TEXT,
  label: "What is your name?",
  options: [],
  required: false,
  order: 0,
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: interactive transaction executes the callback with a tx proxy
  mockTransaction.mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<void>) => {
      // Provide a tx that delegates to the same mocks
      const tx = {
        eventAttendeeResponse: prisma.eventAttendeeResponse,
        eventQuestion: prisma.eventQuestion,
      };
      return fn(tx as unknown as typeof prisma);
    }
  );
  mockResponseCount.mockResolvedValue(0);
  mockQuestionDeleteMany.mockResolvedValue({ count: 0 });
  mockQuestionCreateMany.mockResolvedValue({ count: 1 });
  mockLibraryUpsert.mockResolvedValue({});
});

describe("syncEventQuestions", () => {
  it("deletes existing questions and creates new ones", async () => {
    await syncEventQuestions("evt-1", [baseQuestion], "user-1");

    expect(mockQuestionDeleteMany).toHaveBeenCalledWith({
      where: { eventId: "evt-1" },
    });
    expect(mockQuestionCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          eventId: "evt-1",
          type: QuestionType.SHORT_TEXT,
          label: "What is your name?",
          order: 0,
          required: false,
          libraryItemId: null,
        }),
      ],
    });
  });

  it("silently skips sync when responses already exist (questions locked)", async () => {
    mockResponseCount.mockResolvedValue(1);

    await expect(
      syncEventQuestions("evt-1", [baseQuestion], "user-1")
    ).resolves.toBeUndefined();

    expect(mockQuestionDeleteMany).not.toHaveBeenCalled();
    expect(mockQuestionCreateMany).not.toHaveBeenCalled();
  });

  it("upserts unique (label, type) pairs into the library", async () => {
    const questions = [
      { ...baseQuestion, id: "q-1", label: "Name?" },
      { ...baseQuestion, id: "q-2", label: "Name?" }, // duplicate — skipped
      {
        ...baseQuestion,
        id: "q-3",
        label: "Age?",
        type: QuestionType.SHORT_TEXT,
      },
    ];

    await syncEventQuestions("evt-1", questions, "user-1");

    expect(mockLibraryUpsert).toHaveBeenCalledTimes(2);
    expect(mockLibraryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ label: "Name?" }),
      })
    );
    expect(mockLibraryUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ label: "Age?" }),
      })
    );
  });

  it("preserves libraryItemId when provided", async () => {
    await syncEventQuestions(
      "evt-1",
      [{ ...baseQuestion, libraryItemId: "lib-1" }],
      "user-1"
    );

    expect(mockQuestionCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ libraryItemId: "lib-1" })],
    });
  });

  it("assigns sequential order values to questions", async () => {
    const questions = [
      { ...baseQuestion, id: "q-1", label: "Q1" },
      { ...baseQuestion, id: "q-2", label: "Q2" },
      { ...baseQuestion, id: "q-3", label: "Q3" },
    ];

    await syncEventQuestions("evt-1", questions, "user-1");

    const created = mockQuestionCreateMany.mock.calls[0][0].data as Array<{
      order: number;
      label: string;
    }>;
    expect(created[0].order).toBe(0);
    expect(created[1].order).toBe(1);
    expect(created[2].order).toBe(2);
  });
});
