/*
  Warnings:

  - Added the required column `updated_at` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "user" ADD COLUMN     "created_by_id" INTEGER,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
