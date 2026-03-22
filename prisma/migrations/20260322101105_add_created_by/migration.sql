-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "createdById" TEXT;

-- AlterTable
ALTER TABLE "Series" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "Series" ADD CONSTRAINT "Series_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
