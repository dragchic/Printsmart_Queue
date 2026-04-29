-- CreateEnum
CREATE TYPE "PickupStatus" AS ENUM ('NOT_READY', 'READY_NOT_TAKEN', 'TAKEN', 'EXPIRED');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CASHIER';

-- AlterTable
ALTER TABLE "queue_ticket" ADD COLUMN     "expired_at" TIMESTAMP(3),
ADD COLUMN     "picked_up_at" TIMESTAMP(3),
ADD COLUMN     "picked_up_by" INTEGER,
ADD COLUMN     "pickup_ready_at" TIMESTAMP(3),
ADD COLUMN     "pickup_status" "PickupStatus" NOT NULL DEFAULT 'NOT_READY';

-- AddForeignKey
ALTER TABLE "queue_ticket" ADD CONSTRAINT "queue_ticket_picked_up_by_fkey" FOREIGN KEY ("picked_up_by") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
