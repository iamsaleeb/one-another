-- An Event records the timezone its organiser entered its dates in, so its
-- calendar days (a camp's days) are the organiser's days rather than UTC's.
-- No backfill: the app is not live.

-- AlterTable
ALTER TABLE "events" ADD COLUMN     "timezone" TEXT;
