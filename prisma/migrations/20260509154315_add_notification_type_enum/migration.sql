-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EVENT_REMINDER', 'NEW_SERIES_SESSION', 'EVENT_CANCELLED');

-- AlterTable (safe: USING cast preserves existing rows whose type values match the enum labels)
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";

-- AlterTable
ALTER TABLE "NotificationPreference" ALTER COLUMN "type" TYPE "NotificationType" USING "type"::"NotificationType";
