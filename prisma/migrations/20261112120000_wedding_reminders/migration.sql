CREATE TABLE "WeddingReminder" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "deletionAt" TIMESTAMP(3) NOT NULL,
  "offsetDays" INTEGER NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "leaseUntil" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "providerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeddingReminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WeddingReminder_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "WeddingDeletionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "WeddingReminder_jobId_deletionAt_offsetDays_key" ON "WeddingReminder"("jobId", "deletionAt", "offsetDays");
CREATE INDEX "WeddingReminder_status_scheduledAt_idx" ON "WeddingReminder"("status", "scheduledAt");
INSERT INTO "WeddingReminder" ("id", "jobId", "deletionAt", "offsetDays", "scheduledAt", "updatedAt")
SELECT md5(j.id || ':' || offset_days::text), j.id, j."scheduledFor", offset_days,
  (((w.date::date + (8 - offset_days))::timestamp AT TIME ZONE
    CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = w.timezone) THEN w.timezone ELSE 'Asia/Kolkata' END) AT TIME ZONE 'UTC'), CURRENT_TIMESTAMP
FROM "WeddingDeletionJob" j JOIN "Wedding" w ON w.id = j."weddingId"
CROSS JOIN (VALUES (7), (3)) offsets(offset_days)
WHERE j.status = 'PENDING' AND j.mode = 'SCHEDULED' AND w.date IS NOT NULL;
