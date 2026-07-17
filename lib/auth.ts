import { timingSafeEqual } from "node:crypto";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";
import { isOwnerIdentity } from "@/lib/auth/owner";

function hasEnv(name: string) {
  return (process.env[name] ?? "").trim().length > 0;
}

const providers: NextAuthOptions["providers"] = [];

function secureEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

if (process.env.NODE_ENV !== "production" && process.env.E2E_AUTH_ENABLED === "true") {
  providers.push(
    CredentialsProvider({
      id: "e2e-credentials",
      name: "Local test account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";
        const accounts = [
          { email: process.env.E2E_USER_EMAIL?.trim().toLowerCase() ?? "", password: process.env.E2E_USER_PASSWORD ?? "", name: "E2E User" },
          { email: process.env.E2E_OWNER_EMAIL?.trim().toLowerCase() ?? "", password: process.env.E2E_OWNER_PASSWORD ?? "", name: "E2E Owner" },
        ];
        const account = accounts.find((candidate) => candidate.email && candidate.password && secureEqual(email, candidate.email) && secureEqual(password, candidate.password));
        return account ? { id: account.email, email: account.email, name: account.name } : null;
      },
    })
  );
}

if (hasEnv("GITHUB_CLIENT_ID") || hasEnv("GITHUB_ID")) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET || "",
    })
  );
}

if (hasEnv("GOOGLE_CLIENT_ID") && hasEnv("GOOGLE_CLIENT_SECRET")) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token }) {
      const id = (token.sub as string | undefined) || (token.email as string | undefined) || "";
      if (!id) return token;
      try {
        const existing = await prisma.userEntitlement.findUnique({ where: { userId: id }, select: { role: true } });
        const owner = isOwnerIdentity({ id, email: token.email, role: existing?.role });
        if (owner && existing?.role !== "OWNER") {
          await prisma.userEntitlement.upsert({ where: { userId: id }, create: { userId: id, role: "OWNER" }, update: { role: "OWNER" } });
        }
        token.role = owner ? "OWNER" : existing?.role ?? "USER";
      } catch {
        token.role = isOwnerIdentity({ id, email: token.email }) ? "OWNER" : "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token?.sub as string) || session.user.email || "";
        session.user.role = token.role === "OWNER" ? "OWNER" : "USER";
      }
      return session;
    },
  },
};
