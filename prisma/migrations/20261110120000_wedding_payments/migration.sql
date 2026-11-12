ALTER TABLE "Payment"
    ADD COLUMN "weddingId" TEXT,
    ADD COLUMN "weddingPlanPriceInPaise" INTEGER;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_weddingId_fkey"
    FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Payment_weddingId_status_idx" ON "Payment"("weddingId", "status");

-- Publish the launch prices for untouched legacy defaults. Existing configured
-- prices and historical payment/subscription snapshots remain unchanged.
UPDATE "Plan"
SET "priceInPaise" = CASE "code" WHEN 'PRO' THEN 99900 ELSE 199900 END,
    "billingPeriodDays" = 0,
    "isActive" = TRUE,
    "sortOrder" = CASE "code" WHEN 'PRO' THEN 2 ELSE 3 END,
    "limits" = "limits" || '{"weddings": null, "guestsPerWedding": null}'::jsonb,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" IN ('PRO', 'PRIME') AND "priceInPaise" IS NULL AND "isActive" = FALSE
    AND "billingPeriodDays" = 30;
