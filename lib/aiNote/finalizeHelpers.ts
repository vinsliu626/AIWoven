import {
  canonicalizeTranscriptText,
  canonicalTranscriptForRow,
  joinCanonicalTranscriptSegments,
  rawTranscriptForRow,
  type TranscriptRowLike,
} from "@/lib/aiNote/transcriptCanonicalization";

export const AI_NOTE_ASR_SKIPPED_PREFIX = "__AI_NOTE_ASR_SKIPPED__:";

export const AI_NOTE_NO_SPEECH_MARKER = `${AI_NOTE_ASR_SKIPPED_PREFIX}{"cause":"no_speech"}`;

export function isSkippedTranscript(text: string) {
  return text.startsWith(AI_NOTE_ASR_SKIPPED_PREFIX);
}

/**
 * Maps one ASR segment result to what is stored for it. A segment with no
 * spoken content (empty or punctuation-only) is stored as an explicit
 * "no speech" marker: it counts as processed, so it is not transcribed again,
 * and it is excluded from the transcript that notes are generated from.
 */
export function storedSegmentTranscript(text: string | null | undefined) {
  const rawText = String(text ?? "").trim();
  const canonicalText = canonicalizeTranscriptText(rawText);
  if (!canonicalText) return { rawText, canonicalText: AI_NOTE_NO_SPEECH_MARKER, noSpeech: true };
  return { rawText, canonicalText, noSpeech: false };
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

/**
 * Whole seconds (rounded up) of PCM audio in a WAV file, read from its RIFF
 * `data` chunk. ffmpeg writes extra chunks (e.g. LIST/INFO) before `data`, so
 * the header is not always 44 bytes. Falls back to the file size when the
 * header cannot be parsed. Defaults match the ASR stage: 16 kHz, mono, 16-bit.
 */
export function wavDurationSeconds(header: Uint8Array, fileBytes: number, bytesPerSecond = 16_000 * 2) {
  const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
  const ascii = (offset: number) => String.fromCharCode(...header.subarray(offset, offset + 4));
  let dataBytes = Math.max(0, fileBytes - 44);
  if (header.byteLength >= 12 && ascii(0) === "RIFF" && ascii(8) === "WAVE") {
    for (let offset = 12; offset + 8 <= header.byteLength; ) {
      const size = view.getUint32(offset + 4, true);
      if (ascii(offset) === "data") {
        // ffmpeg may leave the size as a placeholder when it cannot seek back; trust the file then.
        dataBytes = size > 0 && size !== 0xffffffff ? Math.min(size, fileBytes - offset - 8) : fileBytes - offset - 8;
        break;
      }
      offset += 8 + size + (size % 2);
    }
  }
  return Math.max(1, Math.ceil(dataBytes / bytesPerSecond));
}

