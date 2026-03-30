-- AlterTable: add eventId column for event-scoped notifications
ALTER TABLE "ScheduledNotification" ADD COLUMN "eventId" TEXT;

-- CreateIndex: unique constraint prevents duplicate reminders per (user, type, event)
-- NULL eventId values are treated as distinct by PostgreSQL, so non-event
-- notification types that leave eventId NULL are unaffected.
CREATE UNIQUE INDEX "ScheduledNotification_userId_type_eventId_key"
  ON "ScheduledNotification"("userId", "type", "eventId");
