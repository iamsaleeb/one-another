/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `ChurchAdmin` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChurchOrganiser` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "ChurchRole" AS ENUM ('CHURCH_ADMIN', 'EVENT_MANAGER', 'EVENT_CREATOR');

-- CreateEnum
CREATE TYPE "EventRole" AS ENUM ('EVENT_MANAGER', 'EVENT_EDITOR');

-- DropForeignKey
ALTER TABLE "ChurchAdmin" DROP CONSTRAINT "ChurchAdmin_churchId_fkey";

-- DropForeignKey
ALTER TABLE "ChurchAdmin" DROP CONSTRAINT "ChurchAdmin_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChurchOrganiser" DROP CONSTRAINT "ChurchOrganiser_churchId_fkey";

-- DropForeignKey
ALTER TABLE "ChurchOrganiser" DROP CONSTRAINT "ChurchOrganiser_userId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role";

-- DropTable
DROP TABLE "ChurchAdmin";

-- DropTable
DROP TABLE "ChurchOrganiser";

-- DropEnum
DROP TYPE "UserRole";

-- CreateTable
CREATE TABLE "platform_role_assignments" (
    "userId" TEXT NOT NULL,
    "role" "PlatformRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "platform_role_assignments_pkey" PRIMARY KEY ("userId","role")
);

-- CreateTable
CREATE TABLE "church_memberships" (
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "role" "ChurchRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "church_memberships_pkey" PRIMARY KEY ("userId","churchId")
);

-- CreateTable
CREATE TABLE "event_staff_assignments" (
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "role" "EventRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "event_staff_assignments_pkey" PRIMARY KEY ("userId","eventId")
);

-- CreateIndex
CREATE INDEX "platform_role_assignments_userId_idx" ON "platform_role_assignments"("userId");

-- CreateIndex
CREATE INDEX "church_memberships_userId_idx" ON "church_memberships"("userId");

-- CreateIndex
CREATE INDEX "church_memberships_churchId_idx" ON "church_memberships"("churchId");

-- CreateIndex
CREATE INDEX "event_staff_assignments_userId_idx" ON "event_staff_assignments"("userId");

-- CreateIndex
CREATE INDEX "event_staff_assignments_eventId_idx" ON "event_staff_assignments"("eventId");

-- AddForeignKey
ALTER TABLE "platform_role_assignments" ADD CONSTRAINT "platform_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
