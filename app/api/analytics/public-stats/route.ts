import { NextResponse } from "next/server";

import { getPublicImpactStats } from "@/lib/analytics/publicStats";

export async function GET() {
  const stats = await getPublicImpactStats();
  return NextResponse.json(stats, {
    headers: {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
    },
  });
}
