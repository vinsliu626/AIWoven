-- Additive tables for user-authored flashcard sets. Existing study data is unchanged.
CREATE TABLE "FlashcardSet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlashcardSet_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Flashcard" (
    "id" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "frontText" TEXT NOT NULL,
    "backText" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Flashcard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FlashcardImage" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FlashcardImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FlashcardSet_userId_updatedAt_idx" ON "FlashcardSet"("userId", "updatedAt");
CREATE INDEX "FlashcardSet_userId_createdAt_idx" ON "FlashcardSet"("userId", "createdAt");
CREATE UNIQUE INDEX "Flashcard_setId_position_key" ON "Flashcard"("setId", "position");
CREATE INDEX "Flashcard_setId_idx" ON "Flashcard"("setId");
CREATE UNIQUE INDEX "FlashcardImage_cardId_side_key" ON "FlashcardImage"("cardId", "side");
CREATE INDEX "FlashcardImage_cardId_idx" ON "FlashcardImage"("cardId");

ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_setId_fkey" FOREIGN KEY ("setId") REFERENCES "FlashcardSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FlashcardImage" ADD CONSTRAINT "FlashcardImage_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
