-- CreateEnum
CREATE TYPE "SeriesRole" AS ENUM ('SERIES_MANAGER', 'SERIES_SESSION_CREATOR');

-- CreateTable
CREATE TABLE "series_staff_assignments" (
    "userId" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "role" "SeriesRole" NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,

    CONSTRAINT "series_staff_assignments_pkey" PRIMARY KEY ("userId","seriesId")
);

-- CreateIndex
CREATE INDEX "series_staff_assignments_userId_idx" ON "series_staff_assignments"("userId");

-- CreateIndex
CREATE INDEX "series_staff_assignments_seriesId_idx" ON "series_staff_assignments"("seriesId");

-- AddForeignKey
ALTER TABLE "series_staff_assignments" ADD CONSTRAINT "series_staff_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_staff_assignments" ADD CONSTRAINT "series_staff_assignments_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
