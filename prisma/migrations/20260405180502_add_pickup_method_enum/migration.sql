/*
  Warnings:

  - The `pickup_method` column on the `queue_ticket` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PickupMethod" AS ENUM ('DITUNGGU', 'DITINGGAL');

-- AlterTable
ALTER TABLE "queue_ticket" DROP COLUMN "pickup_method",
ADD COLUMN     "pickup_method" "PickupMethod";
