/*
  Warnings:

  - You are about to drop the column `totalEvents` on the `Church` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Church" DROP COLUMN "totalEvents";

-- CreateIndex
CREATE INDEX "ChurchFollower_userId_idx" ON "ChurchFollower"("userId");

-- CreateIndex
CREATE INDEX "Event_isPast_isDraft_idx" ON "Event"("isPast", "isDraft");

-- CreateIndex
CREATE INDEX "Event_churchId_idx" ON "Event"("churchId");

-- CreateIndex
CREATE INDEX "Event_createdById_idx" ON "Event"("createdById");

-- CreateIndex
CREATE INDEX "EventAttendee_userId_idx" ON "EventAttendee"("userId");

-- CreateIndex
CREATE INDEX "Series_churchId_idx" ON "Series"("churchId");

-- CreateIndex
CREATE INDEX "Series_createdById_idx" ON "Series"("createdById");

-- CreateIndex
CREATE INDEX "SeriesFollower_userId_idx" ON "SeriesFollower"("userId");
