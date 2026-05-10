-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ServiceTimeType" AS ENUM ('MORNING', 'AFTERNOON', 'EVENING', 'MIDWEEK', 'YOUTH', 'OTHER');

-- Step 1: Add new nullable enum columns alongside the existing string columns
ALTER TABLE "ServiceTime" ADD COLUMN "day_new" "DayOfWeek";
ALTER TABLE "ServiceTime" ADD COLUMN "type_new" "ServiceTimeType";

-- Step 2: Migrate existing data — normalise common string values to enum members
-- Day mappings (case-insensitive)
UPDATE "ServiceTime" SET "day_new" = 'MONDAY'    WHERE UPPER("day") = 'MONDAY';
UPDATE "ServiceTime" SET "day_new" = 'TUESDAY'   WHERE UPPER("day") = 'TUESDAY';
UPDATE "ServiceTime" SET "day_new" = 'WEDNESDAY' WHERE UPPER("day") = 'WEDNESDAY';
UPDATE "ServiceTime" SET "day_new" = 'THURSDAY'  WHERE UPPER("day") = 'THURSDAY';
UPDATE "ServiceTime" SET "day_new" = 'FRIDAY'    WHERE UPPER("day") = 'FRIDAY';
UPDATE "ServiceTime" SET "day_new" = 'SATURDAY'  WHERE UPPER("day") = 'SATURDAY';
UPDATE "ServiceTime" SET "day_new" = 'SUNDAY'    WHERE UPPER("day") = 'SUNDAY';

-- Type mappings — map common service-time description strings to enum values
UPDATE "ServiceTime" SET "type_new" = 'MORNING'   WHERE UPPER("type") = 'MORNING'
                                                      OR "type" ILIKE '%divine liturgy%'
                                                      OR "type" ILIKE '%morning prayer%'
                                                      OR "type" ILIKE '%agpeya morning%';
UPDATE "ServiceTime" SET "type_new" = 'AFTERNOON' WHERE UPPER("type") = 'AFTERNOON';
UPDATE "ServiceTime" SET "type_new" = 'EVENING'   WHERE UPPER("type") = 'EVENING'
                                                      OR "type" ILIKE '%vespers%'
                                                      OR "type" ILIKE '%evening prayer%'
                                                      OR "type" ILIKE '%evening praise%';
UPDATE "ServiceTime" SET "type_new" = 'MIDWEEK'   WHERE UPPER("type") = 'MIDWEEK'
                                                      OR "type" ILIKE '%bible study%'
                                                      OR "type" ILIKE '%midweek%';
UPDATE "ServiceTime" SET "type_new" = 'YOUTH'     WHERE UPPER("type") = 'YOUTH'
                                                      OR "type" ILIKE '%youth%'
                                                      OR "type" ILIKE '%halaqa%';
-- Any remaining unmapped rows get OTHER
UPDATE "ServiceTime" SET "type_new" = 'OTHER'     WHERE "type_new" IS NULL;
-- Any remaining unmapped day rows — should not happen, but default to SUNDAY as fallback
UPDATE "ServiceTime" SET "day_new" = 'SUNDAY'     WHERE "day_new" IS NULL;

-- Step 3: Make the new columns NOT NULL now that all rows are populated
ALTER TABLE "ServiceTime" ALTER COLUMN "day_new"  SET NOT NULL;
ALTER TABLE "ServiceTime" ALTER COLUMN "type_new" SET NOT NULL;

-- Step 4: Drop the old string columns and rename the new enum columns
ALTER TABLE "ServiceTime" DROP COLUMN "day";
ALTER TABLE "ServiceTime" DROP COLUMN "type";
ALTER TABLE "ServiceTime" RENAME COLUMN "day_new"  TO "day";
ALTER TABLE "ServiceTime" RENAME COLUMN "type_new" TO "type";
