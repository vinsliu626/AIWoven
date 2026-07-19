import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    aiNoteSession: { findUnique: vi.fn() },
    aiNoteJob: { upsert: vi.fn(), updateMany: vi.fn() },
    aiNoteChunk: { findMany: vi.fn() },
  },
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/auth/devBypass", () => ({ devBypassUserId: () => null }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/analytics/track", () => ({ trackFeatureUsage: vi.fn() }));
vi.mock("@/lib/asr/transcribe", () => ({ transcribeAudioToText: vi.fn() }));
vi.mock("@/lib/ai/groq", () => ({ callGroqTranscribe: vi.fn() }));
vi.mock("@/lib/aiNote/pipeline", () => ({ runAiNotePipeline: vi.fn() }));
vi.mock("@/lib/aiNote/quota", () => ({
  assertNoteRequestAllowed: vi.fn(),
  markNoteAttempt: vi.fn(),
  NoteLimitError: class NoteLimitError extends Error {},
  recordNoteGenerateSuccess: vi.fn(),
}));
vi.mock("@/lib/billing/guard", () => ({ assertQuotaOrThrow: vi.fn(), QuotaError: class QuotaError extends Error {} }));
vi.mock("@/lib/billing/usage", () => ({ addUsageEvent: vi.fn() }));

describe("AI Note chunked upload integrity", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.prisma.aiNoteSession.findUnique.mockResolvedValue({ userId: "user_1", createdAt: new Date() });
    mocks.prisma.aiNoteJob.upsert.mockResolvedValue({ stage: "prep" });
    mocks.prisma.aiNoteJob.updateMany.mockResolvedValue({ count: 1 });
  });

  it("refuses generation until every byte range is present in order", async () => {
    mocks.prisma.aiNoteChunk.findMany.mockResolvedValue([
      { chunkIndex: 0, size: 3_000_000 },
      { chunkIndex: 2, size: 2_000_000 },
    ]);
    const { POST } = await import("@/app/api/ai-note/finalize/route");
    const response = await POST(
      new Request("http://localhost/api/ai-note/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          noteId: "0e6dfbbc-fbe8-4d87-8f48-c82350a95409",
          inputType: "upload",
          expectedChunks: 3,
          expectedBytes: 8_000_000,
        }),
      })
    );
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toMatchObject({ ok: false, error: "INCOMPLETE_UPLOAD", traceId: expect.any(String) });
  });
});
