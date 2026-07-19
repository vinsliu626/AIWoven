-- Preserve provider output for private diagnostics while making canonical text
-- and successful ASR provenance available to resumed AI Note jobs.
ALTER TABLE "AiNoteTranscript"
ADD COLUMN "rawText" TEXT,
ADD COLUMN "canonicalText" TEXT,
ADD COLUMN "rawHash" TEXT,
ADD COLUMN "canonicalHash" TEXT,
ADD COLUMN "asrProvider" TEXT,
ADD COLUMN "asrModel" TEXT,
ADD COLUMN "asrEndpoint" TEXT;

ALTER TABLE "AiNoteJob"
ADD COLUMN "rawTranscriptHash" TEXT,
ADD COLUMN "canonicalTranscriptHash" TEXT;
