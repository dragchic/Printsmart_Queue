/*
  Warnings:

  - You are about to drop the column `stock_available` on the `inventory_item` table. All the data in the column will be lost.
  - You are about to drop the column `stock_initial` on the `inventory_item` table. All the data in the column will be lost.
  - You are about to drop the column `stock_out` on the `inventory_item` table. All the data in the column will be lost.
  - You are about to drop the `inventory_adjustment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[ticket_date,queue_number]` on the table `queue_ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "inventory_change_type" AS ENUM ('INITIAL', 'RESTOCK', 'USAGE', 'WASTE', 'ADJUSTMENT');

-- DropForeignKey
ALTER TABLE "inventory_adjustment" DROP CONSTRAINT "inventory_adjustment_inventory_item_id_fkey";

-- AlterTable
ALTER TABLE "inventory_item" DROP COLUMN "stock_available",
DROP COLUMN "stock_initial",
DROP COLUMN "stock_out",
ADD COLUMN     "stock_current" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_option" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropTable
DROP TABLE "inventory_adjustment";

-- CreateTable
CREATE TABLE "inventory_stock_change" (
    "inventory_stock_change_id" SERIAL NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "qty_change" DOUBLE PRECISION NOT NULL,
    "change_type" "inventory_change_type" NOT NULL,
    "note" TEXT,
    "input_by" TEXT,
    "ticket_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_stock_change_pkey" PRIMARY KEY ("inventory_stock_change_id")
);

-- CreateIndex
CREATE INDEX "ix_inventory_stock_change_inventory_item_id" ON "inventory_stock_change"("inventory_item_id");

-- CreateIndex
CREATE INDEX "ix_inventory_stock_change_ticket_id" ON "inventory_stock_change"("ticket_id");

-- CreateIndex
CREATE INDEX "ix_inventory_stock_change_change_type" ON "inventory_stock_change"("change_type");

-- CreateIndex
CREATE INDEX "ix_inventory_stock_change_created_at" ON "inventory_stock_change"("created_at");

-- CreateIndex
CREATE INDEX "ix_inventory_item_is_active" ON "inventory_item"("is_active");

-- CreateIndex
CREATE INDEX "ix_inventory_item_name" ON "inventory_item"("name");

-- CreateIndex
CREATE INDEX "ix_order_inventory_usage_ticket_id" ON "order_inventory_usage"("ticket_id");

-- CreateIndex
CREATE INDEX "ix_order_inventory_usage_inventory_item_id" ON "order_inventory_usage"("inventory_item_id");

-- CreateIndex
CREATE INDEX "ix_order_inventory_usage_created_at" ON "order_inventory_usage"("created_at");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_customer_id" ON "queue_ticket"("customer_id");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_status" ON "queue_ticket"("status");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_pickup_status" ON "queue_ticket"("pickup_status");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_ticket_date" ON "queue_ticket"("ticket_date");

-- CreateIndex
CREATE UNIQUE INDEX "ux_queue_ticket_ticket_date_queue_number" ON "queue_ticket"("ticket_date", "queue_number");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_item_service_option_id" ON "queue_ticket_item"("service_option_id");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_item_inventory_item_id" ON "queue_ticket_item"("inventory_item_id");

-- AddForeignKey
ALTER TABLE "inventory_stock_change" ADD CONSTRAINT "inventory_stock_change_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_stock_change" ADD CONSTRAINT "inventory_stock_change_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "queue_ticket"("ticket_id") ON DELETE SET NULL ON UPDATE CASCADE;
