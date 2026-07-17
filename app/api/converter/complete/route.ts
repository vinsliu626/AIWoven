import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getRouteSessionUser } from "@/lib/auth/routeSession";
import { addUsageEvent } from "@/lib/billing/usage";
import { trackFeatureUsage } from "@/lib/analytics/track";

const schema = z.object({
  from: z.string().trim().min(1).max(30),
  to: z.string().trim().min(1).max(30),
  fileSizeBytes: z.number().int().min(0).max(200 * 1024 * 1024),
});

export async function POST(request: NextRequest) {
  const user = await getRouteSessionUser(request);
  if (!user?.id) return NextResponse.json({ ok: false, error: "AUTH_REQUIRED" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID_REQUEST" }, { status: 400 });

  await addUsageEvent(user.id, "converter_count", 1);
  void trackFeatureUsage({ userId: user.id, featureKey: "converter", featureName: "File Converter", actionType: "CONVERTER_USED", pagePath: "/converter", metadata: { from_format: parsed.data.from, to_format: parsed.data.to, file_size_bytes: parsed.data.fileSizeBytes }, request });
  return NextResponse.json({ ok: true });
}
