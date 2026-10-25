import "server-only";
import { revalidateTag } from "next/cache";
import { NotificationType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { firebaseSender, type PushSender } from "./push";

// Runs may overlap (the cron is pinged every few seconds), so each claims its
// rows first: a claimed row belongs to one run until its lease expires. A run
// that crashes leaves its leases to expire, and the rows go out on a later
// run. The lease outlives the route's maxDuration, so a live run never loses
// a row to another. A run only marks rows it still holds: refreshing a row
// (queueNotification) releases its lease, so a reminder rescheduled mid-push
// goes out again at its new time instead of being marked sent.
const CLAIM_LIMIT = 500;
const LEASE_MS = 2 * 60_000;
// After this many attempts a push is given up on; the notification still
// reaches the inbox.
export const MAX_ATTEMPTS = 5;
const CONCURRENCY = 20;
// A hung push fails like any other and is retried, instead of stalling its
// batch until the route times out. A slow push that lands after this may be
// sent again: delivery is at-least-once.
const SEND_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`push timed out after ${ms}ms`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

interface Claimed {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: unknown;
  attempts: number;
  scheduledFor: Date;
}

// Claims the oldest due rows nobody holds, returned oldest first. SKIP LOCKED
// lets concurrent runs take disjoint batches instead of waiting on each other.
async function claimDue(now: Date, leaseUntil: Date): Promise<Claimed[]> {
  const rows = await prisma.$queryRaw<Claimed[]>`
    UPDATE notifications
    SET claimed_until = ${leaseUntil}, attempts = attempts + 1
    WHERE id IN (
      SELECT id FROM notifications
      WHERE scheduled_for <= ${now}
        AND sent_at IS NULL
        AND cancelled_at IS NULL
        AND (claimed_until IS NULL OR claimed_until < ${now})
      ORDER BY scheduled_for
      LIMIT ${CLAIM_LIMIT}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, user_id AS "userId", type::text AS type, title, body, data,
      attempts, scheduled_for AS "scheduledFor"`;
  // RETURNING does not keep the subquery's order.
  return rows.sort(
    (a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime()
  );
}

function stringData(data: unknown): Record<string, string> {
  return data != null && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, string>)
    : {};
}

// A reminder for an Event that has started is no use as a push.
function isLate(n: Claimed, now: Date): boolean {
  if (n.type !== NotificationType.EVENT_REMINDER) return false;
  const at = stringData(n.data).eventDatetime;
  return !!at && new Date(at) <= now;
}

// "release": done, show it in the inbox. "retry": leave the lease to expire.
type Outcome = "release" | "retry";

export async function processNotifications(
  sender: PushSender = firebaseSender,
  now = new Date(),
  sendTimeoutMs = SEND_TIMEOUT_MS
): Promise<{ processed: number; failed: number }> {
  const leaseUntil = new Date(now.getTime() + LEASE_MS);
  const due = await claimDue(now, leaseUntil);
  if (due.length === 0) return { processed: 0, failed: 0 };

  const userIds = [...new Set(due.map((n) => n.userId))];
  const [optedOut, tokenRows] = await Promise.all([
    prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, enabled: false },
      select: { userId: true, type: true },
    }),
    prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, token: true },
    }),
  ]);
  const disabled = new Set(optedOut.map((p) => `${p.userId}:${p.type}`));
  const tokensByUser = new Map<string, string[]>();
  for (const { userId, token } of tokenRows) {
    tokensByUser.set(userId, [...(tokensByUser.get(userId) ?? []), token]);
  }

  const stale = new Set<string>();

  async function deliver(n: Claimed): Promise<Outcome> {
    const tokens = tokensByUser.get(n.userId) ?? [];
    if (
      disabled.has(`${n.userId}:${n.type}`) ||
      tokens.length === 0 ||
      isLate(n, now)
    ) {
      return "release";
    }
    try {
      const results = await withTimeout(
        sender.send(tokens, {
          title: n.title,
          body: n.body,
          data: stringData(n.data),
        }),
        sendTimeoutMs
      );
      results.forEach((r, i) => r === "stale" && stale.add(tokens[i]));
      // Some device got it, or none of them exists any more.
      return results.includes("failed") && !results.includes("ok")
        ? "retry"
        : "release";
    } catch (err) {
      console.error(
        `[process-notifications] failed to send notification ${n.id}:`,
        err
      );
      return "retry";
    }
  }

  let processed = 0;
  let failed = 0;
  // Each batch is marked as soon as it has gone out, so a crash resends at
  // most one batch.
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    // Re-read the batch just before pushing it: a row cancelled since the
    // claim is not pushed, and one refreshed since (its lease released) is
    // left for a later run to claim at its new time.
    const claimed = due.slice(i, i + CONCURRENCY);
    const live = new Set(
      (
        await prisma.notification.findMany({
          where: {
            id: { in: claimed.map((n) => n.id) },
            claimedUntil: leaseUntil,
            cancelledAt: null,
            sentAt: null,
          },
          select: { id: true },
        })
      ).map((n) => n.id)
    );
    const batch = claimed.filter((n) => live.has(n.id));
    const outcomes = await Promise.all(batch.map(deliver));

    const released = batch.filter((_, j) => outcomes[j] === "release");
    const gaveUp = batch.filter(
      (n, j) => outcomes[j] === "retry" && n.attempts >= MAX_ATTEMPTS
    );
    for (const n of gaveUp) {
      console.error(
        `[process-notifications] giving up on notification ${n.id} after ${n.attempts} attempts`
      );
    }

    const sentAt = new Date();
    const mark = (
      rows: Claimed[],
      data: Prisma.NotificationUpdateManyMutationInput
    ) =>
      rows.length === 0
        ? { count: 0 }
        : prisma.notification.updateMany({
            where: {
              id: { in: rows.map((n) => n.id) },
              claimedUntil: leaseUntil,
            },
            data: { ...data, claimedUntil: null },
          });
    const [sent, gone] = await Promise.all([
      mark(released, { sentAt }),
      mark(gaveUp, { sentAt, failedAt: sentAt }),
    ]);
    processed += sent.count;
    failed += gone.count;
  }

  if (stale.size > 0) {
    await prisma.pushToken.deleteMany({ where: { token: { in: [...stale] } } });
  }

  for (const userId of userIds) {
    revalidateTag(`user-notifications-${userId}`, {});
  }

  return { processed, failed };
}
