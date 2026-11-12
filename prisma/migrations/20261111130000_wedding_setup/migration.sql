ALTER TABLE "Wedding"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'en-IN',
  ADD COLUMN "contactVisibility" TEXT NOT NULL DEFAULT 'hidden',
  ADD COLUMN "invitationTheme" TEXT NOT NULL DEFAULT 'classic',
  ADD COLUMN "publicFields" TEXT[] NOT NULL DEFAULT ARRAY['venue','address','description','mapUrl','coverImageUrl','couplePhotoUrl'];

ALTER TABLE "Event"
  ADD COLUMN "mapUrl" TEXT,
  ADD COLUMN "dressCode" TEXT,
  ADD COLUMN "publicFields" TEXT[] NOT NULL DEFAULT ARRAY['date','time','venue','address','description','mapUrl','dressCode','imageUrl'];
