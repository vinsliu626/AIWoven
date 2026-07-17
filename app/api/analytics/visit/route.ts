import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthenticatedUserIdentity } from "@/lib/auth/userIdentity";
import { trackFeatureUsage } from "@/lib/analytics/track";

const requestSchema = z.object({ path: z.string().trim().min(1).max(180).regex(/^\//) });
const BOT_PATTERN = /bot|crawler|spider|preview|headless|lighthouse|uptime|healthcheck/i;

export async function POST(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  if (!agent || BOT_PATTERN.test(agent)) return new NextResponse(null, { status: 204 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.path === "/favicon.ico") return new NextResponse(null, { status: 204 });

  const jar = await cookies();
  const visitorId = jar.get("nd_visitor")?.value || randomUUID();
  const sessionId = jar.get("nd_session")?.value || randomUUID();
  const userId = await getAuthenticatedUserIdentity(request);

  await trackFeatureUsage({
    userId,
    anonymousVisitorId: userId ? null : visitorId,
    sessionId,
    featureKey: "site",
    featureName: "Website",
    actionType: "SITE_VISIT",
    pagePath: parsed.data.path,
    request,
  });

  const response = new NextResponse(null, { status: 204 });
  const secure = process.env.NODE_ENV === "production";
  if (!jar.get("nd_visitor")) response.cookies.set("nd_visitor", visitorId, { httpOnly: true, sameSite: "lax", secure, maxAge: 31536000, path: "/" });
  if (!jar.get("nd_session")) response.cookies.set("nd_session", sessionId, { httpOnly: true, sameSite: "lax", secure, maxAge: 1800, path: "/" });
  return response;
}
