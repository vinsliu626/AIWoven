import { NextResponse, type NextRequest } from "next/server";
import { requireAnalyticsAdmin } from "@/lib/analytics/admin";
import { getOwnerAnalyticsSummary } from "@/lib/analytics/summary";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const authorization = await requireAnalyticsAdmin(request);
  if (!authorization.ok) return NextResponse.json({ ok: false, error: authorization.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN" }, { status: authorization.status });
  return NextResponse.json({ ok: true, data: await getOwnerAnalyticsSummary() });
}
