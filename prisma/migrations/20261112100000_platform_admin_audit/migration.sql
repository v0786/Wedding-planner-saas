CREATE TABLE "PlatformAdminAudit" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformAdminAudit_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PlatformAdminAudit_createdAt_idx" ON "PlatformAdminAudit"("createdAt");
CREATE INDEX "PlatformAdminAudit_actorUserId_createdAt_idx" ON "PlatformAdminAudit"("actorUserId", "createdAt");
