import { describe, expect, it } from "vitest";

import { buildProgressiveNote, hasContiguousChunkIndexes, isSkippedTranscript, nextUnprocessedIndex } from "@/lib/aiNote/finalizeHelpers";

describe("ai-note finalize helpers", () => {
  it("treats skipped transcript sentinels as processed", () => {
    const rows = [
      { chunkIndex: 0, text: "hello" },
      { chunkIndex: 1, text: '__AI_NOTE_ASR_SKIPPED__:{"cause":"timeout"}' },
      { chunkIndex: 3, text: "later" },
    ];

    expect(nextUnprocessedIndex(rows, 5)).toBe(2);
  });

  it("recognizes skipped transcript markers", () => {
    expect(isSkippedTranscript('__AI_NOTE_ASR_SKIPPED__:{"cause":"timeout"}')).toBe(true);
    expect(isSkippedTranscript("normal transcript")).toBe(false);
  });

  it("builds a progressive note draft from completed parts", () => {
    const draft = buildProgressiveNote(["## Part 1\nAlpha", "## Part 2\nBeta"]);
    expect(draft).toContain("# Note Draft");
    expect(draft).toContain("Alpha");
    expect(draft).toContain("Beta");
  });

  it("does not request ASR again when a retry starts from finalizing with every segment saved", () => {
    expect(nextUnprocessedIndex([
      { chunkIndex: 0, text: "Canonical first segment." },
      { chunkIndex: 1, text: "Canonical second segment." },
    ], 2)).toBe(2);
  });

  it("requires recorded chunks to be contiguous from 0, because chunk 0 carries the container header", () => {
    expect(hasContiguousChunkIndexes([0, 1, 2])).toBe(true);
    expect(hasContiguousChunkIndexes([2, 0, 1])).toBe(true);
    expect(hasContiguousChunkIndexes([1, 2, 3])).toBe(false);
    expect(hasContiguousChunkIndexes([0, 2])).toBe(false);
    expect(hasContiguousChunkIndexes([])).toBe(false);
  });
});

describe("no-speech ASR segments", () => {
  it("stores empty or punctuation-only results as an explicit no-speech marker", async () => {
    const { AI_NOTE_NO_SPEECH_MARKER, storedSegmentTranscript } = await import("@/lib/aiNote/finalizeHelpers");
    expect(storedSegmentTranscript("")).toEqual({ rawText: "", canonicalText: AI_NOTE_NO_SPEECH_MARKER, noSpeech: true });
    expect(storedSegmentTranscript("  . ")).toMatchObject({ canonicalText: AI_NOTE_NO_SPEECH_MARKER, noSpeech: true });
    expect(storedSegmentTranscript(" Hello class ")).toEqual({ rawText: "Hello class", canonicalText: "Hello class", noSpeech: false });
  });

  it("counts no-speech segments as processed and leaves them out of the note transcript", async () => {
    const { AI_NOTE_NO_SPEECH_MARKER, buildCanonicalTranscript, buildRawTranscript } = await import("@/lib/aiNote/finalizeHelpers");
    const rows = [
      { chunkIndex: 0, text: "First idea.", rawText: "First idea.", canonicalText: "First idea." },
      { chunkIndex: 1, text: AI_NOTE_NO_SPEECH_MARKER, rawText: "", canonicalText: AI_NOTE_NO_SPEECH_MARKER },
      { chunkIndex: 2, text: "Second idea.", rawText: "Second idea.", canonicalText: "Second idea." },
    ];
    expect(nextUnprocessedIndex(rows, 3)).toBe(3);
    expect(buildCanonicalTranscript(rows)).toBe("First idea.\nSecond idea.");
    expect(buildRawTranscript(rows)).toBe("First idea.\nSecond idea.");
    expect(buildCanonicalTranscript([rows[1]])).toBe("");
  });
});

describe("verified WAV duration", () => {
  function wav(dataBytes: number, extraChunk = 0) {
    const header = Buffer.alloc(12 + (extraChunk ? 8 + extraChunk : 0) + 8);
    header.write("RIFF", 0, "ascii");
    header.writeUInt32LE(header.length - 8 + dataBytes, 4);
    header.write("WAVE", 8, "ascii");
    let offset = 12;
    if (extraChunk) {
      header.write("LIST", offset, "ascii");
      header.writeUInt32LE(extraChunk, offset + 4);
      offset += 8 + extraChunk;
    }
    header.write("data", offset, "ascii");
    header.writeUInt32LE(dataBytes, offset + 4);
    return { header, fileBytes: header.length + dataBytes };
  }

  it("reads the data chunk, so ffmpeg's longer header does not add a billed second", async () => {
    const { wavDurationSeconds } = await import("@/lib/aiNote/finalizeHelpers");
    // 13.000 s at 16 kHz mono 16-bit, behind a 26-byte LIST chunk (78-byte header, as ffmpeg writes).
    const exact = wav(13 * 32_000, 26);
    expect(wavDurationSeconds(exact.header, exact.fileBytes)).toBe(13);
    // Partial seconds round up.
    const partial = wav(13 * 32_000 + 2);
    expect(wavDurationSeconds(partial.header, partial.fileBytes)).toBe(14);
  });

  it("falls back to the file size for an unreadable header and never returns less than 1", async () => {
    const { wavDurationSeconds } = await import("@/lib/aiNote/finalizeHelpers");
    expect(wavDurationSeconds(new Uint8Array(4), 44 + 5 * 32_000)).toBe(5);
    expect(wavDurationSeconds(new Uint8Array(0), 0)).toBe(1);
  });
});
