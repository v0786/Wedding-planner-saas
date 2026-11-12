ALTER TABLE "RsvpSubmission"
  ADD COLUMN "browserTokenHash" TEXT,
  ADD COLUMN "transferTokenHash" TEXT,
  ADD COLUMN "transferGroupBrowserHash" TEXT,
  ADD COLUMN "transferExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "RsvpSubmission_transferTokenHash_key" ON "RsvpSubmission"("transferTokenHash");
