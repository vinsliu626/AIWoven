import { createHash } from "node:crypto";

const ELLIPSIS_TOKEN = "\uE000AI_NOTE_ELLIPSIS\uE001";

const SAFE_UNICODE_PUNCTUATION: Record<string, string> = {
  "\u00a0": " ",
  "\u2018": "'",
  "\u2019": "'",
  "\u201c": '"',
  "\u201d": '"',
  "\u3002": ".",
  "\uff0c": ",",
  "\uff0e": ".",
  "\uff01": "!",
  "\uff1a": ":",
  "\uff1b": ";",
  "\uff1f": "?",
};

export type TranscriptRowLike = {
  text?: string | null;
  rawText?: string | null;
  canonicalText?: string | null;
};

export type PromptMessageLike = {
  role: string;
  content: string;
};

/**
 * Removes ASR formatting noise without changing words, grammar, or meaning.
 * Contiguous ellipses are protected before duplicate punctuation is collapsed.
 */
export function canonicalizeTranscriptText(value: string | null | undefined) {
  let text = String(value || "").replace(/\r\n?/g, "\n");

  text = text.replace(/[\u00a0\u2018\u2019\u201c\u201d\u3002\uff0c\uff0e\uff01\uff1a\uff1b\uff1f]/g, (mark) =>
    SAFE_UNICODE_PUNCTUATION[mark] ?? mark
  );

  text = text.replace(/\.{3,}|\u2026/g, ELLIPSIS_TOKEN);
  text = text.replace(/[^\S\n]+/g, " ");
  text = text.replace(/ +$/gm, "").replace(/^ +/gm, "");

  // Remove spacing introduced before punctuation while leaving decimals and
  // already-valid formulas/timestamps untouched.
  text = text.replace(/\s+([,;:!?])/g, "$1");
  text = text.replace(/([\p{L}\p{N})\]}"'])\s+\.(?=\s|$)/gu, "$1.");

  // Collapse punctuation duplicated by ASR decoding or adjacent segment joins.
  text = text.replace(/,{2,}/g, ",").replace(/;{2,}/g, ";").replace(/:{2,}/g, ":");
  text = text.replace(/([!?])\1+/g, "$1");
  text = text.replace(/([,;:])(?:\s+\1)+(?=\s|$)/g, "$1");
  text = text.replace(/([.!?])(?:\s+[.!?])+(?=\s|$)/g, "$1");

  // Punctuation-only ASR lines/tokens carry no spoken content. Protected
  // ellipses are restored later and therefore are not removed here.
  text = text
    .split("\n")
    .filter((line) => !/^[.,;:!?]+$/.test(line.trim()))
    .join("\n");
  text = text.replace(/^(?:[.,;:!?]\s+)+/, "");

  text = text.replace(new RegExp(ELLIPSIS_TOKEN, "g"), "...");
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
}

export function canonicalTranscriptForRow(row: TranscriptRowLike) {
  return canonicalizeTranscriptText(row.canonicalText ?? row.text ?? row.rawText ?? "");
}

export function rawTranscriptForRow(row: TranscriptRowLike) {
  return String(row.rawText ?? row.text ?? row.canonicalText ?? "").trim();
}

export function joinCanonicalTranscriptSegments(values: Array<string | null | undefined>) {
  return canonicalizeTranscriptText(
    values
      .map((value) => canonicalizeTranscriptText(value))
      .filter(Boolean)
      .join("\n")
  );
}

export function hashCanonicalText(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashPromptMessages(messages: PromptMessageLike[]) {
  const framed = messages
    .map((message) => `${message.role.length}:${message.role}${message.content.length}:${message.content}`)
    .join("|");
  return hashCanonicalText(framed);
}

export function transcriptNormalizationMetadata(rawText: string, canonicalText = canonicalizeTranscriptText(rawText)) {
  return {
    rawTranscriptHash: hashCanonicalText(rawText),
    canonicalTranscriptHash: hashCanonicalText(canonicalText),
    normalizationChanged: rawText !== canonicalText,
    normalizedCharacterDelta: canonicalText.length - rawText.length,
  };
}
