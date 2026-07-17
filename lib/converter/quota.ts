import { QuotaError } from "@/lib/billing/guard";
import { prisma } from "@/lib/prisma";
import { resolveEffectiveAccess } from "@/lib/billing/access";
import { getConverterPlanLimits } from "@/lib/plans/productLimits";

function startOfTodayUTC() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export async function getConverterUsageStatus(userId: string) {
  const { access } = await resolveEffectiveAccess(userId);
  const limits = getConverterPlanLimits(access.plan);
  const agg = await prisma.usageEvent.aggregate({
    where: { userId, type: "converter_count", createdAt: { gte: startOfTodayUTC() } },
    _sum: { amount: true },
  });

  const usedToday = agg._sum.amount ?? 0;

  return {
    plan: access.plan,
    source: access.source,
    limits,
    usedToday,
    remainingToday: Math.max(0, limits.conversionsPerDay - usedToday),
    unlimited: access.unlimited,
  };
}

export async function assertConverterQuotaOrThrow(userId: string) {
  const status = await getConverterUsageStatus(userId);
  if (status.unlimited) return status;
  if (status.usedToday >= status.limits.conversionsPerDay) {
    throw new QuotaError(
      "CONVERTER_QUOTA_EXCEEDED",
      "You've used all Converter runs for today. Upgrade your plan or try again tomorrow.",
      429
    );
  }
  return status;
}
