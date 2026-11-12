ALTER TABLE "Wedding"
  ADD COLUMN "legacyPlanCode" TEXT,
  ADD COLUMN "legacyPaidThrough" TIMESTAMP(3),
  ADD COLUMN "legacyPlanFeatures" JSONB,
  ADD COLUMN "legacyPlanLimits" JSONB;

-- Grant the remaining legacy paid period only to weddings already present
-- during this migration. New weddings do not receive a workspace-wide grant.
UPDATE "Wedding" AS wedding
SET "legacyPlanCode" = plan."code",
    "legacyPaidThrough" = subscription."currentPeriodEnd",
    "legacyPlanFeatures" = plan."features",
    "legacyPlanLimits" = plan."limits"
FROM "Subscription" AS subscription
JOIN "Plan" AS plan ON plan."id" = subscription."planId"
WHERE wedding."workspaceId" = subscription."workspaceId"
  AND subscription."status" IN ('ACTIVE', 'CANCELLED')
  AND subscription."currentPeriodEnd" > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
  AND plan."code" IN ('BASIC', 'PRO', 'PRIME');
