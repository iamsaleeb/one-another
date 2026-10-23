-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "claimed_until" TIMESTAMP(3),
ADD COLUMN     "failed_at" TIMESTAMP(3);
