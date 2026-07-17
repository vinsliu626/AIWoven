import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isOwnerIdentity, hasOwnerConfiguration } from "@/lib/auth/owner";

type AdminUser = {
  id: string;
  email: string | null;
};

function normalize(value: string | null | undefined) {
  const next = value?.trim().toLowerCase() ?? "";
  return next.length > 0 ? next : null;
}

function parseAllowlist(value: string | undefined) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => normalize(item))
      .filter((item): item is string => Boolean(item))
  );
}

export function getAdminAllowlistStatus() {
  const emails = parseAllowlist(process.env.OWNER_EMAIL);
  const userIds = parseAllowlist(process.env.OWNER_USER_ID);

  return {
    configured: emails.size > 0 || userIds.size > 0,
    emails,
    userIds,
  };
}

export async function isAnalyticsAdmin(user: AdminUser | null) {
  if (!user) return false;
  if (isOwnerIdentity(user)) return true;
  const entitlement = await prisma.userEntitlement.findUnique({ where: { userId: user.id }, select: { role: true } });
  return entitlement?.role === "OWNER";
}

export async function getAnalyticsAdminUser(req?: NextRequest): Promise<AdminUser | null> {
  const session = await getServerSession(authOptions);
  const sessionUser = (session as { user?: { id?: unknown; email?: unknown } } | null)?.user;
  const sessionId = typeof sessionUser?.id === "string" ? sessionUser.id : null;
  const sessionEmail = typeof sessionUser?.email === "string" ? sessionUser.email : null;
  if (sessionId || sessionEmail) {
    return {
      id: sessionId || sessionEmail || "",
      email: sessionEmail,
    };
  }

  if (!req) return null;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  if (!token) return null;

  const tokenEmail = typeof token.email === "string" ? token.email : null;
  const tokenSub = typeof token.sub === "string" ? token.sub : null;

  if (!tokenSub && !tokenEmail) return null;
  return {
    id: tokenSub || tokenEmail || "",
    email: tokenEmail,
  };
}

export async function requireAnalyticsAdmin(req?: NextRequest) {
  const user = await getAnalyticsAdminUser(req);
  if (!user) return { ok: false as const, status: 401 as const, user: null };
  if (!(await isAnalyticsAdmin(user))) return { ok: false as const, status: 403 as const, user };
  return { ok: true as const, status: 200 as const, user };
}

export { hasOwnerConfiguration };
