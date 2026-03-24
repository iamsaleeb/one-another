-- CreateTable
CREATE TABLE "ChurchOrganiser" (
    "userId" TEXT NOT NULL,
    "churchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChurchOrganiser_pkey" PRIMARY KEY ("userId","churchId")
);

-- AddForeignKey
ALTER TABLE "ChurchOrganiser" ADD CONSTRAINT "ChurchOrganiser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChurchOrganiser" ADD CONSTRAINT "ChurchOrganiser_churchId_fkey" FOREIGN KEY ("churchId") REFERENCES "Church"("id") ON DELETE CASCADE ON UPDATE CASCADE;
