-- DropIndex
DROP INDEX "saved_events_user_id_idx";

-- CreateIndex
CREATE INDEX "saved_events_event_id_idx" ON "saved_events"("event_id");

