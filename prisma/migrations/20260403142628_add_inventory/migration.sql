-- DropIndex
DROP INDEX "ix_ticket_daily_status";

-- DropIndex
DROP INDEX "uq_queue_per_day";

-- AlterTable
ALTER TABLE "queue_ticket" ADD COLUMN     "machine_worker_name" TEXT,
ADD COLUMN     "order_note" TEXT,
ADD COLUMN     "order_qty" DOUBLE PRECISION,
ADD COLUMN     "pickup_method" TEXT,
ADD COLUMN     "usage_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "service_option" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "inventory_item" (
    "inventory_item_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "stock_initial" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_out" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_available" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventory_item_pkey" PRIMARY KEY ("inventory_item_id")
);

-- CreateTable
CREATE TABLE "inventory_adjustment" (
    "inventory_adjustment_id" SERIAL NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "qty_adjustment" DOUBLE PRECISION NOT NULL,
    "reason" TEXT,
    "input_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustment_pkey" PRIMARY KEY ("inventory_adjustment_id")
);

-- CreateTable
CREATE TABLE "order_inventory_usage" (
    "order_inventory_usage_id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "inventory_item_id" INTEGER NOT NULL,
    "qty_good" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qty_waste" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qty_total_used" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "input_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_inventory_usage_pkey" PRIMARY KEY ("order_inventory_usage_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_item_name_key" ON "inventory_item"("name");

-- RenameForeignKey
ALTER TABLE "queue_ticket" RENAME CONSTRAINT "fk_customer" TO "queue_ticket_customer_id_fkey";

-- AddForeignKey
ALTER TABLE "inventory_adjustment" ADD CONSTRAINT "inventory_adjustment_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inventory_usage" ADD CONSTRAINT "order_inventory_usage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "queue_ticket"("ticket_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_inventory_usage" ADD CONSTRAINT "order_inventory_usage_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_item"("inventory_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;
