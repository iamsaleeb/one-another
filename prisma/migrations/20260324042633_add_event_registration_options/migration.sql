-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "collectNotes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "collectPhone" BOOLEAN NOT NULL DEFAULT false;
