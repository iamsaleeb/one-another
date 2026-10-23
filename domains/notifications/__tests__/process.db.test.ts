jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }));

import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { makeUser } from "@/test/db/factories";
import { MAX_ATTEMPTS, processNotifications } from "../process";
import type { PushMessage, PushSender, TokenResult } from "../push";
import { queueNotification } from "../queue";

const NOW = new Date("2030-06-01T08:00:00.000Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60_000);

// Records every push; each token answers as `answer` says.
function fakeSender(
  answer: (token: string) => TokenResult | "throw" = () => "ok",
  delayMs = 0
) {
  const pushes: Array<{ tokens: string[]; message: PushMessage }> = [];
  const sender: PushSender = {
    async send(tokens, message) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const results = tokens.map(answer);
      if (results.includes("throw")) throw new Error("FCM down");
      pushes.push({ tokens, message });
      return results as TokenResult[];
    },
  };
  return { sender, pushes };
}

let seq = 0;
function notify(
  userId: string,
  over: {
    type?: NotificationType;
    scheduledFor?: Date;
    data?: Record<string, string>;
    cancelledAt?: Date;
  } = {}
) {
  return prisma.notification.create({
    data: {
      id: `n${++seq}`,
      userId,
      type: over.type ?? "EVENT_CANCELLED",
      title: "Event Cancelled",
      body: "Sunday Worship has been cancelled",
      scheduledFor: over.scheduledFor ?? NOW,
      data: over.data,
      cancelledAt: over.cancelledAt,
    },
  });
}

function token(userId: string, value = `${userId}-phone`) {
  return prisma.pushToken.create({
    data: { userId, token: value, platform: "ios" },
  });
}

const row = (id: string) =>
  prisma.notification.findUniqueOrThrow({ where: { id } });

beforeEach(async () => {
  seq = 0;
  await Promise.all(["u1", "u2"].map((id) => makeUser(id)));
  await token("u1");
});

describe("processNotifications", () => {
  it("pushes what is due and marks it sent", async () => {
    const due = await notify("u1", { data: { type: "event_cancelled" } });
    const future = await notify("u1", { scheduledFor: later(10) });
    const cancelled = await notify("u1", { cancelledAt: NOW });
    const { sender, pushes } = fakeSender();

    expect(await processNotifications(sender, NOW)).toEqual({
      processed: 1,
      failed: 0,
    });

    expect(pushes).toEqual([
      {
        tokens: ["u1-phone"],
        message: {
          title: "Event Cancelled",
          body: "Sunday Worship has been cancelled",
          data: { type: "event_cancelled" },
        },
      },
    ]);
    expect(await row(due.id)).toMatchObject({
      sentAt: expect.any(Date),
      claimedUntil: null,
      failedAt: null,
      attempts: 1,
    });
    expect((await row(future.id)).sentAt).toBeNull();
    expect((await row(cancelled.id)).sentAt).toBeNull();
  });

  it("sends each notification once when runs overlap", async () => {
    await Promise.all(Array.from({ length: 30 }, () => notify("u1")));
    const { sender, pushes } = fakeSender(() => "ok", 20);

    const runs = await Promise.all([
      processNotifications(sender, NOW),
      processNotifications(sender, NOW),
      processNotifications(sender, NOW),
    ]);

    expect(pushes).toHaveLength(30);
    expect(runs.reduce((sum, r) => sum + r.processed, 0)).toBe(30);
    expect(await prisma.notification.count({ where: { sentAt: null } })).toBe(
      0
    );
  });

  it("leaves a crashed run's claims alone until their lease expires", async () => {
    const n = await notify("u1");
    // A run claimed it, then died before sending.
    await prisma.notification.update({
      where: { id: n.id },
      data: { claimedUntil: later(2), attempts: 1 },
    });
    const { sender, pushes } = fakeSender();

    await processNotifications(sender, later(1));
    expect(pushes).toHaveLength(0);

    await processNotifications(sender, later(3));
    expect(pushes).toHaveLength(1);
    expect(await row(n.id)).toMatchObject({
      sentAt: expect.any(Date),
      attempts: 2,
    });
  });

  it("retries a failed push once its lease expires", async () => {
    const n = await notify("u1");
    let down = true;
    const { sender, pushes } = fakeSender(() => (down ? "throw" : "ok"));

    expect(await processNotifications(sender, NOW)).toEqual({
      processed: 0,
      failed: 0,
    });
    expect(await row(n.id)).toMatchObject({ sentAt: null, attempts: 1 });

    // Still leased: not retried straight away.
    await processNotifications(sender, later(1));
    expect((await row(n.id)).attempts).toBe(1);

    down = false;
    await processNotifications(sender, later(3));
    expect(pushes).toHaveLength(1);
    expect((await row(n.id)).sentAt).not.toBeNull();
  });

  it("gives up after the last attempt and still releases it to the inbox", async () => {
    const n = await notify("u1");
    const { sender } = fakeSender(() => "failed");

    let result = { processed: 0, failed: 0 };
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      result = await processNotifications(sender, later(attempt * 3));
    }

    expect(result).toEqual({ processed: 0, failed: 1 });
    expect(await row(n.id)).toMatchObject({
      attempts: MAX_ATTEMPTS,
      sentAt: expect.any(Date),
      failedAt: expect.any(Date),
      claimedUntil: null,
    });
  });

  it("counts a push as sent when any device got it, and prunes dead tokens", async () => {
    await token("u1", "u1-old");
    await token("u1", "u1-broken");
    const n = await notify("u1");
    const { sender } = fakeSender((t) =>
      t === "u1-old" ? "stale" : t === "u1-broken" ? "failed" : "ok"
    );

    await processNotifications(sender, NOW);

    expect((await row(n.id)).sentAt).not.toBeNull();
    expect(
      (await prisma.pushToken.findMany({ orderBy: { token: "asc" } })).map(
        (t) => t.token
      )
    ).toEqual(["u1-broken", "u1-phone"]);
  });

  it("releases without a push when every token is gone", async () => {
    const n = await notify("u1");
    const { sender } = fakeSender(() => "stale");

    await processNotifications(sender, NOW);

    expect((await row(n.id)).sentAt).not.toBeNull();
    expect(await prisma.pushToken.count()).toBe(0);
  });

  it("releases without a push to a user with no device or who opted out", async () => {
    const noDevice = await notify("u2");
    await prisma.notificationPreference.create({
      data: { userId: "u1", type: "EVENT_CANCELLED", enabled: false },
    });
    const optedOut = await notify("u1");
    const { sender, pushes } = fakeSender();

    expect((await processNotifications(sender, NOW)).processed).toBe(2);

    expect(pushes).toEqual([]);
    expect((await row(noDevice.id)).sentAt).not.toBeNull();
    expect((await row(optedOut.id)).sentAt).not.toBeNull();
  });

  it("does not push a reminder for an Event that has started", async () => {
    const late = await notify("u1", {
      type: "EVENT_REMINDER",
      data: { eventDatetime: later(-5).toISOString() },
    });
    const onTime = await notify("u1", {
      type: "EVENT_REMINDER",
      data: { eventDatetime: later(120).toISOString() },
    });
    // Other notices still go out however late.
    await notify("u1", { scheduledFor: later(-600) });
    const { sender, pushes } = fakeSender();

    expect((await processNotifications(sender, NOW)).processed).toBe(3);

    expect(pushes).toHaveLength(2);
    expect((await row(late.id)).sentAt).not.toBeNull();
    expect((await row(onTime.id)).sentAt).not.toBeNull();
  });

  it("sends a reminder rescheduled mid-push again at its new time", async () => {
    const reminder = (scheduledFor: Date, body: string) =>
      queueNotification({
        userId: "u1",
        type: "EVENT_REMINDER",
        title: "Event Reminder",
        body,
        scheduledFor,
        dedupeKey: "e1",
      });
    await reminder(NOW, "starts in 2 hours");
    const pushes: string[] = [];
    const sender: PushSender = {
      async send(tokens, message) {
        pushes.push(message.body);
        // The Event moves while this push is in flight.
        if (pushes.length === 1) await reminder(later(60), "moved");
        return tokens.map(() => "ok" as const);
      },
    };

    expect((await processNotifications(sender, NOW)).processed).toBe(0);
    const [row] = await prisma.notification.findMany();
    expect(row).toMatchObject({ sentAt: null, claimedUntil: null });

    await processNotifications(sender, later(60));
    expect(pushes).toEqual(["starts in 2 hours", "moved"]);
    expect(
      (await prisma.notification.findFirstOrThrow()).sentAt
    ).not.toBeNull();
  });

  it("treats a hung push as a failure and retries it", async () => {
    const n = await notify("u1");
    const hung: PushSender = { send: () => new Promise(() => {}) };

    expect(await processNotifications(hung, NOW, 50)).toEqual({
      processed: 0,
      failed: 0,
    });
    expect(await row(n.id)).toMatchObject({ sentAt: null, attempts: 1 });

    const { sender, pushes } = fakeSender();
    await processNotifications(sender, later(3));
    expect(pushes).toHaveLength(1);
  });

  it("skips a row cancelled or refreshed after the claim, before its batch", async () => {
    // One full batch, then the two rows that will change under the run.
    await Promise.all(
      Array.from({ length: 20 }, () =>
        notify("u1", { scheduledFor: later(-10) })
      )
    );
    const cancelled = await notify("u1");
    await queueNotification({
      userId: "u1",
      type: "EVENT_REMINDER",
      title: "Event Reminder",
      body: "old",
      scheduledFor: NOW,
      dedupeKey: "e1",
    });
    let changed = false;
    const pushes: string[] = [];
    const sender: PushSender = {
      async send(tokens, message) {
        pushes.push(message.body);
        if (!changed) {
          changed = true;
          await prisma.notification.update({
            where: { id: cancelled.id },
            data: { cancelledAt: NOW },
          });
          await queueNotification({
            userId: "u1",
            type: "EVENT_REMINDER",
            title: "Event Reminder",
            body: "moved",
            scheduledFor: later(60),
            dedupeKey: "e1",
          });
        }
        return tokens.map(() => "ok" as const);
      },
    };

    expect((await processNotifications(sender, NOW)).processed).toBe(20);
    expect(pushes).toHaveLength(20);
    expect((await row(cancelled.id)).sentAt).toBeNull();

    await processNotifications(sender, later(60));
    expect(pushes.slice(20)).toEqual(["moved"]);
  });

  it("starts a refreshed notification's attempts again", async () => {
    await queueNotification({
      userId: "u1",
      type: "EVENT_REMINDER",
      title: "Event Reminder",
      body: "old",
      scheduledFor: NOW,
      dedupeKey: "e1",
    });
    await processNotifications(fakeSender(() => "failed").sender, NOW);

    await queueNotification({
      userId: "u1",
      type: "EVENT_REMINDER",
      title: "Event Reminder",
      body: "new",
      scheduledFor: later(60),
      dedupeKey: "e1",
    });

    expect(
      await prisma.notification.findFirstOrThrow({ where: { dedupeKey: "e1" } })
    ).toMatchObject({ attempts: 0, body: "new" });
  });
});
