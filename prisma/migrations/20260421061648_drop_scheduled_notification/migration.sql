/*
  Warnings:

  - You are about to drop the `ScheduledNotification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ScheduledNotification" DROP CONSTRAINT "ScheduledNotification_userId_fkey";

-- DropTable
DROP TABLE "ScheduledNotification";
