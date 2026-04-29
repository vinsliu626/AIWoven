// lib/auth/devUser.ts
import { getAuthenticatedUserIdentity } from "@/lib/auth/userIdentity";

export async function getUserIdOrDev(req?: Request) {
  return getAuthenticatedUserIdentity(req);
}
