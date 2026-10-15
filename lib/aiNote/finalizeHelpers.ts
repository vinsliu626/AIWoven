import {
  canonicalTranscriptForRow,
  joinCanonicalTranscriptSegments,
  rawTranscriptForRow,
  type TranscriptRowLike,
} from "@/lib/aiNote/transcriptCanonicalization";

export const AI_NOTE_ASR_SKIPPED_PREFIX = "__AI_NOTE_ASR_SKIPPED__:";

export function isSkippedTranscript(text: string) {
  return text.startsWith(AI_NOTE_ASR_SKIPPED_PREFIX);
}

/**
 * Recorded audio is one container stream split across chunks, so the chunk
 * indexes must be exactly 0..n-1: a missing chunk (especially chunk 0, which
 * carries the container header) makes the reassembled recording undecodable.
 */
export function hasContiguousChunkIndexes(indexes: number[]) {
  const sorted = [...indexes].sort((a, b) => a - b);
  return sorted.length > 0 && sorted.every((value, position) => value === position);
}

export function nextUnprocessedIndex(rows: { chunkIndex: number; text: string }[], total: number) {
  const processed = new Set(
    rows
      .filter((row) => String(row.text || "").trim().length > 0)
      .map((row) => row.chunkIndex)
  );

  for (let index = 0; index < total; index += 1) {
    if (!processed.has(index)) return index;
  }
  return total;
}

export function buildCanonicalTranscript(rows: TranscriptRowLike[]) {
  return joinCanonicalTranscriptSegments(
    rows
      .map((row) => canonicalTranscriptForRow(row))
      .filter((text) => text && !isSkippedTranscript(text))
  );
}

export function buildRawTranscript(rows: TranscriptRowLike[]) {
  return rows
    .map((row) => rawTranscriptForRow(row))
    .filter((text) => text && !isSkippedTranscript(text))
    .join("\n")
    .trim();
}

export function buildProgressiveNote(parts: string[]) {
  const cleaned = parts.map((part) => String(part || "").trim()).filter(Boolean);
  if (cleaned.length === 0) return "";

  return [
    "# Note Draft",
    "",
    "_Completed sections are shown below while the final note is being merged._",
    "",
    cleaned.join("\n\n---\n\n"),
  ].join("\n");
}
