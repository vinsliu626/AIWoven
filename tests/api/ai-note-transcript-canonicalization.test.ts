import { describe, expect, it } from "vitest";

import { buildCanonicalTranscript, nextUnprocessedIndex } from "@/lib/aiNote/finalizeHelpers";
import {
  canonicalizeTranscriptText,
  hashCanonicalText,
  hashPromptMessages,
  joinCanonicalTranscriptSegments,
} from "@/lib/aiNote/transcriptCanonicalization";
import {
  buildAudioStudyNoteSystemPrompt,
  buildAudioStudyNoteUserPrompt,
  buildStudyNoteAuditSystemPrompt,
  buildStudyNoteAuditUserPrompt,
} from "@/lib/aiNote/prompts";

describe("AI Note canonical transcript normalization", () => {
  it.each([
    ["Thank you. .", "Thank you."],
    ["Hello  world", "Hello world"],
    ["word , next", "word, next"],
    ["word, , next", "word, next"],
    ["  first\r\n\r\n\r\nsecond  ", "first\n\nsecond"],
    ["“Hello”\u00a0world， next。", '"Hello" world, next.'],
  ])("canonicalizes harmless ASR formatting in %j", (input, expected) => {
    expect(canonicalizeTranscriptText(input)).toBe(expected);
  });

  it("removes punctuation duplicated across segment boundaries without joining words", () => {
    expect(joinCanonicalTranscriptSegments(["Thank you.", ". Next concept"])).toBe("Thank you.\nNext concept");
    expect(joinCanonicalTranscriptSegments(["first paragraph\n\nsecond paragraph", "Final sentence."])).toBe(
      "first paragraph\n\nsecond paragraph\nFinal sentence."
    );
  });

  it("preserves decimals, abbreviations, ellipses, timestamps, and formulas", () => {
    const source = "Dr. Smith measured 3.14 at 10:30... Use E = mc^2 and the U.S. standard.";
    expect(canonicalizeTranscriptText(source)).toBe(source);
  });

  it("gives the known localhost and production variants identical canonical hashes", () => {
    const localhost = canonicalizeTranscriptText("... Thank you. .");
    const production = canonicalizeTranscriptText("... Thank you.");
    expect(localhost).toBe(production);
    expect(hashCanonicalText(localhost)).toBe(hashCanonicalText(production));
  });

  it("gives punctuation-equivalent transcripts identical downstream prompt hashes", () => {
    const variants = ["Lecture evidence... Thank you. .", "Lecture evidence... Thank you."].map(canonicalizeTranscriptText);
    const segmentHashes = variants.map((text) => hashPromptMessages([
      { role: "system", content: buildAudioStudyNoteSystemPrompt("segment") },
      { role: "user", content: buildAudioStudyNoteUserPrompt(text, "segment") },
    ]));

    const segmentLedger = "## Segment Topic\nCanonical evidence ledger.";
    const finalHashes = variants.map(() => hashPromptMessages([
      { role: "system", content: buildAudioStudyNoteSystemPrompt("final") },
      { role: "user", content: buildAudioStudyNoteUserPrompt(segmentLedger, "final") },
    ]));

    const draft = "# Note\n\n## Executive Summary\nCanonical draft.";
    const auditHashes = variants.map(() => hashPromptMessages([
      { role: "system", content: buildStudyNoteAuditSystemPrompt() },
      { role: "user", content: buildStudyNoteAuditUserPrompt(segmentLedger, draft) },
    ]));

    expect(new Set(segmentHashes).size).toBe(1);
    expect(new Set(finalHashes).size).toBe(1);
    expect(new Set(auditHashes).size).toBe(1);
  });

  it("canonicalizes legacy saved rows on retry and treats completed ASR as reusable", () => {
    const resumed = buildCanonicalTranscript([
      { text: "Legacy segment. .", rawText: "Legacy segment. .", canonicalText: null },
      { text: "Next segment" },
    ]);
    expect(resumed).toBe("Legacy segment.\nNext segment");
    expect(nextUnprocessedIndex([
      { chunkIndex: 0, text: "Legacy segment." },
      { chunkIndex: 1, text: "Next segment" },
    ], 2)).toBe(2);
  });
});
