-- AlterTable: User
ALTER TABLE "User"
  ALTER COLUMN "emailVerified" TYPE TIMESTAMPTZ(6) USING "emailVerified"::timestamptz,
  ALTER COLUMN "dateOfBirth" TYPE TIMESTAMPTZ(6) USING "dateOfBirth"::timestamptz,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: Account
ALTER TABLE "Account"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: Session
ALTER TABLE "Session"
  ALTER COLUMN "expires" TYPE TIMESTAMPTZ(6) USING "expires"::timestamptz,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: VerificationToken
ALTER TABLE "VerificationToken"
  ALTER COLUMN "expires" TYPE TIMESTAMPTZ(6) USING "expires"::timestamptz;

-- AlterTable: Church
ALTER TABLE "Church"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: ChurchAdmin
ALTER TABLE "ChurchAdmin"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;

-- AlterTable: ChurchOrganiser
ALTER TABLE "ChurchOrganiser"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;

-- AlterTable: Series
ALTER TABLE "Series"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: Event
ALTER TABLE "Event"
  ALTER COLUMN "datetime" TYPE TIMESTAMPTZ(6) USING "datetime"::timestamptz,
  ALTER COLUMN "cancelledAt" TYPE TIMESTAMPTZ(6) USING "cancelledAt"::timestamptz,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz,
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: EventAttendee
ALTER TABLE "EventAttendee"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;

-- AlterTable: ChurchFollower
ALTER TABLE "ChurchFollower"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;

-- AlterTable: SeriesFollower
ALTER TABLE "SeriesFollower"
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;

-- AlterTable: PushToken
ALTER TABLE "PushToken"
  ALTER COLUMN "updatedAt" TYPE TIMESTAMPTZ(6) USING "updatedAt"::timestamptz;

-- AlterTable: ScheduledNotification
ALTER TABLE "ScheduledNotification"
  ALTER COLUMN "scheduledFor" TYPE TIMESTAMPTZ(6) USING "scheduledFor"::timestamptz,
  ALTER COLUMN "sentAt" TYPE TIMESTAMPTZ(6) USING "sentAt"::timestamptz,
  ALTER COLUMN "cancelledAt" TYPE TIMESTAMPTZ(6) USING "cancelledAt"::timestamptz,
  ALTER COLUMN "createdAt" TYPE TIMESTAMPTZ(6) USING "createdAt"::timestamptz;
