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
