/*
  Warnings:

  - The `status` column on the `queue_ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updated_at` to the `queue_ticket` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('WAITING', 'SERVING', 'DONE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('FOTOCOPY', 'JILID', 'BANNER', 'PRINT', 'OTHER');

-- DropForeignKey
ALTER TABLE "queue_ticket" DROP CONSTRAINT "fk_customer";

-- AlterTable
ALTER TABLE "queue_ticket" ADD COLUMN     "called_at" TIMESTAMP(3),
ADD COLUMN     "finished_at" TIMESTAMP(3),
ADD COLUMN     "service_type" "ServiceType",
ADD COLUMN     "skipped_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TicketStatus" NOT NULL DEFAULT 'WAITING',
ALTER COLUMN "handled_by" SET DATA TYPE TEXT;

-- CreateIndex
CREATE INDEX "ix_ticket_daily_status" ON "queue_ticket"("ticket_date", "status", "queue_number");

-- AddForeignKey
ALTER TABLE "queue_ticket" ADD CONSTRAINT "fk_customer" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;
