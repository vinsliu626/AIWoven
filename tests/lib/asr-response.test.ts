import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { callGroqTranscribe } from "@/lib/ai/groq";
import { parseTranscriptionResponse, TranscriptionResponseError } from "@/lib/asr/response";
import { transcribeAudioToText } from "@/lib/asr/transcribe";

function expectMalformed(body: string, contentType?: string | null) {
  let error: unknown;
  try {
    parseTranscriptionResponse(body, contentType);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(TranscriptionResponseError);
  return error as TranscriptionResponseError;
}

describe("parseTranscriptionResponse", () => {
  it("returns the spoken text from successful responses", () => {
    expect(parseTranscriptionResponse('{"ok":true,"text":" Hello class. ","language":"en"}', "application/json")).toBe("Hello class.");
    expect(parseTranscriptionResponse('{"text":"Groq style","x_groq":{"id":"req_1"}}', "application/json")).toBe("Groq style");
    expect(parseTranscriptionResponse('{"transcript":"Alt field"}', "application/json")).toBe("Alt field");
    expect(parseTranscriptionResponse('{"segments":[{"text":" one"},{"text":" two"}]}', "application/json")).toBe("one two");
    expect(parseTranscriptionResponse('"a json string"', "application/json")).toBe("a json string");
    expect(parseTranscriptionResponse("Plain text transcript\n", "text/plain; charset=utf-8")).toBe("Plain text transcript");
    expect(parseTranscriptionResponse("[Music] welcome back", "text/plain")).toBe("[Music] welcome back");
    expect(parseTranscriptionResponse("untyped plain text", null)).toBe("untyped plain text");
  });

  it("returns an empty transcript (not the JSON envelope) when no speech was detected", () => {
    // Exact body asr_server/server.py returns when VAD removes all audio.
    expect(parseTranscriptionResponse('{"ok":true,"text":"","language":"en"}', "application/json")).toBe("");
    expect(parseTranscriptionResponse('{"ok":true,"text":"","language":"en"}', null)).toBe("");
    expect(parseTranscriptionResponse('{"text":"   "}', "application/json")).toBe("");
    expect(parseTranscriptionResponse("", "text/plain")).toBe("");
  });

  it("never treats response metadata or error pages as spoken text", () => {
    expect(expectMalformed('{"ok":true,"language":"en"}', "application/json").code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed('{"text":null}', "application/json").code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed("[1,2,3]", "application/json").code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed('{"ok":true,"text":', null).code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed("not json", "application/json").code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed("<html><body>502 Bad Gateway</body></html>", "text/html").code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed("<html>proxy</html>", null).code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed("", null).code).toBe("ASR_MALFORMED_RESPONSE");
    expect(expectMalformed('{"ok":false,"error":"model not loaded"}', "application/json").code).toBe("ASR_PROVIDER_ERROR");
  });

  it("marks malformed responses as a 502 so callers treat them as provider failures", () => {
    expect(expectMalformed("<html></html>").httpStatus).toBe(502);
  });
});

describe("transcription clients", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ASR_URL;
  });

  const respond = (body: string, contentType = "application/json", status = 200) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } })));

  it("external ASR: returns '' for a no-speech response instead of serialized JSON", async () => {
    process.env.ASR_URL = "http://asr.test";
    respond('{"ok":true,"text":"","language":"en"}');
    await expect(transcribeAudioToText(new Uint8Array([1, 2, 3]), { mime: "audio/wav", filename: "seg-000.wav" })).resolves.toBe("");
  });

  it("external ASR: returns text for a normal response and rejects malformed bodies", async () => {
    process.env.ASR_URL = "http://asr.test";
    respond('{"ok":true,"text":"Today we cover entropy.","language":"en"}');
    await expect(transcribeAudioToText(new Uint8Array([1]), { mime: "audio/wav" })).resolves.toBe("Today we cover entropy.");

    respond("<html>Service Unavailable</html>", "text/html");
    await expect(transcribeAudioToText(new Uint8Array([1]), { mime: "audio/wav" })).rejects.toBeInstanceOf(TranscriptionResponseError);
  });

  it("Groq ASR: an empty transcript is a successful no-speech result", async () => {
    respond('{"text":"","x_groq":{"id":"req_1"}}');
    await expect(callGroqTranscribe({ apiKey: "test", audio: Buffer.from([1]), mime: "audio/wav" })).resolves.toMatchObject({ text: "" });
  });

  it("Groq ASR: keeps text, rejects malformed bodies, and still surfaces HTTP errors", async () => {
    respond('{"text":" Hello "}');
    await expect(callGroqTranscribe({ apiKey: "test", audio: Buffer.from([1]), mime: "audio/wav" })).resolves.toMatchObject({ text: "Hello" });

    respond('{"unexpected":true}');
    await expect(callGroqTranscribe({ apiKey: "test", audio: Buffer.from([1]), mime: "audio/wav" })).rejects.toMatchObject({ code: "ASR_MALFORMED_RESPONSE", httpStatus: 502 });

    respond('{"error":{"message":"rate limited"}}', "application/json", 429);
    await expect(callGroqTranscribe({ apiKey: "test", audio: Buffer.from([1]), mime: "audio/wav" })).rejects.toMatchObject({ code: "GROQ_ASR_HTTP_429", httpStatus: 429 });
  });
});
