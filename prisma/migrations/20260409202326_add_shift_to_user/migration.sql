-- CreateEnum
CREATE TYPE "WorkShift" AS ENUM ('PAGI', 'MALAM');

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "shift" "WorkShift" DEFAULT 'PAGI';
