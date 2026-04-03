ALTER TABLE "Event" ADD COLUMN "metadata" JSONB NOT NULL;
ALTER TABLE "Event" DROP COLUMN "capacity";
ALTER TABLE "Event" DROP COLUMN "collectPhone";
ALTER TABLE "Event" DROP COLUMN "collectNotes";
