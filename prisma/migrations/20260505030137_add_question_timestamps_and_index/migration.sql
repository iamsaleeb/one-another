/*
  Warnings:

  - Added the required column `updatedAt` to the `EventQuestion` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `QuestionLibraryItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventQuestion" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "QuestionLibraryItem" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "EventQuestion_eventId_order_idx" ON "EventQuestion"("eventId", "order");
