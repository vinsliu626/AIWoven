// app/api/ai-note/start/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { devBypassUserId } from "@/lib/auth/devBypass";
import { getRouteSessionUser } from "@/lib/auth/routeSession";
import type { NextRequest } from "next/server";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApiErr = "AUTH_REQUIRED" | "INVALID_UPLOAD" | "NOTE_NOT_FOUND" | "FORBIDDEN" | "INTERNAL_ERROR";

function bad(traceId: string, code: ApiErr, status = 400, message?: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: code, message: message ?? "Unable to start the upload.", traceId, ...(extra ? { extra } : {}) },
    { status, headers: { "x-trace-id": traceId } }
  );
}

export async function POST(req: NextRequest) {
  const traceId = req.headers.get("x-vercel-id") || randomUUID();
  try {
    const sessionUser = await getRouteSessionUser(req);
    const userId = sessionUser?.id ?? devBypassUserId();

    if (!userId) {
      if (process.env.NODE_ENV !== "production" || process.env.AI_NOTE_DEBUG_AUTH === "true") {
        let hasCookieHeader = false;
        try {
          const { headers } = await import("next/headers");
          const reqHeaders = await headers();
          hasCookieHeader = !!reqHeaders.get("cookie");
        } catch {
          hasCookieHeader = false;
        }
        console.log("[ai-note/start][auth-check]", {
          hasCookieHeader,
          hasUserId: !!sessionUser?.id,
          hasEmail: !!sessionUser?.email,
        });
      }
      return bad(traceId, "AUTH_REQUIRED", 401, "Please sign in to use AI Notes.");
    }

    const body = await req.json().catch(() => ({}));
    const sourceType = body?.sourceType === "upload" ? "upload" : "record";
    if (sourceType === "upload") {
      const size = Number(body?.size);
      const totalChunks = Number(body?.totalChunks);
      const sha256 = String(body?.sha256 || "").trim().toLowerCase();
      const maxBytes = Number.parseInt(process.env.AI_NOTE_MAX_UPLOAD_BYTES || "", 10) || 100 * 1024 * 1024;
      if (!Number.isSafeInteger(size) || size <= 0 || size > maxBytes || !Number.isSafeInteger(totalChunks) || totalChunks <= 0 || !/^[a-f0-9]{64}$/.test(sha256)) {
        return bad(traceId, "INVALID_UPLOAD", 400, `Choose an audio file smaller than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
      }
    }

    const noteId = randomUUID();

    // ✅ 这里不要调用你不确定的 createNote，直接写 session，最稳定
    await prisma.aiNoteSession.create({
      data: { id: noteId, userId } as any,
    });

    return NextResponse.json(
      { ok: true, noteId, traceId },
      { headers: { "x-trace-id": traceId } }
    );
  } catch (e: any) {
    console.error("[ai-note/start] error", { traceId, error: e });
    return bad(traceId, "INTERNAL_ERROR", 500, "Unable to start the upload. Please try again.");
  }
}

export async function DELETE(req: NextRequest) {
  const traceId = req.headers.get("x-vercel-id") || randomUUID();
  try {
    const sessionUser = await getRouteSessionUser(req);
    const userId = sessionUser?.id ?? devBypassUserId();
    if (!userId) return bad(traceId, "AUTH_REQUIRED", 401, "Please sign in to use AI Notes.");

    const body = await req.json().catch(() => null);
    const noteId = String(body?.noteId || "").trim();
    const existing = noteId ? await prisma.aiNoteSession.findUnique({ where: { id: noteId }, select: { userId: true } }) : null;
    if (!existing) return bad(traceId, "NOTE_NOT_FOUND", 404, "This upload session no longer exists.");
    if (existing.userId !== userId) return bad(traceId, "FORBIDDEN", 403, "You cannot cancel this upload session.");

    await prisma.aiNoteSession.delete({ where: { id: noteId } });
    await fs.rm(path.join(os.tmpdir(), "ai-note", noteId), { recursive: true, force: true }).catch(() => {});
    return NextResponse.json({ ok: true, traceId }, { headers: { "x-trace-id": traceId } });
  } catch (e) {
    console.error("[ai-note/start] delete error", { traceId, error: e });
    return bad(traceId, "INTERNAL_ERROR", 500, "Unable to cancel the upload. Please try again.");
  }
}
