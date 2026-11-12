CREATE TABLE "GroupInvitation" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mobile" TEXT,
    "tokenHash" TEXT NOT NULL,
    "browserHash" TEXT,
    "revokedAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "checkedInBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroupInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupInvitation_tokenHash_key" ON "GroupInvitation"("tokenHash");
CREATE INDEX "GroupInvitation_weddingId_idx" ON "GroupInvitation"("weddingId");
ALTER TABLE "GroupInvitation" ADD CONSTRAINT "GroupInvitation_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RsvpSubmission" ADD COLUMN "groupInvitationId" TEXT;
CREATE UNIQUE INDEX "RsvpSubmission_groupInvitationId_key" ON "RsvpSubmission"("groupInvitationId");
ALTER TABLE "RsvpSubmission" ADD CONSTRAINT "RsvpSubmission_groupInvitationId_fkey" FOREIGN KEY ("groupInvitationId") REFERENCES "GroupInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
