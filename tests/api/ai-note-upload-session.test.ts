import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRouteSessionUser: vi.fn(),
  sessionCreate: vi.fn(),
  sessionFindUnique: vi.fn(),
  sessionDelete: vi.fn(),
}));

vi.mock("@/lib/auth/routeSession", () => ({ getRouteSessionUser: mocks.getRouteSessionUser }));
vi.mock("@/lib/auth/devBypass", () => ({ devBypassUserId: () => null }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiNoteSession: {
      create: mocks.sessionCreate,
      findUnique: mocks.sessionFindUnique,
      delete: mocks.sessionDelete,
    },
  },
}));

describe("AI Note upload sessions", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getRouteSessionUser.mockResolvedValue({ id: "user_1" });
    mocks.sessionCreate.mockResolvedValue({});
  });

  it("accepts metadata for a bounded chunk upload without receiving audio bytes", async () => {
    const { POST } = await import("@/app/api/ai-note/start/route");
    const response = await POST(
      new Request("http://localhost/api/ai-note/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceType: "upload", name: "lesson.mp3", mime: "audio/mpeg", size: 8_000_000, totalChunks: 3, sha256: "a".repeat(64) }),
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, noteId: expect.any(String), traceId: expect.any(String) });
    expect(mocks.sessionCreate).toHaveBeenCalledWith({ data: { id: body.noteId, userId: "user_1" } });
  });

  it("rejects upload metadata above the configured maximum", async () => {
    const { POST } = await import("@/app/api/ai-note/start/route");
    const response = await POST(
      new Request("http://localhost/api/ai-note/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceType: "upload", size: 101 * 1024 * 1024, totalChunks: 34, sha256: "a".repeat(64) }),
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({ ok: false, error: "INVALID_UPLOAD", traceId: expect.any(String) });
    expect(mocks.sessionCreate).not.toHaveBeenCalled();
  });

  it("does not allow one user to cancel another user's upload", async () => {
    mocks.sessionFindUnique.mockResolvedValue({ userId: "user_2" });
    const { DELETE } = await import("@/app/api/ai-note/start/route");
    const response = await DELETE(
      new Request("http://localhost/api/ai-note/start", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ noteId: "0e6dfbbc-fbe8-4d87-8f48-c82350a95409" }),
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({ ok: false, error: "FORBIDDEN", traceId: expect.any(String) });
    expect(mocks.sessionDelete).not.toHaveBeenCalled();
  });
});
