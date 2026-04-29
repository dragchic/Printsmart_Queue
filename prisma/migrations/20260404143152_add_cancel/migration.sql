-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'CANCEL';

-- AlterTable
ALTER TABLE "queue_ticket" ADD COLUMN     "canceled_at" TIMESTAMP(3);
