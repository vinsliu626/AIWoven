// app/api/ai-note/chunk/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Buffer } from "node:buffer";
import { devBypassUserId } from "@/lib/auth/devBypass";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApiErr =
  | "AUTH_REQUIRED"
  | "UNSUPPORTED_CONTENT_TYPE"
  | "MISSING_NOTE_ID"
  | "INVALID_NOTE_ID"
  | "MISSING_CHUNK_INDEX"
  | "INVALID_CHUNK_INDEX"
  | "MISSING_DATA"
  | "FORBIDDEN"
  | "CHUNK_TOO_LARGE"
  | "BAD_BODY"
  | "INTERNAL_ERROR";

function bad(traceId: string, code: ApiErr, status = 400, message?: string, extra?: Record<string, unknown>) {
  return NextResponse.json(
    { ok: false, error: code, message: message ?? "Unable to upload this audio part.", traceId, ...(extra ? { extra } : {}) },
    { status, headers: { "x-trace-id": traceId } }
  );
}

// 统一把各种 data 形态转成 Buffer（支持 base64 / Buffer JSON / arrayBuffer / uint8）
function bytesToBuffer(data: any, encoding?: string): Buffer {
  if (!data) throw new Error("data is empty");

  if (Buffer.isBuffer(data)) return data;

  // { type:"Buffer", data:[...] }
  if (data && typeof data === "object" && data.type === "Buffer" && Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }

  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));

  // string: base64 or utf8
  if (typeof data === "string") {
    const enc = String(encoding || "").toLowerCase();
    if (enc === "base64") return Buffer.from(data, "base64");

    // 兜底：先当 base64 试试，不行再 utf8
    try {
      const b = Buffer.from(data, "base64");
      // 很短且全是可见字符时，可能不是 base64；这里不强判，保持兼容
      return b;
    } catch {
      return Buffer.from(data, "utf8");
    }
  }

  // array of bytes
  if (Array.isArray(data)) return Buffer.from(data);

  throw new Error(`Unsupported data type: typeof=${typeof data}`);
}

function parseChunkIndex(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return { ok: false as const, value: 0, raw: s };
  const n = Number.parseInt(s, 10);
  if (!Number.isFinite(n) || n < 0) return { ok: false as const, value: 0, raw: s };
  return { ok: true as const, value: n, raw: s };
}

function isValidNoteId(noteId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(noteId);
}

function isOfflineMode() {
  const devFlag = String(process.env.AI_NOTE_DEV_OFFLINE_MODE || "").trim();
  const testFlag = String(process.env.AI_NOTE_TEST_MODE || "").trim();
  const dev = process.env.NODE_ENV !== "production" && devFlag === "true";
  return dev || testFlag === "true";
}

function offlineChunkDir(noteId: string) {
  return path.join(os.tmpdir(), "ai-note-offline", noteId, "chunks");
}

async function writeOfflineChunk(noteId: string, chunkIndex: number, dataBuf: Buffer) {
  const dir = offlineChunkDir(noteId);
  await fs.mkdir(dir, { recursive: true });
  const name = `chunk-${String(chunkIndex).padStart(3, "0")}.webm`;
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, dataBuf);
  const files = (await fs.readdir(dir)).filter((n) => n.startsWith("chunk-") && n.endsWith(".webm"));
  return files.length;
}

export async function POST(req: Request) {
  const traceId = req.headers.get("x-vercel-id") || randomUUID();
  try {
    const session = await getServerSession(authOptions);
    const userId = ((session as any)?.user?.id as string | undefined) ?? devBypassUserId();
    if (!userId) return bad(traceId, "AUTH_REQUIRED", 401, "Please sign in to use AI Notes.");

    const ct = (req.headers.get("content-type") || "").toLowerCase();

    let noteId = "";
    let chunkIndex: number | null = null;
    let mime = "audio/webm";
    let dataBuf: Buffer | null = null;

    // 1) JSON 模式（给 node 脚本用）
    if (ct.includes("application/json")) {
      let body: any;
      try {
        body = await req.json();
      } catch {
        return bad(traceId, "BAD_BODY", 400, "Invalid JSON body");
      }

      noteId = String(body?.noteId || "").trim();
      const idx = parseChunkIndex(body?.chunkIndex);
      if (idx.ok) chunkIndex = idx.value;

      mime = String(body?.mime || "audio/webm");
      const encoding = String(body?.encoding || "base64");

      try {
        dataBuf = bytesToBuffer(body?.data, encoding);
      } catch (e: any) {
        return bad(traceId, "MISSING_DATA", 400, "The audio part is missing or invalid.");
      }
    }

    // 2) multipart 模式（给浏览器 File 上传用）
    else if (ct.includes("multipart/form-data")) {
      const fd = await req.formData();
      noteId = String(fd.get("noteId") || "").trim();

      const idx = parseChunkIndex(fd.get("chunkIndex"));
      if (idx.ok) chunkIndex = idx.value;

      const file = fd.get("file");
      if (!(file instanceof File)) return bad(traceId, "MISSING_DATA", 400, "The audio part is missing.");

      mime = file.type || "audio/webm";
      const ab = await file.arrayBuffer();
      dataBuf = Buffer.from(ab);
    }

    // 其他类型不支持
    else {
      return bad(traceId, "UNSUPPORTED_CONTENT_TYPE", 415, "Unsupported upload format.");
    }

    if (!noteId) return bad(traceId, "MISSING_NOTE_ID", 400, "The upload session is missing.");
    if (!isValidNoteId(noteId)) return bad(traceId, "INVALID_NOTE_ID", 400, "The upload session is invalid.");
    if (chunkIndex === null) return bad(traceId, "MISSING_CHUNK_INDEX", 400, "The audio part number is missing.");
    if (chunkIndex < 0) return bad(traceId, "INVALID_CHUNK_INDEX", 400, "The audio part number is invalid.");
    if (!dataBuf) return bad(traceId, "MISSING_DATA", 400, "The audio part is missing.");

    const MAX_CHUNK_BYTES = Number.parseInt(process.env.AI_NOTE_MAX_CHUNK_BYTES || "", 10) || 3 * 1024 * 1024;
    if (dataBuf.length > MAX_CHUNK_BYTES) {
      return bad(traceId, "CHUNK_TOO_LARGE", 413, "This audio part is too large to upload safely.", {
        size: dataBuf.length,
        max: MAX_CHUNK_BYTES,
      });
    }

    // ✅ 检查 noteId 是否属于该用户；不存在则创建 session
    const existing = await prisma.aiNoteSession.findUnique({
      where: { id: noteId },
      select: { userId: true },
    });

    if (existing && existing.userId !== userId) {
      return bad(traceId, "FORBIDDEN", 403, "You cannot upload to this session.");
    }

    await prisma.aiNoteSession.upsert({
      where: { id: noteId },
      create: { id: noteId, userId } as any,
      update: { userId } as any,
    });

    let chunksNow = 0;
    if (isOfflineMode()) {
      chunksNow = await writeOfflineChunk(noteId, chunkIndex, dataBuf);
    } else {
      // ✅ 写 chunk
      await prisma.aiNoteChunk.upsert({
        where: { noteId_chunkIndex: { noteId, chunkIndex } },
        update: { mime, size: dataBuf.length, data: dataBuf } as any,
        create: { noteId, chunkIndex, mime, size: dataBuf.length, data: dataBuf } as any,
      });

      chunksNow = await prisma.aiNoteChunk.count({ where: { noteId } });
    }

    return NextResponse.json({
      ok: true,
      noteId,
      chunkIndex,
      bytes: dataBuf.length,
      mime,
      chunksNow,
      traceId,
    }, { headers: { "x-trace-id": traceId } });
  } catch (e: any) {
    console.error("[ai-note/chunk] error", { traceId, error: e });
    return bad(traceId, "INTERNAL_ERROR", 500, "Unable to upload this audio part. Please try again.");
  }
}
