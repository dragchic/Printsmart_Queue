-- AlterTable
ALTER TABLE "queue_ticket" ADD COLUMN     "machine_notified_at" TIMESTAMP(3),
ADD COLUMN     "machine_notified_by" TEXT;
