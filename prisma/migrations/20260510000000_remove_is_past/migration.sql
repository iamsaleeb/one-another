-- AlterTable: drop isPast column from Event
ALTER TABLE "Event" DROP COLUMN IF EXISTS "isPast";

-- DropIndex
DROP INDEX IF EXISTS "Event_isPast_isDraft_idx";

-- CreateIndex
CREATE INDEX "Event_datetime_isDraft_idx" ON "Event"("datetime", "isDraft");
