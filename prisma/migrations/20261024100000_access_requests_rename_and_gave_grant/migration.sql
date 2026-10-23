-- Approval requests are Access requests (see GLOSSARY.md), and each records
-- whether approving it created the requester's role.

ALTER TYPE "approval_status" RENAME TO "access_request_status";

ALTER TABLE "approval_requests" RENAME TO "access_requests";

ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_pkey" TO "access_requests_pkey";
ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_requester_id_fkey" TO "access_requests_requester_id_fkey";
ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_reviewed_by_fkey" TO "access_requests_reviewed_by_fkey";
ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_event_id_fkey" TO "access_requests_event_id_fkey";
ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_series_id_fkey" TO "access_requests_series_id_fkey";
ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_church_id_fkey" TO "access_requests_church_id_fkey";
ALTER TABLE "access_requests" RENAME CONSTRAINT "approval_requests_one_resource_check" TO "access_requests_one_resource_check";

ALTER INDEX "approval_requests_event_id_status_idx" RENAME TO "access_requests_event_id_status_idx";
ALTER INDEX "approval_requests_series_id_status_idx" RENAME TO "access_requests_series_id_status_idx";
ALTER INDEX "approval_requests_church_id_status_idx" RENAME TO "access_requests_church_id_status_idx";
ALTER INDEX "approval_requests_requester_id_event_id_key" RENAME TO "access_requests_requester_id_event_id_key";
ALTER INDEX "approval_requests_requester_id_series_id_key" RENAME TO "access_requests_requester_id_series_id_key";
ALTER INDEX "approval_requests_requester_id_church_id_key" RENAME TO "access_requests_requester_id_church_id_key";

-- AlterTable
ALTER TABLE "access_requests" ADD COLUMN "gave_grant" BOOLEAN NOT NULL DEFAULT false;
