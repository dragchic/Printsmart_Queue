-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'COUNTER_SERVICE', 'MACHINE');

-- CreateTable
CREATE TABLE "user" (
    "user_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("user_id")
);
