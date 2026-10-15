import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRouteSessionUser: vi.fn(),
  assertNoteRequestAllowed: vi.fn(),
  getNoteQuotaStatus: vi.fn(),
  recordNoteGenerateSuccess: vi.fn(),
  generateStructuredNotesSafely: vi.fn(),
}));

vi.mock("@/lib/auth/routeSession", () => ({ getRouteSessionUser: mocks.getRouteSessionUser }));
vi.mock("@/lib/auth/devBypass", () => ({ devBypassUserId: () => null }));
vi.mock("@/lib/analytics/track", () => ({ trackFeatureUsage: vi.fn() }));
vi.mock("@/lib/billing/guard", () => ({ assertQuotaOrThrow: vi.fn(), QuotaError: class QuotaError extends Error {} }));
vi.mock("@/lib/aiNote/staged", () => ({ generateStructuredNotesSafely: mocks.generateStructuredNotesSafely }));
vi.mock("@/lib/aiNote/quota", () => ({
  assertNoteRequestAllowed: mocks.assertNoteRequestAllowed,
  getNoteQuotaStatus: mocks.getNoteQuotaStatus,
  markNoteAttempt: vi.fn(),
  recordNoteGenerateSuccess: mocks.recordNoteGenerateSuccess,
  NoteLimitError: class NoteLimitError extends Error {},
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.getRouteSessionUser.mockResolvedValue({ id: "user_1" });
  mocks.assertNoteRequestAllowed.mockResolvedValue({ mode: "standard", limits: { maxItems: 8 } });
  mocks.getNoteQuotaStatus.mockResolvedValue({ usedToday: 1, remainingToday: 2, limits: { generatesPerDay: 3 } });
  mocks.generateStructuredNotesSafely.mockResolvedValue({ note: "# Notes", meta: { mode: "single", chunkCount: 1, inputChars: 40 } });
});

describe("legacy AI Note endpoints", () => {
  it("/api/ai-note/process is retired and does no work", async () => {
    const { POST } = await import("@/app/api/ai-note/process/route");
    const response = await POST();
    expect(response.status).toBe(410);
    expect(await response.json()).toMatchObject({ ok: false, error: "DISABLED" });
  });

  it("/api/ai-note no longer transcribes multipart audio uploads (they bypassed plan checks)", async () => {
    const form = new FormData();
    form.append("file", new File([new Uint8Array([1, 2, 3])], "lecture.webm", { type: "audio/webm" }));
    const { POST } = await import("@/app/api/ai-note/route");
    const response = await POST(new Request("http://localhost/api/ai-note", { method: "POST", body: form }) as never);

    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ ok: false, error: "UNSUPPORTED_INPUT" });
    expect(mocks.assertNoteRequestAllowed).not.toHaveBeenCalled();
    expect(mocks.generateStructuredNotesSafely).not.toHaveBeenCalled();
  });

  it("/api/ai-note still generates notes from pasted text after the plan checks", async () => {
    const { POST } = await import("@/app/api/ai-note/route");
    const response = await POST(
      new Request("http://localhost/api/ai-note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ inputType: "text", text: "Entropy measures how energy spreads out in a system." }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, note: "# Notes", meta: { inputType: "text" } });
    expect(mocks.assertNoteRequestAllowed).toHaveBeenCalledWith("user_1", expect.any(Number), { allowStaged: true });
    expect(mocks.recordNoteGenerateSuccess).toHaveBeenCalledWith("user_1");
  });

  it("/api/ai-note still requires sign-in", async () => {
    mocks.getRouteSessionUser.mockResolvedValue(null);
    const { POST } = await import("@/app/api/ai-note/route");
    const response = await POST(new Request("http://localhost/api/ai-note", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }) as never);
    expect(response.status).toBe(401);
  });
});
