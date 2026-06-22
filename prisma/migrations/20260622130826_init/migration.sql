-- CreateEnum
CREATE TYPE "platform_role" AS ENUM ('PLATFORM_ADMIN');

-- CreateEnum
CREATE TYPE "church_role" AS ENUM ('CHURCH_ADMIN', 'EVENT_MANAGER', 'EVENT_CREATOR');

-- CreateEnum
CREATE TYPE "event_role" AS ENUM ('EVENT_MANAGER', 'EVENT_EDITOR');

-- CreateEnum
CREATE TYPE "series_role" AS ENUM ('SERIES_MANAGER', 'SERIES_SESSION_CREATOR');

-- CreateEnum
CREATE TYPE "cadence" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "question_type" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'YES_NO', 'MULTIPLE_CHOICE', 'FILE_UPLOAD');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('EVENT_REMINDER', 'NEW_SERIES_SESSION', 'EVENT_CANCELLED', 'ROLE_REQUEST_RECEIVED', 'ROLE_REQUEST_OUTCOME');

-- CreateEnum
CREATE TYPE "day_of_week" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "service_time_type" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'MIDWEEK', 'YOUTH', 'OTHER');

-- CreateEnum
CREATE TYPE "resource_type" AS ENUM ('EVENT', 'SERIES', 'CHURCH');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'REVOKED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "email_verified" TIMESTAMP(3),
    "image" TEXT,
    "phone" TEXT,
    "date_of_birth" TIMESTAMP(3),
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("provider","provider_account_id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "churches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "description" TEXT NOT NULL,
    "founded" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "churches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_times" (
    "id" TEXT NOT NULL,
    "day" "day_of_week" NOT NULL,
    "time" TEXT NOT NULL,
    "type" "service_time_type" NOT NULL,
    "church_id" TEXT NOT NULL,

    CONSTRAINT "service_times_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cadence" "cadence" NOT NULL,
    "location" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "photo_url" TEXT,
    "church_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "datetime" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "location" TEXT,
    "host" TEXT,
    "tag" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_url" TEXT,
    "is_draft" BOOLEAN NOT NULL DEFAULT false,
    "requires_registration" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL,
    "price" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "church_id" TEXT NOT NULL,
    "series_id" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendees" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "phone" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_library_items" (
    "id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "type" "question_type" NOT NULL,
    "label" TEXT NOT NULL,
    "options" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_questions" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "library_item_id" TEXT,
    "type" "question_type" NOT NULL,
    "label" TEXT NOT NULL,
    "options" TEXT[],
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_attendee_responses" (
    "id" TEXT NOT NULL,
    "event_attendee_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" TEXT,
    "file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_attendee_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "church_followers" (
    "id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "church_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_followers" (
    "id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "scheduled_for" TIMESTAMP(3) NOT NULL,
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_role_assignments" (
    "user_id" TEXT NOT NULL,
    "role" "platform_role" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "platform_role_assignments_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "church_memberships" (
    "user_id" TEXT NOT NULL,
    "church_id" TEXT NOT NULL,
    "role" "church_role" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "church_memberships_pkey" PRIMARY KEY ("user_id","church_id")
);

-- CreateTable
CREATE TABLE "event_staff_assignments" (
    "user_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "role" "event_role" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "event_staff_assignments_pkey" PRIMARY KEY ("user_id","event_id")
);

-- CreateTable
CREATE TABLE "series_staff_assignments" (
    "user_id" TEXT NOT NULL,
    "series_id" TEXT NOT NULL,
    "role" "series_role" NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "series_staff_assignments_pkey" PRIMARY KEY ("user_id","series_id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "resource_type" "resource_type" NOT NULL,
    "resource_id" TEXT NOT NULL,
    "requested_role" TEXT NOT NULL,
    "message" TEXT,
    "status" "approval_status" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "series_church_id_idx" ON "series"("church_id");

-- CreateIndex
CREATE INDEX "series_created_by_id_idx" ON "series"("created_by_id");

-- CreateIndex
CREATE INDEX "events_datetime_is_draft_idx" ON "events"("datetime", "is_draft");

-- CreateIndex
CREATE INDEX "events_church_id_idx" ON "events"("church_id");

-- CreateIndex
CREATE INDEX "events_created_by_id_idx" ON "events"("created_by_id");

-- CreateIndex
CREATE INDEX "event_attendees_user_id_idx" ON "event_attendees"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendees_event_id_user_id_key" ON "event_attendees"("event_id", "user_id");

-- CreateIndex
CREATE INDEX "question_library_items_created_by_id_idx" ON "question_library_items"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "question_library_items_created_by_id_label_type_key" ON "question_library_items"("created_by_id", "label", "type");

-- CreateIndex
CREATE INDEX "event_questions_event_id_idx" ON "event_questions"("event_id");

-- CreateIndex
CREATE INDEX "event_questions_event_id_order_idx" ON "event_questions"("event_id", "order");

-- CreateIndex
CREATE INDEX "event_attendee_responses_question_id_idx" ON "event_attendee_responses"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_attendee_responses_event_attendee_id_question_id_key" ON "event_attendee_responses"("event_attendee_id", "question_id");

-- CreateIndex
CREATE INDEX "church_followers_user_id_idx" ON "church_followers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "church_followers_church_id_user_id_key" ON "church_followers"("church_id", "user_id");

-- CreateIndex
CREATE INDEX "series_followers_user_id_idx" ON "series_followers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "series_followers_series_id_user_id_key" ON "series_followers"("series_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_tokens_token_key" ON "push_tokens"("token");

-- CreateIndex
CREATE INDEX "push_tokens_user_id_platform_idx" ON "push_tokens"("user_id", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_type_key" ON "notification_preferences"("user_id", "type");

-- CreateIndex
CREATE INDEX "notifications_scheduled_for_sent_at_cancelled_at_idx" ON "notifications"("scheduled_for", "sent_at", "cancelled_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_sent_at_read_at_idx" ON "notifications"("user_id", "sent_at", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_type_dedupe_key_key" ON "notifications"("user_id", "type", "dedupe_key");

-- CreateIndex
CREATE INDEX "saved_events_user_id_idx" ON "saved_events"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_events_user_id_event_id_key" ON "saved_events"("user_id", "event_id");

-- CreateIndex
CREATE INDEX "platform_role_assignments_user_id_idx" ON "platform_role_assignments"("user_id");

-- CreateIndex
CREATE INDEX "church_memberships_user_id_idx" ON "church_memberships"("user_id");

-- CreateIndex
CREATE INDEX "church_memberships_church_id_idx" ON "church_memberships"("church_id");

-- CreateIndex
CREATE INDEX "event_staff_assignments_user_id_idx" ON "event_staff_assignments"("user_id");

-- CreateIndex
CREATE INDEX "event_staff_assignments_event_id_idx" ON "event_staff_assignments"("event_id");

-- CreateIndex
CREATE INDEX "series_staff_assignments_user_id_idx" ON "series_staff_assignments"("user_id");

-- CreateIndex
CREATE INDEX "series_staff_assignments_series_id_idx" ON "series_staff_assignments"("series_id");

-- CreateIndex
CREATE INDEX "approval_requests_resource_type_resource_id_status_idx" ON "approval_requests"("resource_type", "resource_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "approval_requests_requester_id_resource_type_resource_id_key" ON "approval_requests"("requester_id", "resource_type", "resource_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_times" ADD CONSTRAINT "service_times_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendees" ADD CONSTRAINT "event_attendees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_library_items" ADD CONSTRAINT "question_library_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_questions" ADD CONSTRAINT "event_questions_library_item_id_fkey" FOREIGN KEY ("library_item_id") REFERENCES "question_library_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee_responses" ADD CONSTRAINT "event_attendee_responses_event_attendee_id_fkey" FOREIGN KEY ("event_attendee_id") REFERENCES "event_attendees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_attendee_responses" ADD CONSTRAINT "event_attendee_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "event_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_followers" ADD CONSTRAINT "church_followers_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_followers" ADD CONSTRAINT "church_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_followers" ADD CONSTRAINT "series_followers_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_followers" ADD CONSTRAINT "series_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_events" ADD CONSTRAINT "saved_events_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_role_assignments" ADD CONSTRAINT "platform_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "church_memberships" ADD CONSTRAINT "church_memberships_church_id_fkey" FOREIGN KEY ("church_id") REFERENCES "churches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_staff_assignments" ADD CONSTRAINT "event_staff_assignments_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_staff_assignments" ADD CONSTRAINT "series_staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_staff_assignments" ADD CONSTRAINT "series_staff_assignments_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
