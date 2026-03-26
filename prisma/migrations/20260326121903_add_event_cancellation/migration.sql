/*
  Warnings:

  - You are about to drop the column `followers` on the `Church` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Church" DROP COLUMN "followers";

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ChurchFollower" (
    "id" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchFollower_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChurchFollower_churchId_userId_key" ON "ChurchFollower"("churchId", "userId");

-- AddForeignKey
ALTER TABLE "ChurchFollower" ADD CONSTRAINT "ChurchFollower_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchFollower" ADD CONSTRAINT "ChurchFollower_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
