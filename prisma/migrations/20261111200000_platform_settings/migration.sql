ALTER TABLE "Payment"
 ADD COLUMN "baseAmountInPaise" INTEGER,
 ADD COLUMN "taxAmountInPaise" INTEGER,
 ADD COLUMN "taxRateBasisPoints" INTEGER,
 ADD COLUMN "taxInclusive" BOOLEAN;

CREATE TABLE "PlatformSettings" (
 "businessName" TEXT NOT NULL DEFAULT '',
 "legalAddress" TEXT NOT NULL DEFAULT '',
 "supportEmail" TEXT NOT NULL DEFAULT '',
 "grievanceContact" TEXT NOT NULL DEFAULT '',
 "id" TEXT NOT NULL DEFAULT 'platform',
 "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
 "gstRateBasisPoints" INTEGER NOT NULL DEFAULT 1800,
 "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
 "advertisementsEnabled" BOOLEAN NOT NULL DEFAULT false,
 "dashboardAds" BOOLEAN NOT NULL DEFAULT true,
 "invitationAds" BOOLEAN NOT NULL DEFAULT false,
 "publicRsvpAds" BOOLEAN NOT NULL DEFAULT false,
 "adText" TEXT NOT NULL DEFAULT '',
 "adUrl" TEXT NOT NULL DEFAULT '',
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "PlatformSettings_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "PlatformSettings_gstRate_check" CHECK ("gstRateBasisPoints" >= 0 AND "gstRateBasisPoints" <= 10000)
);
CREATE TABLE "PlatformSettingsAudit" (
 "id" TEXT NOT NULL,
 "actorUserId" TEXT NOT NULL,
 "changes" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "PlatformSettingsAudit_pkey" PRIMARY KEY ("id")
);
