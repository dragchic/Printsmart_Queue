/*
  Warnings:

  - You are about to drop the column `service_type` on the `queue_ticket` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "queue_ticket" DROP COLUMN "service_type",
ADD COLUMN     "custom_service_name" TEXT,
ADD COLUMN     "service_option_id" INTEGER;

-- DropEnum
DROP TYPE "ServiceType";

-- CreateTable
CREATE TABLE "service_option" (
    "service_option_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_option_pkey" PRIMARY KEY ("service_option_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "service_option_name_key" ON "service_option"("name");

-- AddForeignKey
ALTER TABLE "queue_ticket" ADD CONSTRAINT "queue_ticket_service_option_id_fkey" FOREIGN KEY ("service_option_id") REFERENCES "service_option"("service_option_id") ON DELETE SET NULL ON UPDATE CASCADE;
