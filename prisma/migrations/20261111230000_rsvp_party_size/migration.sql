ALTER TABLE "RsvpSubmission" ADD COLUMN "partySize" INTEGER;
ALTER TABLE "RsvpSubmission" ADD CONSTRAINT "RsvpSubmission_partySize_check" CHECK ("partySize" IS NULL OR "partySize" BETWEEN 1 AND 1000);
