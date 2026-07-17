import { beforeEach, describe, expect, it, vi } from "vitest";
import { hashPromoCode } from "@/lib/promo/codeHash";

const mocks = vi.hoisted(() => {
  const getAuthenticatedUserIdentity = vi.fn();
  const tx = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    promoCode: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    promoRedemption: {
      count: vi.fn(),
      create: vi.fn(),
    },
    giftCode: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    giftCodeRedemption: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    userEntitlement: {
      upsert: vi.fn(),
      update: vi.fn(),
    },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (transaction: typeof tx) => Promise<unknown>) => fn(tx)),
  };
  const withPrismaRetry = vi.fn(async (fn: () => Promise<unknown>) => fn());
  return { getAuthenticatedUserIdentity, prisma, tx, withPrismaRetry };
});

vi.mock("@/lib/auth/userIdentity", () => ({
  getAuthenticatedUserIdentity: mocks.getAuthenticatedUserIdentity,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
  withPrismaRetry: mocks.withPrismaRetry,
}));

describe("POST /api/billing/redeem promo", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.PROMO_CODE_SECRET = "unit-test-secret-2026-very-long";
    mocks.getAuthenticatedUserIdentity.mockResolvedValue("user_a");
    mocks.tx.$executeRaw.mockResolvedValue(1);
    mocks.tx.$queryRaw.mockResolvedValue([
      { column_name: "promoPlan" },
      { column_name: "promoAccessStartAt" },
      { column_name: "promoAccessEndAt" },
      { column_name: "promoAccessActive" },
      { column_name: "developerBypass" },
    ]);
    mocks.tx.promoRedemption.count.mockResolvedValue(0);
    mocks.tx.promoRedemption.create.mockResolvedValue({ id: "redeem_1" });
    mocks.tx.promoCode.update.mockResolvedValue({});
    mocks.tx.giftCode.findUnique.mockResolvedValue(null);
    mocks.tx.giftCode.update.mockResolvedValue({});
    mocks.tx.giftCodeRedemption.findFirst.mockResolvedValue(null);
    mocks.tx.giftCodeRedemption.create.mockResolvedValue({ id: "gift_redeem_1" });
    mocks.tx.userEntitlement.upsert.mockResolvedValue({
      userId: "user_a",
      promoPlan: null,
      promoAccessStartAt: null,
      promoAccessEndAt: null,
    });
    mocks.tx.userEntitlement.update.mockResolvedValue({});
  });

  it("redeems a valid promo code", async () => {
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    mocks.tx.promoCode.findUnique.mockResolvedValue({
      id: "promo_1",
      codeType: "LIMITED",
      targetPlan: "PRO",
      startsAt: null,
      expiresAt: future,
      grantDurationDays: 7,
      grantFixedEndsAt: null,
      maxRedemptions: 10,
      redeemedCount: 1,
      perUserLimit: 1,
      isActive: true,
    });

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "promo-7day-2026" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(typeof json.requestId).toBe("string");
    expect(mocks.tx.promoCode.findUnique).toHaveBeenCalledWith({
      where: { codeHash: hashPromoCode("PROMO-7DAY-2026") },
    });
    expect(mocks.tx.promoRedemption.create).toHaveBeenCalled();
    expect(mocks.tx.userEntitlement.update).toHaveBeenCalled();
  });

  it("rejects expired promo code", async () => {
    const past = new Date(Date.now() - 10_000);
    mocks.tx.promoCode.findUnique.mockResolvedValue({
      id: "promo_2",
      codeType: "LIMITED",
      targetPlan: "PRO",
      startsAt: null,
      expiresAt: past,
      grantDurationDays: 7,
      grantFixedEndsAt: null,
      maxRedemptions: 10,
      redeemedCount: 0,
      perUserLimit: 1,
      isActive: true,
    });

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "promo-expired" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("CODE_EXPIRED");
    expect(typeof json.requestId).toBe("string");
    expect(mocks.tx.promoRedemption.create).not.toHaveBeenCalled();
  });

  it("returns invalid for unknown promo code", async () => {
    mocks.tx.promoCode.findUnique.mockResolvedValue(null);

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "promo-unknown" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("INVALID_CODE");
    expect(typeof json.requestId).toBe("string");
  });

  it("returns actionable error when PROMO_CODE_SECRET is missing", async () => {
    process.env.PROMO_CODE_SECRET = "";

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "promo-any" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("PROMO_CONFIG_MISSING_SECRET");
    expect(json.message).toBe("Redeem codes are temporarily unavailable right now. Please try again later.");
    expect(typeof json.requestId).toBe("string");
  });

  it("rejects placeholder promo secret config", async () => {
    process.env.PROMO_CODE_SECRET = "replace-with-long-random-secret";

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "promo-any" }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(503);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("PROMO_CONFIG_INVALID_SECRET");
    expect(json.message).toBe("Redeem codes are temporarily unavailable right now. Please try again later.");
    expect(typeof json.requestId).toBe("string");
  });

  it("still redeems a gift code when promo secret is missing", async () => {
    process.env.PROMO_CODE_SECRET = "";
    mocks.tx.giftCode.findUnique.mockResolvedValue({
      code: "NEWAPP",
      isActive: true,
      maxUses: 10,
      usedCount: 1,
    });

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: "newapp" }),
      headers: {
        "content-type": "application/json",
        "x-dev-now": "2026-03-01T12:00:00.000Z",
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.source).toBe("gift");
    expect(json.plan).toBe("pro");
    expect(mocks.tx.giftCodeRedemption.create).toHaveBeenCalled();
    expect(mocks.tx.userEntitlement.upsert).toHaveBeenCalled();
  });

  it("redeems a debug wheel code for the same normalized user identity", async () => {
    const { createDebugWheelPrizeCode } = await import("@/lib/billing/debugWheelCodeStore");
    const entry = createDebugWheelPrizeCode({
      durationDays: 7,
      userId: "student@example.com",
      now: Date.now(),
    });

    mocks.getAuthenticatedUserIdentity.mockResolvedValue("student@example.com");

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: entry.code.toLowerCase() }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.source).toBe("wheel_debug");
    expect(mocks.tx.userEntitlement.upsert).toHaveBeenCalled();
  });

  it("rejects a debug wheel code for a different user identity", async () => {
    const { createDebugWheelPrizeCode } = await import("@/lib/billing/debugWheelCodeStore");
    const entry = createDebugWheelPrizeCode({
      durationDays: 7,
      userId: "owner@example.com",
      now: Date.now(),
    });

    mocks.getAuthenticatedUserIdentity.mockResolvedValue("other@example.com");

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: entry.code }),
      headers: { "content-type": "application/json" },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("WHEEL_CODE_ACCOUNT_MISMATCH");
  });

  it("rejects a debug wheel code that was already redeemed", async () => {
    const { createDebugWheelPrizeCode } = await import("@/lib/billing/debugWheelCodeStore");
    const entry = createDebugWheelPrizeCode({
      durationDays: 14,
      userId: "student@example.com",
      now: Date.now(),
    });

    mocks.getAuthenticatedUserIdentity.mockResolvedValue("student@example.com");

    const { POST } = await import("@/app/api/billing/redeem/route");
    const makeRequest = () =>
      new Request("http://localhost/api/billing/redeem", {
        method: "POST",
        body: JSON.stringify({ code: entry.code }),
        headers: { "content-type": "application/json" },
      });

    const first = await POST(makeRequest());
    expect(first.status).toBe(200);

    const second = await POST(makeRequest());
    const json = await second.json();

    expect(second.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("WHEEL_CODE_USED");
  });

  it("rejects an expired debug wheel code", async () => {
    const now = Date.now();
    const { createDebugWheelPrizeCode } = await import("@/lib/billing/debugWheelCodeStore");
    const entry = createDebugWheelPrizeCode({
      durationDays: 3,
      userId: "student@example.com",
      now: now - 11 * 60 * 1000,
    });

    mocks.getAuthenticatedUserIdentity.mockResolvedValue("student@example.com");

    const { POST } = await import("@/app/api/billing/redeem/route");
    const req = new Request("http://localhost/api/billing/redeem", {
      method: "POST",
      body: JSON.stringify({ code: entry.code }),
      headers: {
        "content-type": "application/json",
        "x-dev-now": new Date(now).toISOString(),
      },
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.ok).toBe(false);
    expect(json.error).toBe("WHEEL_CODE_EXPIRED");
  });
});
