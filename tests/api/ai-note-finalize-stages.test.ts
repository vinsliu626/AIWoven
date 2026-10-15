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
  markNoteAttempt: vi.fn(),
  recordNoteGenerateSuccess: vi.fn(),
  prisma: {
    aiNoteSession: { findUnique: vi.fn() },
    aiNoteJob: { upsert: vi.fn(), updateMany: vi.fn(), update: vi.fn() },
    aiNoteChunk: { findMany: vi.fn(), deleteMany: vi.fn() },
    aiNoteTranscript: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    aiNoteSummaryPart: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
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
  markNoteAttempt: mocks.markNoteAttempt,
  NoteLimitError: class NoteLimitError extends Error {
    constructor(public code: string, message: string, public status = 429) {
      super(message);
    }
  },
  recordNoteGenerateSuccess: mocks.recordNoteGenerateSuccess,
}));
vi.mock("@/lib/billing/guard", () => ({
  assertQuotaOrThrow: mocks.assertQuotaOrThrow,
  QuotaError: class QuotaError extends Error {
    constructor(public code: string, message: string, public status = 429) {
      super(message);
    }
  },
}));
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
  vi.resetAllMocks();
  delete process.env.AI_NOTE_TEST_MODE;
  process.env.GROQ_API_KEY = "test-key";
  mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
  mocks.prisma.aiNoteSession.findUnique.mockResolvedValue({ userId: "user_1", createdAt: new Date() });
  mocks.prisma.aiNoteJob.updateMany.mockResolvedValue({ count: 1 });
  mocks.prisma.aiNoteJob.update.mockResolvedValue({});
  mocks.prisma.aiNoteTranscript.findMany.mockResolvedValue([]);
  mocks.prisma.aiNoteTranscript.upsert.mockResolvedValue({});
  mocks.prisma.aiNoteSummaryPart.findMany.mockResolvedValue([]);
  mocks.prisma.aiNoteSummaryPart.upsert.mockResolvedValue({});
  mocks.prisma.aiNoteChunk.deleteMany.mockResolvedValue({ count: 0 });
  mocks.prisma.aiNoteTranscript.deleteMany.mockResolvedValue({ count: 0 });
  mocks.prisma.aiNoteSummaryPart.deleteMany.mockResolvedValue({ count: 0 });
  mocks.addUsageEvent.mockResolvedValue(undefined);
  mocks.recordNoteGenerateSuccess.mockResolvedValue(undefined);
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

describe("finalize prep: eligibility is checked before any audio is decoded or transcribed", () => {
  beforeEach(() => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "prep" });
    mocks.prisma.aiNoteChunk.findMany.mockResolvedValue([{ chunkIndex: 0, size: 10 }, { chunkIndex: 1, size: 10 }]);
  });

  const advancedToAsr = () => mocks.prisma.aiNoteJob.update.mock.calls.some(([args]) => args?.data?.stage === "asr");

  it("rejects a user who has used today's generations, without starting the job", async () => {
    const { NoteLimitError } = await import("@/lib/aiNote/quota");
    mocks.assertNoteRequestAllowed.mockRejectedValue(new NoteLimitError("NOTE_DAILY_LIMIT_REACHED", "You've used all AI Note generations for today.", 429));

    const result = await finalize();

    expect(result.status).toBe(429);
    expect(result.body).toMatchObject({ ok: false, error: "NOTE_DAILY_LIMIT_REACHED", retryable: false });
    expect(advancedToAsr()).toBe(false);
    expect(mocks.markNoteAttempt).not.toHaveBeenCalled();
    expect(mocks.transcribeAudioToText).not.toHaveBeenCalled();
  });

  it("rejects a user with no note time left this week, with a readable message", async () => {
    const { QuotaError } = await import("@/lib/billing/guard");
    mocks.assertQuotaOrThrow.mockRejectedValue(new QuotaError("NOTE_QUOTA_EXCEEDED", "Quota exceeded: note_seconds. used=7200, limit=7200, remaining=0", 429));

    const result = await finalize();

    expect(result.status).toBe(429);
    expect(result.body.error).toBe("NOTE_QUOTA_EXCEEDED");
    expect(result.body.message).not.toMatch(/used=|limit=/);
    expect(advancedToAsr()).toBe(false);
  });

  it("starts the job and records the attempt when the user is eligible", async () => {
    const result = await finalize();

    expect(result.status).toBe(200);
    expect(result.body.stage).toBe("asr");
    expect(mocks.assertNoteRequestAllowed).toHaveBeenCalledWith("user_1", 0, expect.objectContaining({ allowStaged: true }));
    expect(mocks.assertQuotaOrThrow).toHaveBeenCalledWith({ userId: "user_1", action: "note", amount: 1 });
    expect(mocks.markNoteAttempt).toHaveBeenCalledWith("user_1");
    expect(advancedToAsr()).toBe(true);
  });
});

describe.skipIf(!hasFfmpeg)("finalize ASR: verified audio duration", () => {
  beforeEach(() => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "asr", segmentTimeSec: 180, asrNextIndex: 0, secondsBilled: null });
    mocks.prisma.aiNoteChunk.findMany.mockResolvedValue([{ chunkIndex: 0, size: fixture.length, mime: "audio/webm", data: fixture }]);
    mocks.transcribeAudioToText.mockResolvedValue("Spoken words.");
  });

  it("checks the weekly quota with the decoded duration before transcribing, ignoring the client's claim", async () => {
    const order: string[] = [];
    mocks.assertQuotaOrThrow.mockImplementation(async () => void order.push("quota"));
    mocks.transcribeAudioToText.mockImplementation(async () => (order.push("transcribe"), "Spoken words."));

    // The client claims 1 second; the fixture decodes to 3.96 s.
    await finalize({ totalDurationMs: 1_000 });

    expect(mocks.assertQuotaOrThrow).toHaveBeenCalledWith({ userId: "user_1", action: "note", amount: 4 });
    expect(order).toEqual(["quota", "transcribe"]);
    expect(mocks.prisma.aiNoteJob.update).toHaveBeenCalledWith({ where: { noteId: NOTE_ID }, data: { secondsBilled: 4 } });
  });

  it("does not transcribe when the recording is longer than the remaining quota", async () => {
    const { QuotaError } = await import("@/lib/billing/guard");
    mocks.assertQuotaOrThrow.mockRejectedValue(new QuotaError("NOTE_QUOTA_EXCEEDED", "Quota exceeded", 429));

    const result = await finalize();

    expect(result.status).toBe(429);
    expect(result.body.error).toBe("NOTE_QUOTA_EXCEEDED");
    expect(mocks.transcribeAudioToText).not.toHaveBeenCalled();
    expect(mocks.callGroqTranscribe).not.toHaveBeenCalled();
  });

  it("does not re-check or overwrite the verified duration on later ASR steps", async () => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "asr", segmentTimeSec: 180, asrNextIndex: 0, secondsBilled: 4 });

    await finalize();

    expect(mocks.assertQuotaOrThrow).not.toHaveBeenCalled();
    expect(mocks.prisma.aiNoteJob.update.mock.calls.some(([args]) => "secondsBilled" in (args?.data ?? {}))).toBe(false);
  });
});

describe("finalize LLM and merge: limits and billing", () => {
  it("re-checks the transcript size without re-applying the cooldown the job already passed", async () => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "llm", llmNextPart: 0, llmPartsTotal: 1, secondsBilled: 4 });
    mocks.prisma.aiNoteTranscript.findMany.mockResolvedValue([{ text: "Spoken words about entropy.", rawText: "Spoken words about entropy.", canonicalText: "Spoken words about entropy." }]);
    mocks.runAiNotePipeline.mockResolvedValue("## Segment Topic\nEntropy");
    process.env.AI_NOTE_LLM_PAUSE_MS = "0";

    await finalize();

    expect(mocks.assertNoteRequestAllowed).toHaveBeenCalledWith("user_1", expect.any(Number), { allowStaged: true, checkCooldown: false });
    expect(mocks.assertQuotaOrThrow).toHaveBeenCalledWith({ userId: "user_1", action: "note", amount: 4 });
    delete process.env.AI_NOTE_LLM_PAUSE_MS;
  });

  it("bills the verified audio duration, not the session's wall-clock age", async () => {
    // Session created an hour ago (slow upload + processing); the audio is 4 s long.
    mocks.prisma.aiNoteSession.findUnique.mockResolvedValue({ userId: "user_1", createdAt: new Date(Date.now() - 60 * 60_000) });
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "merge", secondsBilled: 4 });
    mocks.prisma.aiNoteTranscript.findMany.mockResolvedValue([{ text: "Spoken words.", rawText: "Spoken words.", canonicalText: "Spoken words." }]);
    mocks.prisma.aiNoteSummaryPart.findMany.mockResolvedValue([{ text: "## Segment Topic\nEntropy" }]);
    mocks.prisma.aiNoteChunk.deleteMany.mockResolvedValue({ count: 1 });
    mocks.runAiNotePipeline.mockResolvedValue("# Notes\n\n## Executive Summary\nEntropy.");

    const result = await finalize({ inputType: "upload" });

    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({ stage: "done", secondsBilled: 4 });
    expect(mocks.addUsageEvent).toHaveBeenCalledWith("user_1", "note_seconds", 4);
  });
});

describe("finalize merge: retention of processing data", () => {
  beforeEach(() => {
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "merge", secondsBilled: 4 });
    mocks.prisma.aiNoteTranscript.findMany.mockResolvedValue([{ text: "Spoken words.", rawText: "Spoken words.", canonicalText: "Spoken words." }]);
    mocks.prisma.aiNoteSummaryPart.findMany.mockResolvedValue([{ text: "## Segment Topic\nEntropy" }]);
  });

  it("deletes audio, transcripts, and segment ledgers once the finished note is saved, and keeps the note", async () => {
    mocks.runAiNotePipeline.mockResolvedValue("# Notes\n\n## Executive Summary\nEntropy.");

    const result = await finalize();

    expect(result.body.stage).toBe("done");
    const savedDone = mocks.prisma.aiNoteJob.update.mock.calls.find(([args]) => args?.data?.stage === "done")?.[0];
    expect(savedDone?.data.noteMarkdown).toContain("Executive Summary");
    for (const table of [mocks.prisma.aiNoteChunk, mocks.prisma.aiNoteTranscript, mocks.prisma.aiNoteSummaryPart]) {
      expect(table.deleteMany).toHaveBeenCalledWith({ where: { noteId: NOTE_ID } });
    }
    // The note is saved before anything is deleted.
    const doneOrder = mocks.prisma.aiNoteJob.update.mock.invocationCallOrder.at(-1)!;
    expect(mocks.prisma.aiNoteTranscript.deleteMany.mock.invocationCallOrder[0]).toBeGreaterThan(doneOrder);
  });

  it("keeps transcripts and ledgers when the final merge fails, so the user can retry from finalizing", async () => {
    mocks.runAiNotePipeline.mockRejectedValue(new Error("provider timeout"));

    const result = await finalize();

    expect(result.status).toBeGreaterThanOrEqual(400);
    expect(mocks.prisma.aiNoteTranscript.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.aiNoteSummaryPart.deleteMany).not.toHaveBeenCalled();
    expect(mocks.prisma.aiNoteChunk.deleteMany).not.toHaveBeenCalled();
  });

  it("still completes the note if cleanup fails", async () => {
    mocks.runAiNotePipeline.mockResolvedValue("# Notes\n\n## Executive Summary\nEntropy.");
    mocks.prisma.aiNoteTranscript.deleteMany.mockRejectedValue(new Error("db busy"));

    const result = await finalize();

    expect(result.status).toBe(200);
    expect(result.body.stage).toBe("done");
  });
});
