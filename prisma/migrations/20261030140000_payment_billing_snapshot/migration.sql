-- Snapshot the billing period on the payment so admin plan changes cannot
-- alter periods that were already paid for.
ALTER TABLE "Payment" ADD COLUMN "billingPeriodDays" INTEGER NOT NULL DEFAULT 30;
