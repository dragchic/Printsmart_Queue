-- CreateEnum
CREATE TYPE "MachineItemStatus" AS ENUM ('WAITING', 'PROCESSING', 'DONE');

-- AlterTable
ALTER TABLE "queue_ticket_item" ADD COLUMN     "machine_finished_at" TIMESTAMP(3),
ADD COLUMN     "machine_note" TEXT,
ADD COLUMN     "machine_started_at" TIMESTAMP(3),
ADD COLUMN     "machine_status" "MachineItemStatus" NOT NULL DEFAULT 'WAITING',
ADD COLUMN     "material_qty_used" DOUBLE PRECISION,
ADD COLUMN     "processed_by" TEXT,
ADD COLUMN     "specification" TEXT;

-- CreateIndex
CREATE INDEX "ix_queue_ticket_item_ticket_id" ON "queue_ticket_item"("ticket_id");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_item_machine_status" ON "queue_ticket_item"("machine_status");
