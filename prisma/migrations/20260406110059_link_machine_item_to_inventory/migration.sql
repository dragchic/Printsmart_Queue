-- AlterTable
ALTER TABLE "queue_ticket_item" ADD COLUMN     "inventory_item_id" INTEGER;

-- AddForeignKey
ALTER TABLE "queue_ticket_item" ADD CONSTRAINT "queue_ticket_item_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("inventory_item_id") ON DELETE SET NULL ON UPDATE CASCADE;
