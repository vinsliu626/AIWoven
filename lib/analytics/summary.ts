import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const FEATURES = [
  ["note", "AI Note"],
  ["detect", "AI Detector"],
  ["study", "AI Study"],
  ["humanizer", "AI Humanizer"],
  ["converter", "File Converter"],
] as const;

function since(days: number) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - (days - 1));
  return date;
}

async function uniqueVisitors(where: Prisma.FeatureUsageEventWhereInput) {
  const [users, anonymous] = await Promise.all([
    prisma.featureUsageEvent.findMany({ where: { ...where, userId: { not: null } }, distinct: ["userId"], select: { userId: true } }),
    prisma.featureUsageEvent.findMany({ where: { ...where, userId: null, anonymousVisitorId: { not: null } }, distinct: ["anonymousVisitorId"], select: { anonymousVisitorId: true } }),
  ]);
  return users.length + anonymous.length;
}

export async function getOwnerAnalyticsSummary() {
  const today = since(1);
  const last7 = since(7);
  const last30 = since(30);
  const siteWhere = { actionType: "SITE_VISIT" } satisfies Prisma.FeatureUsageEventWhereInput;

  const [totalVisits, uniqueAll, todayVisitors, weekVisitors, monthVisitors, loggedInVisits, anonymousVisits] = await Promise.all([
    prisma.featureUsageEvent.count({ where: siteWhere }),
    uniqueVisitors(siteWhere),
    uniqueVisitors({ ...siteWhere, createdAt: { gte: today } }),
    uniqueVisitors({ ...siteWhere, createdAt: { gte: last7 } }),
    uniqueVisitors({ ...siteWhere, createdAt: { gte: last30 } }),
    prisma.featureUsageEvent.count({ where: { ...siteWhere, userId: { not: null } } }),
    prisma.featureUsageEvent.count({ where: { ...siteWhere, userId: null } }),
  ]);

  const features = await Promise.all(FEATURES.map(async ([key, name]) => {
    const where = { featureKey: key, success: true } satisfies Prisma.FeatureUsageEventWhereInput;
    const [total, todayCount, week, month, uniqueUsers, latest] = await Promise.all([
      prisma.featureUsageEvent.count({ where }),
      prisma.featureUsageEvent.count({ where: { ...where, createdAt: { gte: today } } }),
      prisma.featureUsageEvent.count({ where: { ...where, createdAt: { gte: last7 } } }),
      prisma.featureUsageEvent.count({ where: { ...where, createdAt: { gte: last30 } } }),
      uniqueVisitors(where),
      prisma.featureUsageEvent.findFirst({ where, orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    ]);
    return { key, name, total, today: todayCount, last7Days: week, last30Days: month, uniqueUsers, lastUsedAt: latest?.createdAt.toISOString() ?? null };
  }));

  const [visitTrend, featureTrend, recent] = await Promise.all([
    prisma.$queryRaw<Array<{ day: Date; count: bigint }>>(Prisma.sql`
      SELECT DATE("created_at") AS day, COUNT(*) AS count FROM "feature_usage_events"
      WHERE "action_type" = 'SITE_VISIT' AND "created_at" >= ${last30}
      GROUP BY DATE("created_at") ORDER BY day ASC`),
    prisma.$queryRaw<Array<{ day: Date; featureKey: string; count: bigint }>>(Prisma.sql`
      SELECT DATE("created_at") AS day, "feature_key" AS "featureKey", COUNT(*) AS count FROM "feature_usage_events"
      WHERE "created_at" >= ${last30} AND "feature_key" IN ('note','detect','study','humanizer','converter') AND "success" = true
      GROUP BY DATE("created_at"), "feature_key" ORDER BY day ASC`),
    prisma.featureUsageEvent.findMany({ where: { actionType: { not: "SITE_VISIT" } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, featureName: true, actionType: true, pagePath: true, userId: true, createdAt: true, success: true } }),
  ]);

  return {
    visits: { total: totalVisits, unique: uniqueAll, today: todayVisitors, last7Days: weekVisitors, last30Days: monthVisitors, loggedIn: loggedInVisits, anonymous: anonymousVisits },
    features,
    visitTrend: visitTrend.map((row) => ({ date: row.day.toISOString().slice(0, 10), count: Number(row.count) })),
    featureTrend: featureTrend.map((row) => ({ date: row.day.toISOString().slice(0, 10), featureKey: row.featureKey, count: Number(row.count) })),
    recent: recent.map((row) => ({ ...row, userId: row.userId ? "signed-in" : "anonymous", createdAt: row.createdAt.toISOString() })),
  };
}
