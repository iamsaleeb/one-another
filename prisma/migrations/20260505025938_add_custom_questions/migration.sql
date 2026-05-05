-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'YES_NO', 'MULTIPLE_CHOICE', 'FILE_UPLOAD');

-- CreateTable
CREATE TABLE "QuestionLibraryItem" (
    "id" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "label" TEXT NOT NULL,
    "options" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionLibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventQuestion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "libraryItemId" TEXT,
    "type" "QuestionType" NOT NULL,
    "label" TEXT NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,

    CONSTRAINT "EventQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAttendeeResponse" (
    "id" TEXT NOT NULL,
    "eventAttendeeId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" TEXT,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAttendeeResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionLibraryItem_createdById_idx" ON "QuestionLibraryItem"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionLibraryItem_createdById_label_type_key" ON "QuestionLibraryItem"("createdById", "label", "type");

-- CreateIndex
CREATE INDEX "EventQuestion_eventId_idx" ON "EventQuestion"("eventId");

-- CreateIndex
CREATE INDEX "EventAttendeeResponse_questionId_idx" ON "EventAttendeeResponse"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "EventAttendeeResponse_eventAttendeeId_questionId_key" ON "EventAttendeeResponse"("eventAttendeeId", "questionId");

-- AddForeignKey
ALTER TABLE "QuestionLibraryItem" ADD CONSTRAINT "QuestionLibraryItem_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventQuestion" ADD CONSTRAINT "EventQuestion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventQuestion" ADD CONSTRAINT "EventQuestion_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "QuestionLibraryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendeeResponse" ADD CONSTRAINT "EventAttendeeResponse_eventAttendeeId_fkey" FOREIGN KEY ("eventAttendeeId") REFERENCES "EventAttendee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAttendeeResponse" ADD CONSTRAINT "EventAttendeeResponse_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "EventQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
