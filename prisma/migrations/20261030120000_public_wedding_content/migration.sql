-- AlterTable
ALTER TABLE "Wedding"
    ADD COLUMN "coverImageUrl" TEXT,
    ADD COLUMN "couplePhotoUrl" TEXT,
    ADD COLUMN "themeColor" TEXT,
    ADD COLUMN "whatsappMessage" TEXT;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "RsvpSubmission" ADD COLUMN "email" TEXT;
