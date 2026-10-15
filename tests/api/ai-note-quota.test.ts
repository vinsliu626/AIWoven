import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  aggregate: vi.fn(),
  resolveEffectiveAccess: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { usageEvent: { aggregate: mocks.aggregate } } }));
vi.mock("@/lib/billing/access", () => ({ resolveEffectiveAccess: mocks.resolveEffectiveAccess }));
vi.mock("@/lib/billing/usage", () => ({ addUsageEvent: vi.fn() }));

describe("AI Note request limits", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    mocks.resolveEffectiveAccess.mockResolvedValue({ access: { plan: "basic", unlimited: false } });
  });

  it("applies the cooldown by default and lets a job skip it once its start has been checked", async () => {
    const { assertNoteRequestAllowed, markNoteAttempt } = await import("@/lib/aiNote/quota");
    markNoteAttempt("user_cooldown");

    await expect(assertNoteRequestAllowed("user_cooldown", 0)).rejects.toMatchObject({ code: "NOTE_COOLDOWN_ACTIVE" });
    await expect(assertNoteRequestAllowed("user_cooldown", 0, { checkCooldown: false })).resolves.toBeDefined();
  });

  it("still enforces the daily limit and transcript size when the cooldown is skipped", async () => {
    const { assertNoteRequestAllowed } = await import("@/lib/aiNote/quota");

    mocks.aggregate.mockResolvedValue({ _sum: { amount: 3 } }); // basic: 3 generations per day
    await expect(assertNoteRequestAllowed("user_daily", 0, { checkCooldown: false })).rejects.toMatchObject({ code: "NOTE_DAILY_LIMIT_REACHED" });

    mocks.aggregate.mockResolvedValue({ _sum: { amount: 0 } });
    await expect(assertNoteRequestAllowed("user_size", 12_001, { allowStaged: true, checkCooldown: false })).rejects.toMatchObject({ code: "NOTE_INPUT_TOO_LARGE" });
  });

  it("does not limit unlimited plans", async () => {
    mocks.resolveEffectiveAccess.mockResolvedValue({ access: { plan: "ultra", unlimited: true } });
    mocks.aggregate.mockResolvedValue({ _sum: { amount: 999 } });
    const { assertNoteRequestAllowed, markNoteAttempt } = await import("@/lib/aiNote/quota");
    markNoteAttempt("user_ultra");
    await expect(assertNoteRequestAllowed("user_ultra", 500_000, { allowStaged: true })).resolves.toBeDefined();
  });
});
