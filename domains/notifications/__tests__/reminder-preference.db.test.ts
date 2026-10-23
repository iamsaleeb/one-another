jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  revalidatePath: jest.fn(),
  cacheTag: jest.fn(),
  cacheLife: jest.fn(),
}));
jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { attendEvent } from "@/domains/events/lifecycle";
import {
  as,
  makeChurch,
  makeEvent,
  makeUser,
  pending,
} from "@/test/db/factories";
import { updateNotificationPreferenceAction } from "../actions/notifications";

const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000);

function signedIn(userId: string) {
  (auth as jest.Mock).mockResolvedValue({ user: { id: userId } });
}

const reminder = (userId: string, dedupeKey = "e1") =>
  pending("EVENT_REMINDER", { userId, dedupeKey });

beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all(["u1", "u2"].map((id) => makeUser(id)));
  await makeChurch("c1");
  await makeEvent({ id: "e1", churchId: "c1", datetime: hoursFromNow(10) });
  await attendEvent("e1", {}, as("u1"));
  await attendEvent("e1", {}, as("u2"));
  signedIn("u1");
});

describe("changing the EVENT_REMINDER lead time", () => {
  it("moves the user's pending reminders to the new lead time", async () => {
    await updateNotificationPreferenceAction("EVENT_REMINDER", true, {
      hoursBeforeEvent: 4,
    });

    const [moved] = await reminder("u1");
    expect(moved.body).toBe("Event e1 starts in 4 hours");
    expect(
      Math.abs(moved.scheduledFor.getTime() - hoursFromNow(6).getTime())
    ).toBeLessThan(60_000);
  });

  it("queues a reminder the old lead time had skipped", async () => {
    await makeEvent({ id: "soon", churchId: "c1", datetime: hoursFromNow(3) });
    await updateNotificationPreferenceAction("EVENT_REMINDER", true, {
      hoursBeforeEvent: 4,
    });
    await attendEvent("soon", {}, as("u1"));
    expect(await reminder("u1", "soon")).toEqual([]);

    await updateNotificationPreferenceAction("EVENT_REMINDER", true, {
      hoursBeforeEvent: 1,
    });

    expect(await reminder("u1", "soon")).toEqual([
      expect.objectContaining({ body: "Event soon starts in 1 hour" }),
    ]);
  });

  it("goes back to the default when the custom lead time is cleared", async () => {
    await updateNotificationPreferenceAction("EVENT_REMINDER", true, {
      hoursBeforeEvent: 4,
    });
    await updateNotificationPreferenceAction("EVENT_REMINDER", true);

    expect((await reminder("u1"))[0].body).toBe("Event e1 starts in 2 hours");
  });

  it("leaves other users' reminders and cancelled Events alone", async () => {
    const [before] = await reminder("u2");
    await prisma.event.update({
      where: { id: "e1" },
      data: { cancelledAt: new Date() },
    });
    await makeEvent({ id: "e2", churchId: "c1", datetime: hoursFromNow(10) });
    await attendEvent("e2", {}, as("u1"));

    await updateNotificationPreferenceAction("EVENT_REMINDER", true, {
      hoursBeforeEvent: 4,
    });

    expect(
      await prisma.notification.findUniqueOrThrow({ where: { id: before.id } })
    ).toEqual(before);
    expect((await reminder("u1", "e2"))[0].body).toBe(
      "Event e2 starts in 4 hours"
    );
  });
});
