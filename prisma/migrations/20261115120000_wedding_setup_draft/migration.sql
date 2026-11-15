CREATE TABLE "WeddingSetupDraft" (
  "userId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "step" INTEGER NOT NULL DEFAULT 0,
  "completedWeddingId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WeddingSetupDraft_pkey" PRIMARY KEY ("userId"),
  CONSTRAINT "WeddingSetupDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "WeddingSetupDraft" ENABLE ROW LEVEL SECURITY;
