-- Add lifecycle fields without changing existing completed study records.
ALTER TABLE "StudySession"
  ALTER COLUMN "resultJson" DROP NOT NULL,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  ADD COLUMN "errorSummary" TEXT;

-- Link a generated study result to at most one reusable Flashcard set.
ALTER TABLE "FlashcardSet"
  ADD COLUMN "studySessionId" TEXT;

CREATE UNIQUE INDEX "FlashcardSet_studySessionId_key"
  ON "FlashcardSet"("studySessionId");

ALTER TABLE "FlashcardSet"
  ADD CONSTRAINT "FlashcardSet_studySessionId_fkey"
  FOREIGN KEY ("studySessionId") REFERENCES "StudySession"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
