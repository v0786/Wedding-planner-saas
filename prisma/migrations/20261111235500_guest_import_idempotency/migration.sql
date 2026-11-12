CREATE TABLE "GuestImport" (
  "id" TEXT NOT NULL,
  "weddingId" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "importedCount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestImport_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuestImport_weddingId_keyHash_key" ON "GuestImport"("weddingId", "keyHash");
ALTER TABLE "GuestImport" ADD CONSTRAINT "GuestImport_weddingId_fkey"
  FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
