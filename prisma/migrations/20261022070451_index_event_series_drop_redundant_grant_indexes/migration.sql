-- DropIndex
DROP INDEX "church_memberships_user_id_idx";

-- DropIndex
DROP INDEX "event_staff_assignments_user_id_idx";

-- DropIndex
DROP INDEX "platform_role_assignments_user_id_idx";

-- DropIndex
DROP INDEX "series_staff_assignments_user_id_idx";

-- CreateIndex
CREATE INDEX "events_series_id_idx" ON "events"("series_id");

