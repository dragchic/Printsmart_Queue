-- CreateEnum
CREATE TYPE "OrderFileSource" AS ENUM ('LOCAL_UPLOAD', 'GDRIVE_LINK');

-- CreateTable
CREATE TABLE "order_file" (
    "order_file_id" SERIAL NOT NULL,
    "queue_ticket_item_id" INTEGER NOT NULL,
    "source_type" "OrderFileSource" NOT NULL,
    "original_file_name" TEXT,
    "stored_file_name" TEXT,
    "file_path" TEXT,
    "mime_type" TEXT,
    "file_size_bytes" INTEGER,
    "gdrive_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_file_pkey" PRIMARY KEY ("order_file_id")
);

-- AddForeignKey
ALTER TABLE "order_file" ADD CONSTRAINT "order_file_queue_ticket_item_id_fkey" FOREIGN KEY ("queue_ticket_item_id") REFERENCES "queue_ticket_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
