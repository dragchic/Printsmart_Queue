/*
  Warnings:

  - You are about to drop the column `machine_worker_name` on the `queue_ticket` table. All the data in the column will be lost.
  - You are about to drop the column `inventory_item_id` on the `queue_ticket_item` table. All the data in the column will be lost.
  - You are about to drop the column `material_qty_used` on the `queue_ticket_item` table. All the data in the column will be lost.
  - You are about to drop the column `specification` on the `queue_ticket_item` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductionMachine" AS ENUM ('MESIN_A3_PLUS', 'MESIN_DTF', 'MESIN_INDOOR', 'MESIN_PLOTTER', 'MESIN_UV');

-- DropForeignKey
ALTER TABLE "queue_ticket_item" DROP CONSTRAINT "queue_ticket_item_inventory_item_id_fkey";

-- DropIndex
DROP INDEX "ix_queue_ticket_item_inventory_item_id";

-- AlterTable
ALTER TABLE "queue_ticket" DROP COLUMN "machine_worker_name";

-- AlterTable
ALTER TABLE "queue_ticket_item" DROP COLUMN "inventory_item_id",
DROP COLUMN "material_qty_used",
DROP COLUMN "specification",
ADD COLUMN     "needs_finishing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "production_machine" "ProductionMachine";

-- CreateTable
CREATE TABLE "queue_ticket_item_material" (
    "queue_ticket_item_material_id" SERIAL NOT NULL,
    "queue_ticket_item_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "specification_label" TEXT,
    "qty_planned" DOUBLE PRECISION,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_ticket_item_material_pkey" PRIMARY KEY ("queue_ticket_item_material_id")
);

-- CreateTable
CREATE TABLE "queue_ticket_item_material_usage" (
    "queue_ticket_item_material_usage_id" SERIAL NOT NULL,
    "queue_ticket_item_material_id" INTEGER NOT NULL,
    "qty_good" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qty_waste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qty_total_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "input_by" TEXT,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_ticket_item_material_usage_pkey" PRIMARY KEY ("queue_ticket_item_material_usage_id")
);

-- CreateIndex
CREATE INDEX "ix_qtim_queue_ticket_item_id" ON "queue_ticket_item_material"("queue_ticket_item_id");

-- CreateIndex
CREATE INDEX "ix_qtim_inventory_item_id" ON "queue_ticket_item_material"("inventory_item_id");

-- CreateIndex
CREATE INDEX "ix_qtimu_material_id" ON "queue_ticket_item_material_usage"("queue_ticket_item_material_id");

-- CreateIndex
CREATE INDEX "ix_queue_ticket_item_production_machine" ON "queue_ticket_item"("production_machine");

-- AddForeignKey
ALTER TABLE "queue_ticket_item_material" ADD CONSTRAINT "queue_ticket_item_material_queue_ticket_item_id_fkey" FOREIGN KEY ("queue_ticket_item_id") REFERENCES "queue_ticket_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_ticket_item_material" ADD CONSTRAINT "queue_ticket_item_material_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_ticket_item_material_usage" ADD CONSTRAINT "queue_ticket_item_material_usage_queue_ticket_item_materia_fkey" FOREIGN KEY ("queue_ticket_item_material_id") REFERENCES "queue_ticket_item_material"("queue_ticket_item_material_id") ON DELETE RESTRICT ON UPDATE CASCADE;
