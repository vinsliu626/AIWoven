/**
 * Normalizes a successful (HTTP 2xx) transcription response body into spoken text.
 *
 * Supported shapes:
 * - JSON object with a string `text` (OpenAI/Groq-compatible, and the bundled
 *   faster-whisper server) or `transcript`, optionally with `segments[].text`.
 * - A JSON string literal.
 * - Plain text (e.g. `response_format=text`).
 *
 * An empty transcript is a valid result ("no speech detected") and is returned
 * as `""`. Response metadata (the JSON envelope, HTML error pages, provider
 * error objects) is never returned as spoken text: those throw
 * `TranscriptionResponseError` instead.
 */

export type TranscriptionResponseErrorCode = "ASR_MALFORMED_RESPONSE" | "ASR_PROVIDER_ERROR";

export class TranscriptionResponseError extends Error {
  readonly httpStatus = 502;

  constructor(
    readonly code: TranscriptionResponseErrorCode,
    message: string
  ) {
    super(message);
    this.name = "TranscriptionResponseError";
  }
}

function malformed(detail: string): never {
  throw new TranscriptionResponseError("ASR_MALFORMED_RESPONSE", `ASR_MALFORMED_RESPONSE: ${detail}`);
}

function textFromJson(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object" || Array.isArray(data)) malformed("expected a JSON object or string");

  const record = data as Record<string, unknown>;
  if (typeof record.text === "string") return record.text;
  if (typeof record.transcript === "string") return record.transcript;
  if (Array.isArray(record.segments) && record.segments.every((segment) => typeof (segment as { text?: unknown })?.text === "string")) {
    return record.segments.map((segment) => (segment as { text: string }).text).join("");
  }
  if (record.ok === false || record.error !== undefined) {
    throw new TranscriptionResponseError("ASR_PROVIDER_ERROR", "ASR_PROVIDER_ERROR: the provider returned an error object");
  }
  return malformed("no text field in JSON response");
}

export function parseTranscriptionResponse(body: string, contentType?: string | null): string {
  const type = String(contentType || "").toLowerCase();
  const trimmed = String(body ?? "").trim();

  // JSON content types must parse. Untyped bodies that look like JSON are parsed
  // too, but a plain-text transcript such as "[Music] welcome back" is still text.
  if (type.includes("json") || /^[{[]/.test(trimmed)) {
    let data: unknown;
    let parsed = false;
    try {
      data = JSON.parse(trimmed);
      parsed = true;
    } catch {
      if (type.includes("json") || trimmed.startsWith("{")) malformed("invalid JSON");
    }
    if (parsed) return textFromJson(data).trim();
  }

  if (type.includes("html") || type.includes("xml") || trimmed.startsWith("<")) {
    return malformed("markup instead of a transcript");
  }
  if (!trimmed && !type.startsWith("text/plain")) {
    return malformed("empty response body");
  }
  return trimmed;
}
