import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

type TrackFeatureUsageInput = {
  userId?: string | null;
  anonymousVisitorId?: string | null;
  sessionId?: string | null;
  featureKey: string;
  featureName: string;
  pagePath?: string | null;
  actionType: string;
  metadata?: Record<string, unknown> | null;
  success?: boolean;
  errorMessage?: string | null;
  request?: Request;
};

const SAFE_METADATA_KEYS = new Set([
  "status",
  "feature_type",
  "model_used",
  "provider",
  "mode",
  "prompt_length",
  "input_chars",
  "input_words",
  "output_words",
  "token_count",
  "file_count",
  "file_size_bytes",
  "mime_type",
  "from_format",
  "to_format",
  "selected_modes",
  "quiz_count",
  "chunk_count",
  "duration_ms",
  "plan",
  "output_type",
]);

function startOfUtcDay(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function nextUtcDay(date: Date) {
  return new Date(date.getTime() + 24 * 60 * 60 * 1000);
}

function cleanString(value: string, maxLength = 180) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function safePrimitive(value: unknown): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") return cleanString(value, 120);
  if (Array.isArray(value)) {
    const values = value.slice(0, 12).map(safePrimitive).filter((item) => item !== undefined);
    return values as Prisma.InputJsonArray;
  }
  return undefined;
}

function sanitizeMetadata(metadata: Record<string, unknown> | null | undefined): Prisma.InputJsonObject | undefined {
  if (!metadata) return undefined;
  const out: Record<string, Prisma.InputJsonValue> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SAFE_METADATA_KEYS.has(key)) continue;
    const safe = safePrimitive(value);
    if (safe !== undefined) out[key] = safe;
  }
  return Object.keys(out).length > 0 ? (out as Prisma.InputJsonObject) : undefined;
}

function requestUserAgent(request?: Request) {
  return cleanString(request?.headers.get("user-agent") ?? "", 500) || null;
}

function safeErrorMessage(errorMessage: string | null | undefined) {
  if (!errorMessage) return null;
  return cleanString(errorMessage.replace(/[\r\n]+/g, " "), 300);
}

export async function trackFeatureUsage(input: TrackFeatureUsageInput) {
  const now = new Date();
  const statDate = startOfUtcDay(now);
  const nextDay = nextUtcDay(statDate);
  const featureKey = cleanString(input.featureKey.trim(), 80);
  const featureName = cleanString(input.featureName.trim(), 120);
  const actionType = cleanString(input.actionType.trim(), 80);
  const userId = input.userId?.trim() || null;
  const anonymousVisitorId = input.anonymousVisitorId?.trim().slice(0, 80) || null;
  const sessionId = input.sessionId?.trim().slice(0, 80) || null;
  const success = input.success ?? true;

  if (!featureKey || !featureName || !actionType) return;

  try {
    await prisma.$transaction(async (tx) => {
      const existingUserFeatureEvent =
        userId != null
          ? await tx.featureUsageEvent.findFirst({
              where: {
                userId,
                featureKey,
                createdAt: { gte: statDate, lt: nextDay },
              },
              select: { id: true },
            })
          : null;

      await tx.featureUsageEvent.create({
        data: {
          userId,
          anonymousVisitorId,
          sessionId,
          featureKey,
          featureName,
          pagePath: input.pagePath ? cleanString(input.pagePath, 180) : null,
          actionType,
          metadata: sanitizeMetadata(input.metadata),
          success,
          errorMessage: safeErrorMessage(input.errorMessage),
          userAgent: requestUserAgent(input.request),
          createdAt: now,
        },
      });

      if (userId) {
        await tx.dailyUserActivity.upsert({
          where: { userId_activityDate: { userId, activityDate: statDate } },
          create: {
            userId,
            activityDate: statDate,
            firstSeenAt: now,
            lastSeenAt: now,
            sessionCount: 1,
            featureCallCount: 1,
          },
          update: {
            lastSeenAt: now,
            featureCallCount: { increment: 1 },
          },
        });
      }

      await tx.featureDailyStat.upsert({
        where: { featureKey_statDate: { featureKey, statDate } },
        create: {
          featureKey,
          featureName,
          statDate,
          totalCalls: 1,
          uniqueUsers: userId ? 1 : 0,
          successCount: success ? 1 : 0,
          errorCount: success ? 0 : 1,
        },
        update: {
          featureName,
          totalCalls: { increment: 1 },
          uniqueUsers: userId && !existingUserFeatureEvent ? { increment: 1 } : undefined,
          successCount: success ? { increment: 1 } : undefined,
          errorCount: success ? undefined : { increment: 1 },
        },
      });
    });
  } catch (error) {
    console.warn("[analytics] trackFeatureUsage failed", {
      featureKey,
      actionType,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
