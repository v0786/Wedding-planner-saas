ALTER TABLE "Guest"
  ADD COLUMN "side" TEXT,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "accommodationNeeds" TEXT,
  ADD COLUMN "transportNeeds" TEXT;

CREATE INDEX "Guest_weddingId_side_category_idx" ON "Guest"("weddingId", "side", "category");
