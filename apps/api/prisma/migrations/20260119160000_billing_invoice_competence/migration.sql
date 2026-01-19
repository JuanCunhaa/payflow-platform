-- Add paid method enum for invoices
CREATE TYPE "InvoicePaidMethod" AS ENUM ('MANUAL', 'SANDBOX');

-- Extend invoices table with payment-related fields and competence columns
ALTER TABLE "invoices"
  ADD COLUMN "payment_link" TEXT,
  ADD COLUMN "paid_at" TIMESTAMP(3),
  ADD COLUMN "paid_method" "InvoicePaidMethod",
  ADD COLUMN "paid_note" TEXT,
  ADD COLUMN "receipt_url" TEXT,
  ADD COLUMN "competence_year" INTEGER,
  ADD COLUMN "competence_month" INTEGER;

-- Backfill competence columns for existing rows based on due_date
UPDATE "invoices"
SET
  "competence_year" = EXTRACT(year FROM "due_date")::int,
  "competence_month" = EXTRACT(month FROM "due_date")::int
WHERE "competence_year" IS NULL
  OR "competence_month" IS NULL;

-- Make competence columns required
ALTER TABLE "invoices"
  ALTER COLUMN "competence_year" SET NOT NULL,
  ALTER COLUMN "competence_month" SET NOT NULL;

-- Ensure uniqueness per tenant/contract/competence
CREATE UNIQUE INDEX "invoices_tenant_contract_competence_key"
  ON "invoices"("tenant_id", "contract_id", "competence_year", "competence_month");

