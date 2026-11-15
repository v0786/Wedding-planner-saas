CREATE TABLE "AdminMfaCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "encryptedSecret" TEXT NOT NULL,
    "lastUsedStep" BIGINT NOT NULL DEFAULT -1,
    "recoveryHashes" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminMfaCredential_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AdminMfaCredential_userId_key" ON "AdminMfaCredential"("userId");
ALTER TABLE "AdminMfaCredential" ADD CONSTRAINT "AdminMfaCredential_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
