-- Every Event has an end as well as a start, so it can show as Live between
-- them and stay in upcoming lists until it ends. A camp's separate end date
-- in metadata is replaced by it. No backfill: the app is not live.

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "end_datetime" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "events_end_datetime_is_draft_idx" ON "events"("end_datetime", "is_draft");
