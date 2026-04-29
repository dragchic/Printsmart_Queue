/*
  Warnings:

  - You are about to drop the column `handled_by` on the `queue_ticket` table. All the data in the column will be lost.
  - You are about to drop the column `machine_notified_by` on the `queue_ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "queue_ticket" DROP COLUMN "handled_by",
DROP COLUMN "machine_notified_by",
ADD COLUMN     "handled_by_id" INTEGER,
ADD COLUMN     "machine_notified_by_id" INTEGER;

-- CreateIndex
CREATE INDEX "ix_queue_ticket_handled_by_id" ON "queue_ticket"("handled_by_id");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_machine_notified_by_id" ON "queue_ticket"("machine_notified_by_id");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_picked_up_by" ON "queue_ticket"("picked_up_by");

-- AddForeignKey
ALTER TABLE "queue_ticket" ADD CONSTRAINT "queue_ticket_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_ticket" ADD CONSTRAINT "queue_ticket_machine_notified_by_id_fkey" FOREIGN KEY ("machine_notified_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
