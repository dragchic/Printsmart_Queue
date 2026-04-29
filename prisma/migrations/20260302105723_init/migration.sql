-- CreateTable
CREATE TABLE "customer" (
    "customer_id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "queue_ticket" (
    "ticket_id" SERIAL NOT NULL,
    "ticket_date" DATE NOT NULL,
    "queue_number" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'WAITING',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "handled_by" INTEGER,

    CONSTRAINT "queue_ticket_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ux_customer_phone_number" ON "customer"("phone_number");

-- CreateIndex
CREATE INDEX "ix_customer_name" ON "customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_queue_per_day" ON "queue_ticket"("ticket_date", "queue_number");

-- AddForeignKey
ALTER TABLE "queue_ticket" ADD CONSTRAINT "fk_customer" FOREIGN KEY ("customer_id") REFERENCES "customer"("customer_id") ON DELETE NO ACTION ON UPDATE NO ACTION;
