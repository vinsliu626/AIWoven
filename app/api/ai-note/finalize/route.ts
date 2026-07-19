// app/api/ai-note/finalize/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { devBypassUserId } from "@/lib/auth/devBypass";

import fssync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { Buffer } from "node:buffer";
import { createHash, randomUUID } from "node:crypto";

import { transcribeAudioToText } from "@/lib/asr/transcribe";
import { callGroqTranscribe } from "@/lib/ai/groq";
import { AiNoteGenerationError, runAiNotePipeline } from "@/lib/aiNote/pipeline";
import { AI_NOTE_ASR_SKIPPED_PREFIX, buildProgressiveNote, isSkippedTranscript, nextUnprocessedIndex } from "@/lib/aiNote/finalizeHelpers";
import { deriveRecordedSeconds, parseRecordedDurationMs } from "@/lib/aiNote/recordingUsage";
import { assertNoteRequestAllowed, markNoteAttempt, NoteLimitError, recordNoteGenerateSuccess } from "@/lib/aiNote/quota";
import { parseEnvInt } from "@/lib/env/number";

import { assertQuotaOrThrow, QuotaError } from "@/lib/billing/guard";
import { addUsageEvent } from "@/lib/billing/usage";
import { trackFeatureUsage } from "@/lib/analytics/track";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 单次最多 5 分钟，靠 stepper 多次推进

type ApiErr =
  | "AUTH_REQUIRED"
  | "MISSING_NOTE_ID"
  | "NOTE_NOT_FOUND"
  | "FORBIDDEN"
  | "NO_CHUNKS"
  | "FFMPEG_FAILED"
  | "ASR_FAILED"
  | "LLM_FAILED"
  | "INTERNAL_ERROR"
  | "INCOMPLETE_UPLOAD"
  | "UPLOAD_INTEGRITY_FAILED"
  | "AUDIO_VALIDATION_FAILED"
  | "AUDIO_DECODE_FAILED"
  | "TRANSCRIPTION_AUTH_FAILED"
  | "TRANSCRIPTION_RATE_LIMITED"
  | "TRANSCRIPTION_PROVIDER_FAILED"
  | "TRANSCRIPTION_TIMEOUT"
  | "EMPTY_TRANSCRIPT"
  | "NOTE_GENERATION_AUTH_FAILED"
  | "NOTE_GENERATION_RATE_LIMITED"
  | "NOTE_GENERATION_FAILED"
  | "NOTE_GENERATION_TIMEOUT"
  | "PERSISTENCE_FAILED"
  | "LOCKED";

class AiNoteTranscriptionError extends Error {
  constructor(
    public readonly code:
      | "TRANSCRIPTION_AUTH_FAILED"
      | "TRANSCRIPTION_RATE_LIMITED"
      | "TRANSCRIPTION_PROVIDER_FAILED"
      | "TRANSCRIPTION_TIMEOUT",
    message: string,
    public readonly retryable: boolean,
    public readonly providerStatus?: number
  ) {
    super(message);
    this.name = "AiNoteTranscriptionError";
  }
}

function bad(code: ApiErr, status = 400, message?: string, extra?: Record<string, unknown>, traceId: string = randomUUID()) {
  return NextResponse.json(
    { ok: false, error: code, message: message ?? "Unable to generate notes right now.", traceId, ...(extra || {}) },
    { status, headers: { "x-trace-id": traceId } }
  );
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`TIMEOUT:${label}:${ms}ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e))
    );
  });
}

function firstExisting(paths: string[]) {
  for (const p of paths) {
    try {
      if (p && fssync.existsSync(p)) return p;
    } catch {}
  }
  return "";
}

async function ensureExecutable(binPath: string) {
  if (!binPath) return;
  if (process.platform === "win32") return;
  try {
    await fs.chmod(binPath, 0o755);
  } catch {}
}

function getFfmpegBin() {
  const envPath = (process.env.FFMPEG_PATH || "").trim();
  if (envPath && fssync.existsSync(envPath)) return envPath;

  const cwd = process.cwd();
  const isWin = process.platform === "win32";
  const exe = isWin ? "ffmpeg.exe" : "ffmpeg";

  const candidates = [
    path.join(cwd, "node_modules", "ffmpeg-static", exe),
    path.join(cwd, "node_modules", "ffmpeg-static", "bin", exe),
    path.join(cwd, ".next", "standalone", "node_modules", "ffmpeg-static", exe),
    path.join(cwd, ".next", "standalone", "node_modules", "ffmpeg-static", "bin", exe),
    path.join("/var/task", "node_modules", "ffmpeg-static", exe),
    path.join("/var/task", "node_modules", "ffmpeg-static", "bin", exe),
    path.join("/var/task", ".next", "standalone", "node_modules", "ffmpeg-static", exe),
    path.join("/var/task", ".next", "standalone", "node_modules", "ffmpeg-static", "bin", exe),
  ];

  const found = firstExisting(candidates);
  if (!found) throw new Error(`FFMPEG not found. Tried:\n${candidates.join("\n")}`);
  return found;
}

function run(cmd: string, args: string[], cwd?: string) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], cwd });
    let out = "";
    let err = "";
    p.on("error", (e) => reject(new Error(`spawn ffmpeg failed: ${e.message}`)));
    p.stdout.on("data", (d) => (out += d.toString()));
    p.stderr.on("data", (d) => (err += d.toString()));
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout: out, stderr: err });
      else reject(new Error(`ffmpeg failed (${code}): ${(err || out).slice(0, 9000)}`));
    });
  });
}

function extensionForMime(mime: string) {
  const value = mime.toLowerCase();
  if (value.includes("mpeg") || value.includes("mp3")) return "mp3";
  if (value.includes("mp4") || value.includes("m4a")) return "m4a";
  if (value.includes("ogg")) return "ogg";
  if (value.includes("wav")) return "wav";
  if (value.includes("flac")) return "flac";
  if (value.includes("aac")) return "aac";
  return "webm";
}

async function cleanupWorkDir(noteId: string) {
  if (!noteId) return;
  await fs.rm(path.join(os.tmpdir(), "ai-note", noteId), { recursive: true, force: true }).catch(() => {});
}

function isOfflineMode() {
  const devFlag = String(process.env.AI_NOTE_DEV_OFFLINE_MODE || "").trim();
  const testFlag = String(process.env.AI_NOTE_TEST_MODE || "").trim();
  const dev = process.env.NODE_ENV !== "production" && devFlag === "true";
  return dev || testFlag === "true";
}

async function getOfflineChunkFiles(noteId: string) {
  const dir = path.join(os.tmpdir(), "ai-note-offline", noteId, "chunks");
  let names: string[] = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const items = names
    .filter((n) => n.startsWith("chunk-") && n.endsWith(".webm"))
    .map((n) => {
      const m = n.match(/chunk-(\d+)\.webm$/);
      if (!m) return null;
      return { index: Number.parseInt(m[1], 10), name: n, path: path.join(dir, n) };
    })
    .filter(Boolean) as { index: number; name: string; path: string }[];
  items.sort((a, b) => a.index - b.index);
  return items;
}

function isRetryableStatus(code?: number) {
  return code === 429 || code === 502 || code === 503 || code === 504;
}

function isRetryableAsrMessage(msg: string) {
  const lower = msg.toLowerCase();
  return (
    lower.includes("fetch failed") ||
    lower.includes("econnreset") ||
    lower.includes("etimedout") ||
    lower.includes("econnaborted") ||
    lower.includes("socket hang up") ||
    lower.includes("timeout") ||
    lower.includes("temporarily unavailable") ||
    lower.includes("network error")
  );
}

function parseHttpStatus(msg: string): number | null {
  const m = msg.match(/HTTP error:\s*(\d{3})\b/i);
  if (m) return Number.parseInt(m[1], 10);
  const m2 = msg.match(/\b(\d{3})\b/);
  if (m2) return Number.parseInt(m2[1], 10);
  return null;
}

function mapTranscriptionProviderError(error: unknown) {
  if (error instanceof AiNoteTranscriptionError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const explicitStatus = Number((error as { httpStatus?: unknown } | null)?.httpStatus);
  const status = Number.isInteger(explicitStatus) ? explicitStatus : parseHttpStatus(message) ?? undefined;
  if (status === 401 || status === 403) {
    return new AiNoteTranscriptionError("TRANSCRIPTION_AUTH_FAILED", message, false, status);
  }
  if (status === 429) {
    return new AiNoteTranscriptionError("TRANSCRIPTION_RATE_LIMITED", message, true, status);
  }
  if (status === 408 || status === 504 || /timeout|abort/i.test(message)) {
    return new AiNoteTranscriptionError("TRANSCRIPTION_TIMEOUT", message, true, status);
  }
  return new AiNoteTranscriptionError(
    "TRANSCRIPTION_PROVIDER_FAILED",
    message,
    !status || status >= 500,
    status
  );
}

async function withRetry<T>(fn: () => Promise<T>, label: string, maxTry = 4) {
  let lastErr: any = null;
  for (let attempt = 1; attempt <= maxTry; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      const status = parseHttpStatus(msg);
      const retryable = isRetryableStatus(status ?? undefined) || isRetryableAsrMessage(msg) || String(e?.code || "").toUpperCase().includes("TIMEOUT");
      if (!retryable || attempt === maxTry) break;
      const backoff = Math.min(30000, 500 * Math.pow(2, attempt - 1) + Math.round(Math.random() * 250));
      console.warn(`[ai-note/finalize] retry ${label} attempt=${attempt} backoff=${backoff}ms status=${status ?? "unknown"}`);
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr;
}

async function transcribeWithFallback(
  buf: Buffer,
  fname: string,
  asrTimeoutMs: number,
  asrMaxTry: number
): Promise<string> {
  if (isOfflineMode()) {
    return `[offline transcript] ${fname}`;
  }

  // 1) External ASR (ASR_URL)
  try {
    return await withRetry(
      async () =>
        await withTimeout(
          transcribeAudioToText(new Blob([new Uint8Array(buf)], { type: "audio/wav" }) as any, {
            filename: fname,
            mime: "audio/wav",
          } as any),
          asrTimeoutMs,
          `asr_external_${fname}`
        ),
      `asr_external_${fname}`,
      asrMaxTry
    );
  } catch (e) {
    // 2) Groq fallback
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw e;
    const out = await withRetry(
      async () =>
        await withTimeout(
          callGroqTranscribe({
            apiKey: groqKey,
            audio: buf,
            mime: "audio/wav",
            filename: fname,
            model: process.env.AI_NOTE_ASR_MODEL || "whisper-large-v3",
          }),
          asrTimeoutMs,
          `asr_groq_${fname}`
        ),
      `asr_groq_${fname}`,
      asrMaxTry
    );
    return String(out?.text || "").trim();
  }
}

async function readBodyNoteId(req: Request) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {}
  const noteId = String(body?.noteId || "").trim();
  return { noteId, body };
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
function estimateSecondsByTranscript(transcript: string) {
  const w = countWords(transcript);
  return Math.max(1, Math.round(w / 2.5));
}

function firstMissingContiguousIndex(indexes: number[]) {
  const sorted = Array.from(new Set(indexes)).sort((a, b) => a - b);
  let expected = 0;
  for (const index of sorted) {
    if (index !== expected) break;
    expected += 1;
  }
  return expected;
}

// ✅ 安全分块：避免死循环
function chunkText(text: string, maxChars = 12000, overlap = 800) {
  const chunks: string[] = [];
  let i = 0;
  const safeOverlap = Math.max(0, Math.min(overlap, maxChars - 1));
  const n = text.length;

  while (i < n) {
    const end = Math.min(n, i + maxChars);
    chunks.push(text.slice(i, end));
    if (end >= n) break;

    const next = Math.max(0, end - safeOverlap);
    if (next <= i) i = end;
    else i = next;
  }

  return chunks;
}

function bytesToBuffer(data: any): Buffer {
  if (!data) throw new Error("chunk.data is empty");
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (data instanceof ArrayBuffer) return Buffer.from(new Uint8Array(data));
  if (Array.isArray(data)) return Buffer.from(data);
  if (data && typeof data === "object" && data.type === "Buffer" && Array.isArray(data.data)) {
    return Buffer.from(data.data);
  }
  if (typeof data === "string") {
    try {
      return Buffer.from(data, "base64");
    } catch {
      return Buffer.from(data, "utf8");
    }
  }
  throw new Error(`Unsupported bytes type: typeof=${typeof data} ctor=${data?.constructor?.name}`);
}

/** -----------------------------
 *  ✅ 并发锁（Lease Lock）
 *  - 防止同一个 noteId 同时被多个 finalize 请求处理
 *  - 用 updateMany 原子抢锁：锁为空或过期才允许抢
 * ----------------------------- */
function makeLockId() {
  return `${process.pid}-${Math.random().toString(16).slice(2)}-${Date.now()}`;
}

async function acquireJobLock(noteId: string) {
  const now = new Date();
  const ttlMs = Math.max(10_000, parseEnvInt("AI_NOTE_LOCK_TTL_MS", 60_000));
  const expires = new Date(now.getTime() + ttlMs);
  const lockId = makeLockId();

  const r = await prisma.aiNoteJob.updateMany({
    where: {
      noteId,
      OR: [{ lockExpiresAt: null }, { lockExpiresAt: { lt: now } }],
    },
    data: {
      lockedAt: now,
      lockExpiresAt: expires,
      lockedBy: lockId,
    },
  });

  return { ok: r.count === 1, lockId, expires, ttlMs };
}

async function refreshJobLock(noteId: string, lockId: string) {
  const now = new Date();
  const ttlMs = Math.max(10_000, parseEnvInt("AI_NOTE_LOCK_TTL_MS", 60_000));
  const expires = new Date(now.getTime() + ttlMs);

  await prisma.aiNoteJob.updateMany({
    where: { noteId, lockedBy: lockId },
    data: { lockExpiresAt: expires },
  });
}

async function releaseJobLock(noteId: string, lockId: string) {
  await prisma.aiNoteJob.updateMany({
    where: { noteId, lockedBy: lockId },
    data: { lockedAt: null, lockExpiresAt: null, lockedBy: null },
  });
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const { noteId, body } = await readBodyNoteId(req);
  const traceId = req.headers.get("x-vercel-id") || randomUUID();
  const sourceType = body?.inputType === "upload" ? "upload" : "record";
  const expectedChunks = Number(body?.expectedChunks);
  const expectedBytes = Number(body?.expectedBytes);
  const expectedSha256 = String(body?.expectedSha256 || "").trim().toLowerCase();

  try {
    const session = await getServerSession(authOptions);
    const userId = ((session as any)?.user?.id as string | undefined) ?? devBypassUserId();
    if (!userId) return bad("AUTH_REQUIRED", 401, "Please sign in to use AI Notes.", undefined, traceId);

    if (!noteId) return bad("MISSING_NOTE_ID", 400, "The upload session is missing.", undefined, traceId);

    // ownership check
    const sess = await prisma.aiNoteSession.findUnique({
      where: { id: noteId },
      select: { userId: true, createdAt: true },
    });
    if (!sess) return bad("NOTE_NOT_FOUND", 404, "This upload session no longer exists.", undefined, traceId);
    if (sess.userId !== userId) return bad("FORBIDDEN", 403, "You cannot access this upload session.", undefined, traceId);
    const reportedDurationMs = parseRecordedDurationMs(body?.totalDurationMs);
    const recordedSeconds = deriveRecordedSeconds({
      totalDurationMs: reportedDurationMs ?? undefined,
      sessionCreatedAt: sess.createdAt,
      nowMs: Date.now(),
    });

    // ensure job exists
    const job = await prisma.aiNoteJob.upsert({
      where: { noteId },
      update: {},
        create: {
          noteId,
          userId,
          stage: "prep",
          progress: 0,
          error: null,
          segmentTimeSec: Math.max(30, parseEnvInt("AI_NOTE_SEGMENT_TIME_SEC", 180)),
          segmentsTotal: 0,
          asrNextIndex: 0,
          llmNextPart: 0,
        llmPartsTotal: 0,
        noteMarkdown: null,
        secondsBilled: null,
      } as any,
    });

    // ✅ 抢锁（防并发）
    const lock = await acquireJobLock(noteId);
    if (!lock.ok) {
      return bad("LOCKED", 202, "Job is being processed by another request. Retry shortly.", {
        retryAfterMs: 1500,
      });
    }

    try {
      // ---------- STAGE: PREP ----------
      if (job.stage === "prep") {
        if (isOfflineMode()) {
          const files = await getOfflineChunkFiles(noteId);
          if (files.length === 0) return bad("NO_CHUNKS", 409, "No chunks uploaded.");
        } else {
          const chunks = await prisma.aiNoteChunk.findMany({
            where: { noteId },
            orderBy: { chunkIndex: "asc" },
            select: { chunkIndex: true, size: true },
          });

          if (chunks.length === 0) return bad("NO_CHUNKS", 409, "No chunks uploaded.");
          if (sourceType === "upload") {
            const contiguous = chunks.every((chunk, index) => chunk.chunkIndex === index);
            const totalBytes = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
            if (
              !Number.isSafeInteger(expectedChunks) ||
              expectedChunks <= 0 ||
              !Number.isSafeInteger(expectedBytes) ||
              expectedBytes <= 0 ||
              chunks.length !== expectedChunks ||
              totalBytes !== expectedBytes ||
              !contiguous
            ) {
              return bad(
                "INCOMPLETE_UPLOAD",
                409,
                "The audio upload is incomplete. Please retry the upload.",
                { stage: "uploading", retryable: false, receivedChunks: chunks.length, receivedBytes: totalBytes },
                traceId
              );
            }
          }
        }

        await prisma.aiNoteJob.update({
          where: { noteId },
          data: { stage: "asr", progress: 1, error: null, asrNextIndex: 0, llmNextPart: 0 },
        });

        return NextResponse.json({ ok: true, stage: "asr", progress: 1, noteId, elapsedMs: Date.now() - t0 });
      }

      // ---------- STAGE: ASR ----------
      if (job.stage === "asr") {
        await refreshJobLock(noteId, lock.lockId);

        if (isOfflineMode()) {
          const files = await getOfflineChunkFiles(noteId);
          if (files.length === 0) return bad("NO_CHUNKS", 409);

          await prisma.aiNoteJob.update({ where: { noteId }, data: { segmentsTotal: files.length } });

          for (const f of files) {
            await prisma.aiNoteTranscript.upsert({
              where: { noteId_chunkIndex: { noteId, chunkIndex: f.index } },
              update: { text: `[offline transcript] ${f.name}` },
              create: { noteId, chunkIndex: f.index, text: `[offline transcript] ${f.name}` },
            });
          }

          await prisma.aiNoteJob.update({
            where: { noteId },
            data: { stage: "llm", progress: 60, error: null, asrNextIndex: files.length },
          });

          return NextResponse.json({ ok: true, stage: "llm", progress: 60, noteId, segmentsTotal: files.length });
        }

        const ffmpegBin = getFfmpegBin();
        await ensureExecutable(ffmpegBin);

        const ASR_BATCH = Math.max(
          1,
          parseEnvInt("AI_NOTE_ASR_BATCH", parseEnvInt("AI_NOTE_ASR_CONCURRENCY", 1))
        );
        const asrTimeoutMs = Math.max(30_000, parseEnvInt("AI_NOTE_ASR_TIMEOUT_MS", 180_000));
        const asrMaxTry = Math.max(1, parseEnvInt("AI_NOTE_ASR_MAX_TRIES", 4));
        // Keep individual ASR requests bounded; larger slices were causing upstream resets/timeouts.
        const requestedSegTime = Math.max(30, job.segmentTimeSec || parseEnvInt("AI_NOTE_SEGMENT_TIME_SEC", 300));
        const segTime = Math.min(requestedSegTime, 180);

        const chunks = await prisma.aiNoteChunk.findMany({
          where: { noteId },
          orderBy: { chunkIndex: "asc" },
          select: { chunkIndex: true, data: true, mime: true, size: true },
        });

        if (chunks.length === 0) return bad("NO_CHUNKS", 409);

        const workDir = path.join(os.tmpdir(), "ai-note", noteId, "work");
        await fs.mkdir(workDir, { recursive: true });

        const sourceMime = String(chunks[0]?.mime || "audio/webm");
        const fullSource = path.join(workDir, `source.${extensionForMime(sourceMime)}`);
        const hash = createHash("sha256");
        let reconstructedBytes = 0;
        const fh = await fs.open(fullSource, "w");
        try {
          for (const c of chunks) {
            const bytes = bytesToBuffer(c.data);
            await fh.write(bytes);
            hash.update(bytes);
            reconstructedBytes += bytes.length;
          }
        } finally {
          await fh.close();
        }
        const reconstructedSha256 = hash.digest("hex");
        const fileStat = await fs.stat(fullSource);
        const hashExpected = sourceType === "upload" && /^[a-f0-9]{64}$/.test(expectedSha256);
        if (sourceType === "upload" && (!hashExpected || reconstructedSha256 !== expectedSha256 || reconstructedBytes !== expectedBytes || fileStat.size !== expectedBytes)) {
          throw Object.assign(new Error("Reconstructed audio did not match the uploaded source."), {
            _code: "UPLOAD_INTEGRITY_FAILED",
            details: { expectedBytes, reconstructedBytes, fileBytes: fileStat.size, expectedSha256, reconstructedSha256 },
          });
        }

        const probe = await withTimeout(
          run(ffmpegBin, ["-hide_banner", "-i", fullSource, "-map", "0:a:0", "-t", "0.1", "-f", "null", "-"]),
          30_000,
          "ffmpeg_probe"
        ).catch((error) => {
          throw Object.assign(new Error(String((error as Error)?.message || error)), { _code: "AUDIO_VALIDATION_FAILED" });
        });
        const duration = probe.stderr.match(/Duration:\s*([^,]+)/i)?.[1]?.trim() || "unknown";
        const audioStream = probe.stderr.match(/Audio:\s*([^\r\n]+)/i)?.[1]?.trim() || "unknown";
        console.info("[ai-note/finalize] audio validated", {
          traceId,
          noteId,
          expectedChunks,
          receivedChunks: chunks.length,
          expectedBytes,
          reconstructedBytes,
          sha256: reconstructedSha256,
          sourceMime,
          sourcePath: fullSource,
          fileReadable: true,
          ffmpegBin,
          duration,
          audioStream,
          elapsedMs: Date.now() - t0,
        });

        const fullWav = path.join(workDir, "full.wav");
        await withTimeout(
          run(ffmpegBin, ["-y", "-hide_banner", "-i", fullSource, "-vn", "-sn", "-dn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", fullWav]),
          180_000,
          "ffmpeg_webm_to_wav"
        ).catch((e) => {
          throw Object.assign(new Error(String((e as any)?.message || e)), { _code: "FFMPEG_FAILED" });
        });

        const segPattern = path.join(workDir, "seg-%03d.wav");
        await withTimeout(
          run(ffmpegBin, ["-y", "-hide_banner", "-i", fullWav, "-f", "segment", "-segment_time", String(segTime), "-reset_timestamps", "1", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", segPattern]),
          180_000,
          "ffmpeg_segment"
        ).catch((e) => {
          throw Object.assign(new Error(String((e as any)?.message || e)), { _code: "FFMPEG_FAILED" });
        });

        const files = (await fs.readdir(workDir)).filter((n) => n.startsWith("seg-") && n.endsWith(".wav")).sort();
        const total = files.length;

        await prisma.aiNoteJob.update({ where: { noteId }, data: { segmentsTotal: total } });

        const existingTranscriptRows = await prisma.aiNoteTranscript.findMany({
          where: { noteId },
          select: { chunkIndex: true, text: true },
          orderBy: { chunkIndex: "asc" },
        });
        const startIdx = nextUnprocessedIndex(existingTranscriptRows, total);
        const endIdx = Math.min(total, startIdx + ASR_BATCH);

        if (startIdx !== (job.asrNextIndex || 0)) {
          const syncedProgress = total > 0 ? Math.min(60, Math.max(1, Math.round((startIdx / total) * 60))) : 1;
          await prisma.aiNoteJob.update({
            where: { noteId },
            data: { asrNextIndex: startIdx, progress: syncedProgress, error: null },
          });
        }

        if (startIdx >= total) {
          await prisma.aiNoteJob.update({ where: { noteId }, data: { stage: "llm", progress: 60, error: null } });
          return NextResponse.json({ ok: true, stage: "llm", progress: 60, noteId, segmentsTotal: total });
        }

        const HasBlob = typeof (globalThis as any).Blob !== "undefined";
        if (!HasBlob) return bad("INTERNAL_ERROR", 500, "global Blob not available");

        for (let i = startIdx; i < endIdx; i++) {
          await refreshJobLock(noteId, lock.lockId);

          const fname = files[i];
          const p = path.join(workDir, fname);
          const buf = await fs.readFile(p);

          let text = "";
          try {
            text = await transcribeWithFallback(buf, fname, asrTimeoutMs, asrMaxTry);
          } catch (error) {
            throw mapTranscriptionProviderError(error);
          }

          const cleaned = String(text || "").trim();

          await prisma.aiNoteTranscript.upsert({
            where: { noteId_chunkIndex: { noteId, chunkIndex: i } },
            update: { text: cleaned },
            create: { noteId, chunkIndex: i, text: cleaned },
          });
        }

        const newNext = endIdx;
        const prog = total > 0 ? Math.min(60, Math.max(1, Math.round((newNext / total) * 60))) : 1;

        await prisma.aiNoteJob.update({
          where: { noteId },
          data: { asrNextIndex: newNext, progress: prog, error: null },
        });

        return NextResponse.json({
          ok: true,
          stage: "asr",
          progress: prog,
          noteId,
          segmentsTotal: total,
          completedSegments: newNext,
          asrNextIndex: newNext,
          elapsedMs: Date.now() - t0,
        });
      }

      // ---------- STAGE: LLM ----------
      if (job.stage === "llm") {
        await refreshJobLock(noteId, lock.lockId);

        const rows = await prisma.aiNoteTranscript.findMany({
          where: { noteId },
          orderBy: { chunkIndex: "asc" },
          select: { text: true },
        });

        const transcriptAll = rows
          .map((r) => String(r.text || "").trim())
          .filter((text) => text && !isSkippedTranscript(text))
          .join("\n")
          .trim();
        if (!transcriptAll) return bad("EMPTY_TRANSCRIPT", 422, "No speech could be transcribed from this audio.", { stage: "transcribing", retryable: false }, traceId);
        try {
          await assertNoteRequestAllowed(userId, transcriptAll.length, { allowStaged: true });
          markNoteAttempt(userId);
        } catch (error) {
          if (error instanceof NoteLimitError) {
            return NextResponse.json({ ok: false, error: error.code, message: error.message }, { status: error.status });
          }
          throw error;
        }

        if (isOfflineMode()) {
          const preview = transcriptAll.slice(0, 2000);
          const final = [
            "# Notes (offline/test)",
            "",
            "## TL;DR",
            "- Offline/test mode enabled. ASR/LLM network calls were bypassed.",
            "- Transcript is generated locally as placeholders.",
            "",
            "## Summary",
            `- Segments: ${rows.length}`,
            `- Transcript chars: ${transcriptAll.length}`,
            "",
            "## Transcript Preview (first 2000 chars)",
            "```",
            preview || "(empty)",
            "```",
          ].join("\n");

          await prisma.aiNoteJob.update({
            where: { noteId },
            data: {
              stage: "done",
              progress: 100,
              noteMarkdown: final,
              secondsBilled: recordedSeconds,
              error: null,
            } as any,
          });

          await prisma.aiNoteChunk.deleteMany({ where: { noteId } }).catch(() => {});
          await cleanupWorkDir(noteId);
          void trackFeatureUsage({
            userId,
            featureKey: "note",
            featureName: "AI Note",
            actionType: "NOTE_USED",
            pagePath: "/ai-note",
            metadata: { mode: "staged-offline", duration_ms: Date.now() - t0 },
            request: req,
          });

          return NextResponse.json({
            ok: true,
            stage: "done",
            progress: 100,
            noteId,
            note: final,
            secondsBilled: recordedSeconds,
            elapsedMs: Date.now() - t0,
          });
        }

        try {
          await assertQuotaOrThrow({ userId, action: "note", amount: recordedSeconds });
        } catch (e) {
          if (e instanceof QuotaError) {
            return NextResponse.json({ ok: false, error: e.code, message: e.message }, { status: e.status ?? 429 });
          }
          throw e;
        }

        const llmTimeoutMs = Math.max(60_000, parseEnvInt("AI_NOTE_LLM_TIMEOUT_MS", 180_000));
        const LLM_BATCH = Math.max(1, parseEnvInt("AI_NOTE_LLM_BATCH", 1));

        // ✅ 你后面已经改成 6500/400 了就保持一致：也可以 env 化
        const maxChars = Math.max(2000, parseEnvInt("AI_NOTE_LLM_MAX_CHARS", 6500));
        const overlap = Math.max(0, parseEnvInt("AI_NOTE_LLM_OVERLAP", 400));
        const pauseMs = Math.max(0, parseEnvInt("AI_NOTE_LLM_PAUSE_MS", 15000));

        const chunks = chunkText(transcriptAll, maxChars, overlap);
        const totalParts = chunks.length;

        if ((job.llmPartsTotal || 0) !== totalParts) {
          await prisma.aiNoteJob.update({ where: { noteId }, data: { llmPartsTotal: totalParts } });
        }

        const existingSummaryParts = await prisma.aiNoteSummaryPart.findMany({
          where: { noteId },
          select: { partIndex: true, text: true },
          orderBy: { partIndex: "asc" },
        });
        const completedPartIndexes = existingSummaryParts
          .filter((row) => String(row.text || "").trim().length > 0)
          .map((row) => row.partIndex);
        const resumeFromPart = Math.min(totalParts, firstMissingContiguousIndex(completedPartIndexes));
        const startPart = resumeFromPart;
        const endPart = Math.min(totalParts, startPart + LLM_BATCH);

        if (startPart !== (job.llmNextPart || 0)) {
          const syncedProgress = totalParts > 0 ? 60 + Math.min(39, Math.round((startPart / totalParts) * 39)) : 80;
          await prisma.aiNoteJob.update({
            where: { noteId },
            data: { llmNextPart: startPart, progress: syncedProgress, error: null },
          });
        }

        if (startPart >= totalParts) {
          await prisma.aiNoteJob.update({
            where: { noteId },
            data: { stage: "merge", progress: 96, error: null },
          });

          return NextResponse.json({
            ok: true,
            stage: "merge",
            progress: 96,
            noteId,
            partialNote: buildProgressiveNote(existingSummaryParts.map((part) => String(part.text || "").trim()).filter(Boolean)),
            secondsBilled: recordedSeconds,
            elapsedMs: Date.now() - t0,
          });
        }

        const progressiveParts = new Map<number, string>();
        for (const row of existingSummaryParts) {
          const value = String(row.text || "").trim();
          if (value) progressiveParts.set(row.partIndex, value);
        }

        for (let p = startPart; p < endPart; p++) {
          await refreshJobLock(noteId, lock.lockId);

          const text = chunks[p];
          const part = await withTimeout(runAiNotePipeline(text, { phase: "segment" }), llmTimeoutMs, `llm_part_${p}`);
          const normalizedPart = String(part || "").trim();

          await prisma.aiNoteSummaryPart.upsert({
            where: { noteId_partIndex: { noteId, partIndex: p } },
            update: { text: normalizedPart },
            create: { noteId, partIndex: p, text: normalizedPart },
          });
          if (normalizedPart) progressiveParts.set(p, normalizedPart);

          if (pauseMs > 0) {
            await new Promise((r) => setTimeout(r, pauseMs));
          }
        }

        const newNext = endPart;
        const prog = totalParts > 0 ? 60 + Math.min(39, Math.round((newNext / totalParts) * 39)) : 80;

        await prisma.aiNoteJob.update({
          where: { noteId },
          data: { llmNextPart: newNext, progress: prog, error: null },
        });

        return NextResponse.json({
          ok: true,
          stage: "llm",
          progress: prog,
          noteId,
          llmPartsTotal: totalParts,
          completedParts: newNext,
          llmNextPart: newNext,
          partialNote: buildProgressiveNote(
            Array.from(progressiveParts.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([, value]) => value)
          ),
          elapsedMs: Date.now() - t0,
        });
      }

      if (job.stage === "merge") {
        await refreshJobLock(noteId, lock.lockId);

        const rows = await prisma.aiNoteTranscript.findMany({
          where: { noteId },
          orderBy: { chunkIndex: "asc" },
          select: { text: true },
        });
        const transcriptAll = rows
          .map((r) => String(r.text || "").trim())
          .filter((text) => text && !isSkippedTranscript(text))
          .join("\n")
          .trim();
        if (!transcriptAll) return bad("ASR_FAILED", 422, "Transcript is empty.");

        const llmTimeoutMs = Math.max(60_000, parseEnvInt("AI_NOTE_LLM_TIMEOUT_MS", 180_000));
        const parts = await prisma.aiNoteSummaryPart.findMany({
          where: { noteId },
          orderBy: { partIndex: "asc" },
          select: { text: true },
        });
        const merged = parts.map((p) => String(p.text || "").trim()).filter(Boolean).join("\n\n---\n\n");
        const final = await withTimeout(runAiNotePipeline(merged, { phase: "final" }), llmTimeoutMs, "llm_merge").catch((error) => {
          if (error && typeof error === "object") Object.assign(error, { failedStage: "merge" });
          throw error;
        });

        await addUsageEvent(userId, "note_seconds", recordedSeconds).catch(() => {});
        await recordNoteGenerateSuccess(userId).catch(() => {});

        await prisma.aiNoteJob.update({
          where: { noteId },
          data: {
            stage: "done",
            progress: 100,
            noteMarkdown: String(final || ""),
            secondsBilled: recordedSeconds,
            error: null,
          } as any,
        });

        await prisma.aiNoteChunk.deleteMany({ where: { noteId } }).catch(() => {});
        await cleanupWorkDir(noteId);
        void trackFeatureUsage({
          userId,
          featureKey: "note",
          featureName: "AI Note",
          actionType: "NOTE_USED",
          pagePath: "/ai-note",
          metadata: { mode: "staged", duration_ms: Date.now() - t0 },
          request: req,
        });

        return NextResponse.json({
          ok: true,
          stage: "done",
          progress: 100,
          noteId,
          note: String(final || ""),
          secondsBilled: recordedSeconds,
          elapsedMs: Date.now() - t0,
        });
      }

      // ---------- DONE/FAILED ----------
      if (job.stage === "done") {
        return NextResponse.json({ ok: true, stage: "done", progress: 100, noteId, note: job.noteMarkdown ?? "" });
      }

      if (job.stage === "failed") {
        return bad("INTERNAL_ERROR", 500, "Note generation stopped unexpectedly. Please retry.", { stage: "failed", progress: job.progress }, traceId);
      }

      return NextResponse.json({ ok: true, stage: job.stage, progress: job.progress, noteId });
    } finally {
      await releaseJobLock(noteId, lock.lockId).catch(() => {});
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error("[ai-note/finalize] error", { traceId, noteId, error: e });

    if (e?._code === "UPLOAD_INTEGRITY_FAILED") return bad("UPLOAD_INTEGRITY_FAILED", 409, "The uploaded audio failed its integrity check. Please upload it again.", { stage: "uploading", retryable: false }, traceId);
    if (e?._code === "AUDIO_VALIDATION_FAILED") return bad("AUDIO_VALIDATION_FAILED", 422, "This file is not valid audio or uses an unsupported container.", { stage: "transcribing", retryable: false }, traceId);
    if (e?._code === "FFMPEG_FAILED") return bad("AUDIO_DECODE_FAILED", 422, "This audio file could not be decoded. Try a supported MP3, WAV, M4A, MP4, WebM, OGG, AAC, or FLAC file.", { stage: "transcribing", retryable: false }, traceId);
    if (e instanceof AiNoteTranscriptionError) {
      const status = e.code === "TRANSCRIPTION_AUTH_FAILED" ? 503 : e.code === "TRANSCRIPTION_RATE_LIMITED" ? 429 : e.code === "TRANSCRIPTION_TIMEOUT" ? 504 : 502;
      const publicMessage = e.code === "TRANSCRIPTION_AUTH_FAILED"
        ? "The transcription service is not configured correctly. Please contact support."
        : e.code === "TRANSCRIPTION_RATE_LIMITED"
          ? "The transcription service is busy. Please retry shortly."
          : e.code === "TRANSCRIPTION_TIMEOUT"
            ? "Transcription timed out. You can retry without uploading again."
            : e.retryable
              ? "Audio transcription failed temporarily. You can retry without uploading again."
              : "The transcription provider could not process this audio.";
      return bad(e.code, status, publicMessage, { stage: "transcribing", retryable: e.retryable, providerStatus: e.providerStatus }, traceId);
    }
    if (e?._code === "ASR_FAILED") {
      let message = "Audio transcription failed. Please retry.";
      try {
        const parsed = JSON.parse(msg);
        if (parsed && typeof parsed === "object") {
          message = `ASR failed on segment ${Number(parsed.segmentNumber || 0)}/${Number(parsed.segmentsTotal || 0)}. Retry to resume from the next unfinished segment.`;
        }
      } catch {}
      return bad("TRANSCRIPTION_PROVIDER_FAILED", 502, message, { stage: "transcribing", retryable: true }, traceId);
    }

    if (e instanceof AiNoteGenerationError) {
      const status = e.code === "NOTE_GENERATION_AUTH_FAILED" ? 503 : e.code === "NOTE_GENERATION_RATE_LIMITED" ? 429 : e.code === "NOTE_GENERATION_TIMEOUT" ? 504 : 502;
      const publicMessage = e.code === "NOTE_GENERATION_RATE_LIMITED"
        ? "The note service is busy. Please retry shortly."
        : e.code === "NOTE_GENERATION_TIMEOUT"
        ? "Note generation timed out. You can retry without uploading again."
        : e.code === "NOTE_GENERATION_AUTH_FAILED"
        ? "The note service is not configured correctly. Please contact support."
        : "The note could not be organized. You can retry without uploading again.";
      const failedStage = (e as AiNoteGenerationError & { failedStage?: string }).failedStage === "merge" ? "merge" : "llm";
      return bad(e.code, status, publicMessage, { stage: failedStage, retryable: e.retryable, providerStatus: e.providerStatus, retryAfterMs: e.retryAfterMs }, traceId);
    }

    if (/TIMEOUT:llm_/i.test(msg)) {
      return bad("NOTE_GENERATION_TIMEOUT", 504, "Note generation timed out. You can retry without uploading again.", { stage: "llm", retryable: true }, traceId);
    }

    return bad("INTERNAL_ERROR", 500, "Unable to generate notes right now. Please try again.", undefined, traceId);
  }
}
