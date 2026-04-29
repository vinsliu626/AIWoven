// app/api/billing/redeem/route.ts
import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma, withPrismaRetry } from "@/lib/prisma";
import { hashPromoCode, normalizePromoCode } from "@/lib/promo/codeHash";
import { redeemPromoCodeTx } from "@/lib/promo/service";
import { planToFlags } from "@/lib/billing/planFlags";
import { mutationResultSelect } from "@/lib/billing/entitlementDb";
import { consumeDebugWheelPrizeCode, inspectDebugWheelPrizeCode, isProbableDebugWheelCode } from "@/lib/billing/debugWheelCodeStore";
import { resolveGiftCampaignPolicy } from "@/lib/billing/giftCampaigns";
import { getAuthenticatedUserIdentity } from "@/lib/auth/userIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeRequestId(req: Request): string {
  const headerId = req.headers.get("x-request-id")?.trim();
  if (headerId) return headerId.slice(0, 128);
  return randomUUID();
}

function isPromoTableMissingError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const table = String((error.meta as { table?: unknown } | undefined)?.table ?? "");
    if (table.includes("PromoCode") || table.includes("PromoRedemption")) return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("PromoCode") && message.includes("does not exist");
}

function resolveNow(req: Request): Date {
  if (process.env.NODE_ENV !== "production") {
    const devNow = req.headers.get("x-dev-now")?.trim();
    if (devNow) {
      const parsed = new Date(devNow);
      if (Number.isFinite(parsed.getTime())) return parsed;
    }
  }
  return new Date();
}

type PromoConfigErrorCode = "PROMO_CONFIG_MISSING_SECRET" | "PROMO_CONFIG_INVALID_SECRET";

function tryHashPromoCode(code: string): { ok: true; codeHash: string } | { ok: false; reason: PromoConfigErrorCode } {
  try {
    return { ok: true, codeHash: hashPromoCode(code) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "PROMO_CONFIG_MISSING_SECRET" || message === "PROMO_CONFIG_INVALID_SECRET") {
      return { ok: false, reason: message };
    }
    throw error;
  }
}

function promoConfigErrorResponse(code: PromoConfigErrorCode, requestId: string) {
  const message =
    code === "PROMO_CONFIG_MISSING_SECRET"
      ? "Redeem codes are temporarily unavailable right now. Please try again later."
      : "Redeem codes are temporarily unavailable right now. Please try again later.";
  return NextResponse.json({ ok: false, error: code, message, requestId }, { status: 503 });
}

async function supportsPromoEntitlementColumns(tx: Prisma.TransactionClient) {
  const rows = await tx.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'UserEntitlement'
      AND column_name IN ('promoPlan', 'promoAccessStartAt', 'promoAccessEndAt', 'promoAccessActive', 'developerBypass')
  `;
  const columns = new Set(rows.map((row) => row.column_name));
  return (
    columns.has("promoPlan") &&
    columns.has("promoAccessStartAt") &&
    columns.has("promoAccessEndAt") &&
    columns.has("promoAccessActive") &&
    columns.has("developerBypass")
  );
}

async function writeLegacyGiftEntitlement(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    plan: "pro" | "ultra";
    grantEndAt: Date;
    canSeeSuspiciousSentences: boolean;
    chatPerDay: number | null;
    detectorWordsPerWeek: number | null;
    noteSecondsPerWeek: number | null;
  }
) {
  const now = new Date();
  await tx.$executeRaw`
    INSERT INTO "UserEntitlement" (
      "id",
      "userId",
      "plan",
      "createdAt",
      "updatedAt",
      "stripeStatus",
      "stripeSubId",
      "currentPeriodEnd",
      "canSeeSuspiciousSentences",
      "chatPerDay",
      "detectorWordsPerWeek",
      "noteSecondsPerWeek",
      "unlimited",
      "cancelAtPeriodEnd",
      "usedChatCountToday",
      "usedDetectorWordsThisWeek",
      "usedNoteSecondsThisWeek"
    )
    VALUES (
      ${randomUUID()},
      ${input.userId},
      ${input.plan},
      ${now},
      ${now},
      ${"gift"},
      ${null},
      ${input.grantEndAt},
      ${input.canSeeSuspiciousSentences},
      ${input.chatPerDay},
      ${input.detectorWordsPerWeek},
      ${input.noteSecondsPerWeek},
      ${false},
      ${false},
      ${0},
      ${0},
      ${0}
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "plan" = EXCLUDED."plan",
      "updatedAt" = EXCLUDED."updatedAt",
      "stripeStatus" = EXCLUDED."stripeStatus",
      "stripeSubId" = EXCLUDED."stripeSubId",
      "currentPeriodEnd" = EXCLUDED."currentPeriodEnd",
      "canSeeSuspiciousSentences" = EXCLUDED."canSeeSuspiciousSentences",
      "chatPerDay" = EXCLUDED."chatPerDay",
      "detectorWordsPerWeek" = EXCLUDED."detectorWordsPerWeek",
      "noteSecondsPerWeek" = EXCLUDED."noteSecondsPerWeek",
      "unlimited" = EXCLUDED."unlimited",
      "cancelAtPeriodEnd" = EXCLUDED."cancelAtPeriodEnd"
  `;
}

async function redeemWithGiftTables(input: { userId: string; normalizedCode: string; requestId: string; now: Date }) {
  const { userId, normalizedCode, requestId, now } = input;
  const policy = resolveGiftCampaignPolicy(normalizedCode);

  const result = await withPrismaRetry(
    () =>
      prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gift:${normalizedCode}`}))`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`gift-user:${normalizedCode}:${userId}`}))`;

        const gift = await tx.giftCode.findUnique({ where: { code: normalizedCode } });
        if (!gift) return { ok: false as const, error: "INVALID_CODE" as const };
        if (!gift.isActive) return { ok: false as const, error: "INACTIVE_CODE" as const };
        if (policy.codeExpiresAt.getTime() <= now.getTime()) return { ok: false as const, error: "CODE_EXPIRED" as const };
        if (gift.maxUses !== null && gift.usedCount >= gift.maxUses) {
          return { ok: false as const, error: "CODE_EXHAUSTED" as const };
        }

        const redeemed = await tx.giftCodeRedemption.findFirst({
          where: { code: normalizedCode, userId },
          select: { id: true },
        });
        if (redeemed) return { ok: false as const, error: "PER_USER_LIMIT_REACHED" as const };

        await tx.giftCodeRedemption.create({
          data: { code: normalizedCode, userId },
        });
        await tx.giftCode.update({
          where: { code: normalizedCode },
          data: { usedCount: { increment: 1 } },
        });

        const proFlags = planToFlags(policy.plan);
        const grantEndAt = new Date(now.getTime() + policy.grantDurationDays * 24 * 60 * 60 * 1000);
        const entitlementSupportsPromoColumns = await supportsPromoEntitlementColumns(tx);
        if (entitlementSupportsPromoColumns) {
          await tx.userEntitlement.upsert({
            where: { userId },
            update: {
              ...proFlags,
              promoPlan: policy.plan,
              promoAccessStartAt: now,
              promoAccessEndAt: grantEndAt,
              promoAccessActive: true,
            },
            create: {
              userId,
              ...proFlags,
              promoPlan: policy.plan,
              promoAccessStartAt: now,
              promoAccessEndAt: grantEndAt,
              promoAccessActive: true,
            },
            select: mutationResultSelect,
          });
        } else {
          const legacyPlan = policy.plan;
          const legacyFlags = planToFlags(legacyPlan);
          await writeLegacyGiftEntitlement(tx, {
            userId,
            plan: legacyPlan,
            grantEndAt,
            canSeeSuspiciousSentences: legacyFlags.canSeeSuspiciousSentences,
            chatPerDay: legacyFlags.chatPerDay,
            detectorWordsPerWeek: legacyFlags.detectorWordsPerWeek,
            noteSecondsPerWeek: legacyFlags.noteSecondsPerWeek,
          });
        }

        return {
          ok: true as const,
          plan: policy.plan,
          grantEndAt,
          source: "gift" as const,
          requestId,
        };
      }),
    {
      maxRetries: 2,
      retryDelayMs: 180,
      operationName: "billing.redeem.gift-transaction",
    }
  );

  return result;
}

async function grantTemporaryProAccess(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    grantDurationDays: number;
    now: Date;
  }
) {
  const { userId, grantDurationDays, now } = input;
  const proFlags = planToFlags("pro");
  const grantEndAt = new Date(now.getTime() + grantDurationDays * 24 * 60 * 60 * 1000);
  const entitlementSupportsPromoColumns = await supportsPromoEntitlementColumns(tx);

  if (entitlementSupportsPromoColumns) {
    await tx.userEntitlement.upsert({
      where: { userId },
      update: {
        ...proFlags,
        promoPlan: "pro",
        promoAccessStartAt: now,
        promoAccessEndAt: grantEndAt,
        promoAccessActive: true,
      },
      create: {
        userId,
        ...proFlags,
        promoPlan: "pro",
        promoAccessStartAt: now,
        promoAccessEndAt: grantEndAt,
        promoAccessActive: true,
      },
      select: mutationResultSelect,
    });
  } else {
    await writeLegacyGiftEntitlement(tx, {
      userId,
      plan: "pro",
      grantEndAt,
      canSeeSuspiciousSentences: proFlags.canSeeSuspiciousSentences,
      chatPerDay: proFlags.chatPerDay,
      detectorWordsPerWeek: proFlags.detectorWordsPerWeek,
      noteSecondsPerWeek: proFlags.noteSecondsPerWeek,
    });
  }

  return grantEndAt;
}

async function redeemDebugWheelCode(input: { userId: string; normalizedCode: string; requestId: string; now: Date }) {
  const { userId, normalizedCode, requestId, now } = input;

  const inspected = inspectDebugWheelPrizeCode({
    code: normalizedCode,
    userId,
    now: now.getTime(),
  });

  if (inspected.kind === "expired") {
    return {
      ok: false as const,
      error: "WHEEL_CODE_EXPIRED" as const,
      message: "This prize code expired. Spin again to get a new one.",
      requestId,
    };
  }

  if (inspected.kind === "used") {
    return {
      ok: false as const,
      error: "WHEEL_CODE_USED" as const,
      message: "This prize code has already been redeemed.",
      requestId,
    };
  }

  if (inspected.kind === "wrong_user") {
    return {
      ok: false as const,
      error: "WHEEL_CODE_ACCOUNT_MISMATCH" as const,
      message: "This prize code belongs to a different account.",
      requestId,
    };
  }

  if (inspected.kind !== "active") {
    return {
      ok: false as const,
      error: "INVALID_CODE" as const,
      message: "Invalid code.",
      requestId,
    };
  }

  const consumed = consumeDebugWheelPrizeCode({
    code: normalizedCode,
    userId,
    now: now.getTime(),
  });

  if (!consumed.ok) {
    return {
      ok: false as const,
      error: consumed.status === "expired" ? ("WHEEL_CODE_EXPIRED" as const) : ("WHEEL_CODE_USED" as const),
      message:
        consumed.status === "expired"
          ? "This prize code expired. Spin again to get a new one."
          : "This prize code has already been redeemed.",
      requestId,
    };
  }

  const grantEndAt = await withPrismaRetry(
    () =>
      prisma.$transaction(async (tx) =>
        grantTemporaryProAccess(tx, {
          userId,
          grantDurationDays: consumed.durationDays,
          now,
        })
      ),
    {
      maxRetries: 2,
      retryDelayMs: 180,
      operationName: "billing.redeem.wheel-transaction",
    }
  );

  return {
    ok: true as const,
    plan: "pro",
    grantEndAt,
    source: "wheel_debug" as const,
    requestId,
  };
}

export async function POST(req: Request) {
  const requestId = makeRequestId(req);
  const now = resolveNow(req);
  const userId = await getAuthenticatedUserIdentity(req);
  if (!userId) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHENTICATED", message: "Please sign in to redeem prize codes.", requestId },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => null);
  const rawCode = String(body?.code || "");
  const normalizedCode = normalizePromoCode(rawCode);
  if (!normalizedCode) return NextResponse.json({ ok: false, error: "MISSING_CODE", requestId }, { status: 400 });

  try {
    if (isProbableDebugWheelCode(normalizedCode)) {
      const wheelResult = await redeemDebugWheelCode({
        userId,
        normalizedCode,
        requestId,
        now,
      });

      if (!wheelResult.ok) {
        return NextResponse.json(
          {
            ok: false,
            error: wheelResult.error,
            message: wheelResult.message,
            requestId,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        ok: true,
        plan: wheelResult.plan,
        grantEndAt: wheelResult.grantEndAt,
        source: wheelResult.source,
        requestId,
      });
    }

    let result:
      | { ok: false; error: "INVALID_CODE" | "INACTIVE_CODE" | "NOT_STARTED" | "CODE_EXPIRED" | "CODE_EXHAUSTED" | "PER_USER_LIMIT_REACHED" | "INVALID_GRANT_WINDOW" }
      | { ok: true; plan: string; grantEndAt: Date | null; source: string };
    const promoHash = tryHashPromoCode(normalizedCode);
    let attemptedGiftFallback = false;

    if (promoHash.ok) {
      try {
        result = await withPrismaRetry(
          () =>
            prisma.$transaction(async (tx) => {
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`promo:${promoHash.codeHash}`}))`;
              await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`promo-user:${promoHash.codeHash}:${userId}`}))`;

              const promo = await tx.promoCode.findUnique({ where: { codeHash: promoHash.codeHash } });
              if (!promo) return { ok: false as const, error: "INVALID_CODE" as const };

              return redeemPromoCodeTx(tx, userId, promo, now);
            }),
          {
            maxRetries: 2,
            retryDelayMs: 180,
            operationName: "billing.redeem.promo-transaction",
          }
        );
      } catch (error) {
        if (!isPromoTableMissingError(error)) throw error;
        console.warn("[billing.redeem] promo tables missing; falling back to GiftCode", { requestId, userId });
        attemptedGiftFallback = true;
        result = await redeemWithGiftTables({ userId, normalizedCode, requestId, now });
      }
    } else {
      attemptedGiftFallback = true;
      result = await redeemWithGiftTables({ userId, normalizedCode, requestId, now });
    }

    if (!attemptedGiftFallback && !result.ok && result.error === "INVALID_CODE") {
      const giftResult = await redeemWithGiftTables({ userId, normalizedCode, requestId, now });
      if (giftResult.ok || giftResult.error !== "INVALID_CODE") {
        result = giftResult;
      }
    }

    if (!promoHash.ok && !result.ok && result.error === "INVALID_CODE") {
      console.error("[billing.redeem] promo config missing while promo lookup unavailable", {
        requestId,
        userId,
        reason: promoHash.reason,
      });
      return promoConfigErrorResponse(promoHash.reason, requestId);
    }

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error, requestId }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      plan: result.plan,
      grantEndAt: result.grantEndAt,
      source: result.source,
      requestId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const reason =
      message === "PROMO_CONFIG_MISSING_SECRET" || message === "PROMO_CONFIG_INVALID_SECRET"
        ? message
        : "REDEEM_RUNTIME_ERROR";
    console.error("[billing.redeem] failed", { requestId, userId, reason });

    if (message === "PROMO_CONFIG_MISSING_SECRET") return promoConfigErrorResponse("PROMO_CONFIG_MISSING_SECRET", requestId);
    if (message === "PROMO_CONFIG_INVALID_SECRET") return promoConfigErrorResponse("PROMO_CONFIG_INVALID_SECRET", requestId);
    return NextResponse.json({ ok: false, error: "REDEEM_FAILED", requestId }, { status: 500 });
  }
}
