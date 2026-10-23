-- An Access request points at its Event, Series or Church through a real
-- foreign key, so it is deleted with its resource.

-- DropIndex
DROP INDEX "approval_requests_resource_type_resource_id_status_idx";

-- DropIndex
DROP INDEX "approval_requests_requester_id_resource_type_resource_id_key";

-- AlterTable
ALTER TABLE "approval_requests"
ADD COLUMN "church_id" TEXT,
ADD COLUMN "event_id" TEXT,
ADD COLUMN "series_id" TEXT;

UPDATE "approval_requests" SET "event_id" = "resource_id" WHERE "resource_type" = 'EVENT';
UPDATE "approval_requests" SET "series_id" = "resource_id" WHERE "resource_type" = 'SERIES';
UPDATE "approval_requests" SET "church_id" = "resource_id" WHERE "resource_type" = 'CHURCH';

-- Requests whose resource is already gone.
DELETE FROM "approval_requests" r
WHERE (r."event_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "events" e WHERE e."id" = r."event_id"))
   OR (r."series_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "series" s WHERE s."id" = r."series_id"))
   OR (r."church_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "churches" c WHERE c."id" = r."church_id"));

ALTER TABLE "approval_requests" DROP COLUMN "resource_id";

-- Exactly the column resource_type names is set.
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_one_resource_check" CHECK (
  ("resource_type" = 'EVENT'  AND "event_id"  IS NOT NULL AND "series_id" IS NULL AND "church_id" IS NULL) OR
  ("resource_type" = 'SERIES' AND "series_id" IS NOT NULL AND "event_id"  IS NULL AND "church_id" IS NULL) OR
  ("resource_type" = 'CHURCH' AND "church_id" IS NOT NULL AND "event_id"  IS NULL AND "series_id" IS NULL)
);

-- CreateIndex
CREATE INDEX "approval_requests_event_id_status_idx" ON "approval_requests"("event_id", "status");

-- CreateIndex
CREATE INDEX "approval_requests_series_id_status_idx" ON "approval_requests"("series_id", "status");

-- CreateIndex
CREATE INDEX "approval_requests_church_id_status_idx" ON "approval_requests"("church_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_requester_id_event_id_key" ON "approval_requests"("requester_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_requester_id_series_id_key" ON "approval_requests"("requester_id", "series_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_requester_id_church_id_key" ON "approval_requests"("requester_id", "church_id");

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
