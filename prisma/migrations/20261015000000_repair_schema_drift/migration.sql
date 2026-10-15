-- Repair drift between prisma/schema.prisma and the migration history.
--
-- These objects exist in schema.prisma (and are used by the app: AI Note job
-- locking in /api/ai-note/finalize, promo codes in /api/billing/redeem) but no
-- earlier migration created them. Databases that were synced with `prisma db push`
-- or by hand may already have some or all of them, so every statement is
-- idempotent and additive: nothing is dropped, renamed, or rewritten, and no
-- existing row is changed.

-- Enums -----------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "PromoCodeType" AS ENUM ('LIMITED', 'INTERNAL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PromoTargetPlan" AS ENUM ('PRO', 'ULTRA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AiNoteJob lease lock (used by /api/ai-note/finalize) ---------------------------
ALTER TABLE "AiNoteJob"
  ADD COLUMN IF NOT EXISTS "lockExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lockedBy" TEXT;

-- Default only affects future inserts; the app always supplies a value.
ALTER TABLE "AiNoteJob" ALTER COLUMN "segmentTimeSec" SET DEFAULT 300;

CREATE INDEX IF NOT EXISTS "AiNoteJob_noteId_idx" ON "AiNoteJob"("noteId");
CREATE INDEX IF NOT EXISTS "AiNoteJob_lockedBy_idx" ON "AiNoteJob"("lockedBy");

-- StudySession: the migration history defines this default, and schema.prisma now
-- declares it too (@default([])). Databases synced with `prisma db push` from the
-- older schema lost it; restore it so every environment converges.
ALTER TABLE "StudySession" ALTER COLUMN "selectedQuizTypes" SET DEFAULT ARRAY[]::TEXT[];

-- Promo codes (used by /api/billing/redeem) -------------------------------------
CREATE TABLE IF NOT EXISTS "PromoCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeType" "PromoCodeType" NOT NULL DEFAULT 'LIMITED',
    "targetPlan" "PromoTargetPlan" NOT NULL DEFAULT 'PRO',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "grantDurationDays" INTEGER,
    "grantFixedEndsAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redeemedCount" INTEGER NOT NULL DEFAULT 0,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdBy" TEXT,
    "lastRedeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PromoRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedPlan" "PromoTargetPlan" NOT NULL DEFAULT 'PRO',
    "grantStartAt" TIMESTAMP(3) NOT NULL,
    "grantEndAt" TIMESTAMP(3),
    "grantStatus" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "PromoRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PromoCode_codeHash_key" ON "PromoCode"("codeHash");
CREATE INDEX IF NOT EXISTS "PromoCode_isActive_expiresAt_idx" ON "PromoCode"("isActive", "expiresAt");
CREATE INDEX IF NOT EXISTS "PromoCode_createdAt_idx" ON "PromoCode"("createdAt");
CREATE INDEX IF NOT EXISTS "PromoRedemption_promoCodeId_redeemedAt_idx" ON "PromoRedemption"("promoCodeId", "redeemedAt");
CREATE INDEX IF NOT EXISTS "PromoRedemption_userId_redeemedAt_idx" ON "PromoRedemption"("userId", "redeemedAt");

-- Foreign keys are added only when missing, and NOT VALID so that pre-existing
-- rows are not re-checked (an orphaned row in an existing database must not make
-- this migration fail). New and updated rows are enforced immediately. Run
-- `ALTER TABLE "PromoRedemption" VALIDATE CONSTRAINT ...` after checking for orphans.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoRedemption_promoCodeId_fkey') THEN
    ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_promoCodeId_fkey"
      FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PromoRedemption_userId_fkey') THEN
    ALTER TABLE "PromoRedemption" ADD CONSTRAINT "PromoRedemption_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "UserEntitlement"("userId") ON DELETE RESTRICT ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;
