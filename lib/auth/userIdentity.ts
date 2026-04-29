import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type SessionUser = {
  id?: string | null;
  email?: string | null;
};

type SessionShape = {
  user?: SessionUser | null;
} | null;

function normalizeIdentityPart(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function resolveDevIdentity(req?: Request) {
  if (process.env.DEV_BYPASS_AUTH !== "true") return null;

  const headerUserId = normalizeIdentityPart(req?.headers.get("x-dev-user-id"));
  if (headerUserId) return headerUserId;

  const envUser = normalizeIdentityPart(process.env.DEV_USER_EMAIL);
  if (envUser) return envUser;

  return "dev_user";
}

export function normalizeUserIdentity(value: string | null | undefined) {
  return normalizeIdentityPart(value);
}

export async function getAuthenticatedUserIdentity(req?: Request) {
  const session = (await getServerSession(authOptions)) as SessionShape;
  const sessionId = normalizeIdentityPart(session?.user?.id);
  if (sessionId) return sessionId;

  const sessionEmail = normalizeIdentityPart(session?.user?.email);
  if (sessionEmail) return sessionEmail;

  return resolveDevIdentity(req);
}
