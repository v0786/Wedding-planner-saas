CREATE TABLE "WeddingDeletionJob" (
  "id" TEXT NOT NULL,
  "weddingId" TEXT,
  "weddingIdHash" TEXT NOT NULL,
  "requestedByUserHash" TEXT,
  "mode" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "safeResult" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeddingDeletionJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WeddingDeletionJob_weddingId_key" ON "WeddingDeletionJob"("weddingId");
CREATE UNIQUE INDEX "WeddingDeletionJob_weddingIdHash_key" ON "WeddingDeletionJob"("weddingIdHash");
CREATE INDEX "WeddingDeletionJob_status_scheduledFor_idx" ON "WeddingDeletionJob"("status", "scheduledFor");

-- Seed schedules for existing dated weddings without retaining names or guest data.
INSERT INTO "WeddingDeletionJob" ("id", "weddingId", "weddingIdHash", "scheduledFor", "updatedAt")
SELECT 'deletion_' || w."id", w."id", encode(sha256(convert_to(w."id", 'UTF8')), 'hex'),
       ((w."date"::date + 8)::timestamp AT TIME ZONE (CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = w."timezone") THEN w."timezone" ELSE 'Asia/Kolkata' END)) AT TIME ZONE 'UTC', CURRENT_TIMESTAMP
FROM "Wedding" w WHERE w."date" IS NOT NULL;
