-- A sign-in code counts the guesses made at it, so it is spent after a few
-- wrong ones instead of staying open to guessing until it expires.

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;
