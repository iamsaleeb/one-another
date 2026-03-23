/*
  Warnings:

  - Made the column `churchId` on table `Series` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Series" DROP CONSTRAINT "Series_churchId_fkey";

-- AlterTable
ALTER TABLE "Series" ALTER COLUMN "churchId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
