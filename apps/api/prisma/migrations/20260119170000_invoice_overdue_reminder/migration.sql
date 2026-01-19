-- Add column to track last overdue reminder sent for an invoice
ALTER TABLE "invoices"
ADD COLUMN "last_reminder_sent_at" TIMESTAMP(3);

