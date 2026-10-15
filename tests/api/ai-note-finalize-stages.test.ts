import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AI_NOTE_NO_SPEECH_MARKER } from "@/lib/aiNote/finalizeHelpers";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  transcribeAudioToText: vi.fn(),
  callGroqTranscribe: vi.fn(),
  runAiNotePipeline: vi.fn(),
  assertNoteRequestAllowed: vi.fn(),
  assertQuotaOrThrow: vi.fn(),
  addUsageEvent: vi.fn(),
  prisma: {
    aiNoteSession: { findUnique: vi.fn() },
    aiNoteJob: { upsert: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    aiNoteChunk: { findMany: vi.fn(), deleteMany: vi.fn() },
    aiNoteTranscript: { findMany: vi.fn(), upsert: vi.fn() },
    aiNoteSummaryPart: { findMany: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/devBypass", () => ({ devBypassUserId: () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/analytics/track", () => ({ trackFeatureUsage: vi.fn() }));
vi.mock("@/lib/asr/transcribe", () => ({ transcribeAudioToText: mocks.transcribeAudioToText }));
vi.mock("@/lib/ai/groq", () => ({ callGroqTranscribe: mocks.callGroqTranscribe }));
vi.mock("@/lib/aiNote/pipeline", () => ({
  runAiNotePipeline: mocks.runAiNotePipeline,
  AiNoteGenerationError: class AiNoteGenerationError extends Error {},
}));
vi.mock("@/lib/aiNote/quota", () => ({
  assertNoteRequestAllowed: mocks.assertNoteRequestAllowed,
  markNoteAttempt: vi.fn(),
  NoteLimitError: class NoteLimitError extends Error {},
  recordNoteGenerateSuccess: vi.fn(),
}));
vi.mock("@/lib/billing/guard", () => ({ assertQuotaOrThrow: mocks.assertQuotaOrThrow, QuotaError: class QuotaError extends Error {} }));
vi.mock("@/lib/billing/usage", () => ({ addUsageEvent: mocks.addUsageEvent }));

const NOTE_ID = "6a3f4a8e-2c1d-4b7e-9f10-1d2e3f4a5b6c";
const fixture = fs.readFileSync(path.resolve(__dirname, "../fixtures/audio/chromium-mediarecorder-250ms.webm"));
const hasFfmpeg = fs.existsSync(path.resolve(__dirname, "../../node_modules/ffmpeg-static/ffmpeg"));

async function finalize(body: Record<string, unknown> = {}) {
  const { POST } = await import("@/app/api/ai-note/finalize/route");
  const response = await POST(
    new Request("http://localhost/api/ai-note/finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ noteId: NOTE_ID, inputType: "record", ...body }),
    })
  );
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.AI_NOTE_TEST_MODE;
  process.env.GROQ_API_KEY = "test-key";
  mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
  mocks.prisma.aiNoteSession.findUnique.mockResolvedValue({ userId: "user_1", createdAt: new Date() });
  mocks.prisma.aiNoteJob.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.aiNoteJob.update.mockResolvedValue({});
  mocks.prisma.aiNoteTranscript.findMany.mockResolvedValue([]);
  mocks.prisma.aiNoteTranscript.upsert.mockResolvedValue({});
  mocks.prisma.aiNoteSummaryPart.findMany.mockResolvedValue([]);
});

describe.skipIf(!hasFfmpeg)("finalize ASR stage: empty transcription results", () => {
  beforeEach(() => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "asr", segmentTimeSec: 180, asrNextIndex: 0 });
    mocks.prisma.aiNoteChunk.findMany.mockResolvedValue([{ chunkIndex: 0, size: fixture.length, mime: "audio/webm", data: fixture }]);
  });

  it("stores a no-speech segment as an explicit marker, never as serialized JSON, and makes no paid fallback call", async () => {
    mocks.transcribeAudioToText.mockResolvedValue("");

    const result = await finalize();

    expect(result.status).toBe(200);
    expect(mocks.callGroqTranscribe).not.toHaveBeenCalled();
    const stored = mocks.prisma.aiNoteTranscript.upsert.mock.calls[0][0].create;
    expect(stored).toMatchObject({ chunkIndex: 0, text: AI_NOTE_NO_SPEECH_MARKER, canonicalText: AI_NOTE_NO_SPEECH_MARKER, rawText: "" });
    expect(JSON.stringify(stored)).not.toContain('\\"ok\\":true');
  });

  it("stores spoken text unchanged", async () => {
    mocks.transcribeAudioToText.mockResolvedValue("Today we cover entropy.");

    await finalize();

    expect(mocks.prisma.aiNoteTranscript.upsert.mock.calls[0][0].create).toMatchObject({
      text: "Today we cover entropy.",
      rawText: "Today we cover entropy.",
    });
  });

  it("falls back to Groq only when the external provider fails, and accepts its empty result as no speech", async () => {
    mocks.transcribeAudioToText.mockRejectedValue(Object.assign(new Error("ASR_MALFORMED_RESPONSE: markup"), { httpStatus: 502 }));
    mocks.callGroqTranscribe.mockResolvedValue({ text: "", modelUsed: "whisper-large-v3" });

    const result = await finalize();

    expect(result.status).toBe(200);
    expect(mocks.callGroqTranscribe).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.aiNoteTranscript.upsert.mock.calls[0][0].create.text).toBe(AI_NOTE_NO_SPEECH_MARKER);
  });
});

describe("finalize LLM stage: recordings without speech", () => {
  it("reports EMPTY_TRANSCRIPT instead of generating notes when every segment had no speech", async () => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "llm", llmNextPart: 0, llmPartsTotal: 0 });
    mocks.prisma.aiNoteTranscript.findMany.mockResolvedValue([
      { text: AI_NOTE_NO_SPEECH_MARKER, rawText: "", canonicalText: AI_NOTE_NO_SPEECH_MARKER },
      { text: AI_NOTE_NO_SPEECH_MARKER, rawText: "", canonicalText: AI_NOTE_NO_SPEECH_MARKER },
    ]);

    const result = await finalize();

    expect(result.status).toBe(422);
    expect(result.body.error).toBe("EMPTY_TRANSCRIPT");
    expect(mocks.runAiNotePipeline).not.toHaveBeenCalled();
  });
});
