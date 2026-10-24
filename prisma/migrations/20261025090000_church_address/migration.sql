-- A Church's address is its own record made of parts (street, suburb, city,
-- state, postcode). Cards show suburb and city; the church page shows them all.
-- The free-text column is dropped without a backfill: the app is not live.

-- AlterTable
ALTER TABLE "churches" DROP COLUMN "address",
ADD COLUMN     "address_id" TEXT;

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "suburb" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postcode" TEXT,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "churches_address_id_key" ON "churches"("address_id");

-- AddForeignKey
ALTER TABLE "churches" ADD CONSTRAINT "churches_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

