/*
  Warnings:

  - You are about to drop the column `custom_service_name` on the `queue_ticket` table. All the data in the column will be lost.
  - You are about to drop the column `order_note` on the `queue_ticket` table. All the data in the column will be lost.
  - You are about to drop the column `order_qty` on the `queue_ticket` table. All the data in the column will be lost.
  - You are about to drop the column `service_option_id` on the `queue_ticket` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "queue_ticket" DROP CONSTRAINT "queue_ticket_service_option_id_fkey";

-- AlterTable
ALTER TABLE "queue_ticket" DROP COLUMN "custom_service_name",
DROP COLUMN "order_note",
DROP COLUMN "order_qty",
DROP COLUMN "service_option_id";

-- CreateTable
CREATE TABLE "queue_ticket_item" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "service_option_id" INTEGER,
    "custom_service_name" TEXT,
    "order_qty" DOUBLE PRECISION NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_ticket_item_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "queue_ticket_item" ADD CONSTRAINT "queue_ticket_item_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "queue_ticket"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_ticket_item" ADD CONSTRAINT "queue_ticket_item_service_option_id_fkey" FOREIGN KEY ("service_option_id") REFERENCES "service_option"("service_option_id") ON DELETE SET NULL ON UPDATE CASCADE;
