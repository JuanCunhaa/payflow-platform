-- Create enum for invoice communication types
CREATE TYPE "InvoiceCommunicationType" AS ENUM ('CREATED', 'OVERDUE', 'PAID');

-- Create table to track communications per invoice
CREATE TABLE "invoice_communications" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "type" "InvoiceCommunicationType" NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_communications_pkey" PRIMARY KEY ("id")
);

-- Indexes for lookup
CREATE INDEX "invoice_communications_invoice_id_idx"
  ON "invoice_communications"("invoice_id");

CREATE INDEX "invoice_communications_invoice_type_sent_at_idx"
  ON "invoice_communications"("invoice_id", "type", "sent_at");

-- Foreign key to invoices
ALTER TABLE "invoice_communications"
ADD CONSTRAINT "invoice_communications_invoice_id_fkey"
FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

