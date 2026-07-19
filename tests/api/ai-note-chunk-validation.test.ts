import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const getServerSession = vi.fn();
  const prisma = {
    aiNoteSession: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    aiNoteChunk: {
      upsert: vi.fn(),
      count: vi.fn(),
    },
  };
  return { getServerSession, prisma };
});

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/auth/devBypass", () => ({
  devBypassUserId: () => null,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

describe("POST /api/ai-note/chunk noteId validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("rejects non-UUID noteId to prevent unsafe path usage", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });

    const { POST } = await import("@/app/api/ai-note/chunk/route");
    const req = new Request("http://localhost/api/ai-note/chunk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        noteId: "..\\..\\evil",
        chunkIndex: 0,
        mime: "audio/webm",
        encoding: "base64",
        data: "AA==",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("INVALID_NOTE_ID");
    expect(mocks.prisma.aiNoteSession.upsert).not.toHaveBeenCalled();
  });

  it("stores a repeated chunk index idempotently with an upsert", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user_1" } });
    mocks.prisma.aiNoteSession.findUnique.mockResolvedValue({ userId: "user_1" });
    mocks.prisma.aiNoteSession.upsert.mockResolvedValue({});
    mocks.prisma.aiNoteChunk.upsert.mockResolvedValue({});
    mocks.prisma.aiNoteChunk.count.mockResolvedValue(1);
    const { POST } = await import("@/app/api/ai-note/chunk/route");
    const makeRequest = () => new Request("http://localhost/api/ai-note/chunk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        noteId: "0e6dfbbc-fbe8-4d87-8f48-c82350a95409",
        chunkIndex: 0,
        mime: "audio/mpeg",
        encoding: "base64",
        data: "YWJj",
      }),
    });

    expect((await POST(makeRequest())).status).toBe(200);
    expect((await POST(makeRequest())).status).toBe(200);
    expect(mocks.prisma.aiNoteChunk.upsert).toHaveBeenCalledTimes(2);
    expect(mocks.prisma.aiNoteChunk.upsert).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { noteId_chunkIndex: { noteId: "0e6dfbbc-fbe8-4d87-8f48-c82350a95409", chunkIndex: 0 } },
    }));
  });
});
