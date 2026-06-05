-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('EVENT', 'SERIES', 'CHURCH');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ROLE_REQUEST_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'ROLE_REQUEST_OUTCOME';

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    "message" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_requests_resourceType_resourceId_status_idx" ON "approval_requests"("resourceType", "resourceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_requesterId_resourceType_resourceId_key" ON "approval_requests"("requesterId", "resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
