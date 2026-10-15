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
import { buildCanonicalTranscript, buildProgressiveNote, buildRawTranscript, hasContiguousChunkIndexes, nextUnprocessedIndex, storedSegmentTranscript } from "@/lib/aiNote/finalizeHelpers";
import { canonicalizeTranscriptText, transcriptNormalizationMetadata } from "@/lib/aiNote/transcriptCanonicalization";
import { audioProbeArgs, countDecodedSamples, parseAudioProbe, samplesToSeconds, seekStrategyFor, segmentCount, segmentExtractArgs } from "@/lib/aiNote/audioSegments";
import { deriveRecordedSeconds, parseRecordedDurationMs } from "@/lib/aiNote/recordingUsage";
import { assertNoteRequestAllowed, markNoteAttempt, NoteLimitError, recordNoteGenerateSuccess } from "@/lib/aiNote/quota";
import { parseEnvInt } from "@/lib/env/number";
import { attemptSignal, createRequestBudget, retryWithBudget, TimeBudgetExceededError, type RequestBudget } from "@/lib/ai/requestBudget";

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
  | "PROCESSING_TIME_BUDGET"
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

/** Runs ffmpeg; the process is killed when `signal` aborts (attempt timeout or request budget). */
function run(cmd: string, args: string[], options: { signal?: AbortSignal } = {}) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], signal: options.signal, killSignal: "SIGKILL" });
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

/**
 * Once the finished note is saved, the audio, per-segment transcripts, and segment
 * ledgers are no longer read by any code path (a completed note is served from
 * AiNoteJob.noteMarkdown). Delete them so they are not kept long-term; see
 * lib/aiNote/retention.ts. Best-effort: a failure here must not fail the note.
 */
async function deleteCompletedNoteProcessingData(noteId: string) {
  await prisma.aiNoteChunk.deleteMany({ where: { noteId } }).catch(() => {});
  await prisma.aiNoteTranscript.deleteMany({ where: { noteId } }).catch(() => {});
  await prisma.aiNoteSummaryPart.deleteMany({ where: { noteId } }).catch(() => {});
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

function isRetryableAsrError(error: unknown) {
  const message = String((error as Error)?.message || error);
  const explicit = Number((error as { httpStatus?: unknown } | null)?.httpStatus);
  const status = Number.isInteger(explicit) && explicit > 0 ? explicit : parseHttpStatus(message);
  return isRetryableStatus(status ?? undefined) || isRetryableAsrMessage(message) || String((error as { code?: unknown })?.code || "").toUpperCase().includes("TIMEOUT");
}

/** Time budget for one finalize request: Vercel maxDuration (300 s) minus room to save results and respond. */
function requestBudgetMs() {
  return Math.min(285_000, Math.max(1_000, parseEnvInt("AI_NOTE_REQUEST_BUDGET_MS", 270_000)));
}

type ResolvedAsrResult = {
  text: string;
  provider: string;
  model: string;
  endpoint: string;
};

function safeEndpoint(value: string | undefined, suffix = "") {
  const raw = String(value || "").trim();
  if (!raw) return "unconfigured";
  try {
    const url = new URL(raw);
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    const base = url.toString().replace(/\/$/, "");
    return suffix && !base.endsWith(suffix) ? `${base}${suffix}` : base;
  } catch {
    return "configured-invalid-url";
  }
}

function externalAsrProvider(value: string | undefined) {
  try {
    const hostname = new URL(String(value || "")).hostname.toLowerCase();
    if (hostname.endsWith(".hf.space")) return "huggingface";
    return hostname || "external";
  } catch {
    return "external";
  }
}

async function transcribeWithFallback(buf: Buffer, fname: string, budget: RequestBudget): Promise<ResolvedAsrResult> {
  if (isOfflineMode()) {
    return { text: `[offline transcript] ${fname}`, provider: "offline", model: "offline", endpoint: "offline" };
  }

  const attemptTimeoutMs = Math.max(1_000, parseEnvInt("AI_NOTE_ASR_TIMEOUT_MS", 180_000));
  const minAttemptMs = Math.max(1_000, parseEnvInt("AI_NOTE_ASR_MIN_ATTEMPT_MS", 30_000));
  const common = { budget, attemptTimeoutMs, minAttemptMs, isRetryable: isRetryableAsrError };

  // 1) External ASR (ASR_URL). A successful empty transcript means the provider found
  // no speech in this segment; that is a valid result, not a provider failure, so it is
  // returned as-is instead of triggering a paid fallback transcription.
  try {
    const text = await retryWithBudget(
      (signal) => transcribeAudioToText(new Blob([new Uint8Array(buf)], { type: "audio/wav" }) as any, { filename: fname, mime: "audio/wav", signal } as any),
      {
        ...common,
        label: `asr_external_${fname}`,
        maxAttempts: Math.max(1, parseEnvInt("AI_NOTE_ASR_MAX_TRIES", 4)),
        onRetry: ({ attempt, delayMs }) => console.warn(`[ai-note/finalize] retry asr_external_${fname} attempt=${attempt} backoff=${delayMs}ms`),
      }
    );
    return {
      text,
      provider: externalAsrProvider(process.env.ASR_URL),
      model: process.env.AI_NOTE_EXTERNAL_ASR_MODEL || process.env.ASR_MODEL_SIZE || "base",
      endpoint: safeEndpoint(process.env.ASR_URL, "/transcribe"),
    };
  } catch (e) {
    // Out of time: stop here instead of starting a (paid) fallback that cannot finish.
    if (e instanceof TimeBudgetExceededError) throw e;
    // 2) Groq fallback, only when the external provider failed. Fewer attempts: each
    // one is billed, including attempts that are cancelled after the provider started.
    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) throw e;
    const out = await retryWithBudget(
      (signal) => callGroqTranscribe({ apiKey: groqKey, audio: buf, mime: "audio/wav", filename: fname, model: process.env.AI_NOTE_ASR_MODEL || "whisper-large-v3", timeoutMs: attemptTimeoutMs, signal }),
      {
        ...common,
        label: `asr_groq_${fname}`,
        maxAttempts: Math.max(1, parseEnvInt("AI_NOTE_ASR_FALLBACK_MAX_TRIES", 2)),
        onRetry: ({ attempt, delayMs }) => console.warn(`[ai-note/finalize] retry asr_groq_${fname} attempt=${attempt} backoff=${delayMs}ms`),
      }
    );
    return {
      text: String(out?.text || "").trim(),
      provider: "groq",
      model: String(out?.modelUsed || process.env.AI_NOTE_ASR_MODEL || "whisper-large-v3"),
      endpoint: "https://api.groq.com/openai/v1/audio/transcriptions",
    };
  }
}

/**
 * Maps plan/quota rejections to a response. These are raised before (or instead of)
 * expensive work, and nothing is billed for a rejected job.
 */
function limitErrorResponse(error: unknown, traceId: string) {
  if (error instanceof NoteLimitError) {
    // The uploaded audio is kept, so a cooldown can be retried without uploading again.
    const retryable = error.code === "NOTE_COOLDOWN_ACTIVE";
    return bad(error.code as ApiErr, error.status, error.message, { retryable }, traceId);
  }
  if (error instanceof QuotaError) {
    const message =
      error.code === "NOTE_QUOTA_EXCEEDED"
        ? "This recording is longer than the AI Note time left on your plan this week."
        : error.message;
    return bad(error.code as ApiErr, error.status ?? 429, message, { retryable: false }, traceId);
  }
  return null;
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

function transcriptBundle(rows: Array<{ text: string; rawText?: string | null; canonicalText?: string | null }>) {
  const canonicalText = buildCanonicalTranscript(rows);
  const rawText = buildRawTranscript(rows);
  return { rawText, canonicalText, ...transcriptNormalizationMetadata(rawText, canonicalText) };
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
  // Bounded wall-clock budget for this request; every provider call and ffmpeg run is
  // cancelled when it runs out, and the client resumes with the next request.
  const budget = createRequestBudget(requestBudgetMs());
  let currentStage = "prep";
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

    // Bill the decoded audio duration recorded during ASR. The client/wall-clock
    // estimate is only a fallback for jobs that predate duration verification.
    const billableSeconds = () => job.secondsBilled ?? recordedSeconds;

    // ✅ 抢锁（防并发）
    const lock = await acquireJobLock(noteId);
    if (!lock.ok) {
      return bad("LOCKED", 202, "Job is being processed by another request. Retry shortly.", {
        retryAfterMs: 1500,
      });
    }

    currentStage = String(job.stage || "prep");
    // Keep the lease alive while this request works (provider calls can outlast the TTL),
    // so a retry cannot start a duplicate run of the same step. If this function is
    // killed, the heartbeat stops and the lease expires after one TTL.
    const heartbeat = setInterval(() => void refreshJobLock(noteId, lock.lockId).catch(() => {}), Math.max(5_000, Math.floor(lock.ttlMs / 3)));

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
          if (sourceType === "record" && !hasContiguousChunkIndexes(chunks.map((chunk) => chunk.chunkIndex))) {
            return bad(
              "INCOMPLETE_UPLOAD",
              409,
              "Part of this recording did not upload, so it cannot be processed. Please record again.",
              { stage: "uploading", retryable: false, receivedChunks: chunks.length },
              traceId
            );
          }
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

        // Eligibility before any decoding or transcription: daily generations, cooldown,
        // and that the plan has note time left. The exact duration is checked against the
        // weekly quota once the audio has been decoded (first ASR step).
        try {
          await assertNoteRequestAllowed(userId, 0, { allowStaged: true });
          await assertQuotaOrThrow({ userId, action: "note", amount: 1 });
        } catch (error) {
          const response = limitErrorResponse(error, traceId);
          if (response) return response;
          throw error;
        }
        markNoteAttempt(userId);

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
            const rawText = `[offline transcript] ${f.name}`;
            const canonicalText = canonicalizeTranscriptText(rawText);
            const metadata = transcriptNormalizationMetadata(rawText, canonicalText);
            await prisma.aiNoteTranscript.upsert({
              where: { noteId_chunkIndex: { noteId, chunkIndex: f.index } },
              update: {
                text: canonicalText,
                rawText,
                canonicalText,
                rawHash: metadata.rawTranscriptHash,
                canonicalHash: metadata.canonicalTranscriptHash,
                asrProvider: "offline",
                asrModel: "offline",
                asrEndpoint: "offline",
              },
              create: {
                noteId,
                chunkIndex: f.index,
                text: canonicalText,
                rawText,
                canonicalText,
                rawHash: metadata.rawTranscriptHash,
                canonicalHash: metadata.canonicalTranscriptHash,
                asrProvider: "offline",
                asrModel: "offline",
                asrEndpoint: "offline",
              },
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

        const probeRun = await run(ffmpegBin, audioProbeArgs(fullSource), { signal: attemptSignal(budget, 30_000) }).catch((error) => {
          if (budget.signal.aborted) throw new TimeBudgetExceededError("ffmpeg_probe");
          throw Object.assign(new Error(String((error as Error)?.message || error)), { _code: "AUDIO_VALIDATION_FAILED" });
        });
        const audioProbe = parseAudioProbe(probeRun.stderr);
        console.info("[ai-note/finalize] audio validated", {
          traceId,
          noteId,
          expectedChunks,
          receivedChunks: chunks.length,
          expectedBytes,
          reconstructedBytes,
          sha256: reconstructedSha256,
          sourceMime,
          codec: audioProbe.codec,
          seekStrategy: seekStrategyFor(audioProbe.codec),
          firstSampleSeconds: audioProbe.firstSampleSeconds,
          duration: audioProbe.durationText,
          elapsedMs: Date.now() - t0,
        });

        // Segment count and verified duration come from one streaming decode, done once
        // per job (no WAV is written). Later ASR steps decode only their own segment.
        let total = Number(job.segmentsTotal) || 0;
        if (job.secondsBilled == null || total <= 0) {
          const decodedSamples = await countDecodedSamples(ffmpegBin, fullSource, { signal: attemptSignal(budget, 180_000) }).catch((e) => {
            if (budget.signal.aborted) throw new TimeBudgetExceededError("ffmpeg_decode_count");
            throw Object.assign(new Error(String((e as any)?.message || e)), { _code: "FFMPEG_FAILED" });
          });
          if (decodedSamples <= 0) {
            throw Object.assign(new Error("The recording decoded to no audio."), { _code: "AUDIO_DECODE_FAILED" });
          }
          total = segmentCount(decodedSamples, segTime);

          // Verified duration from the decoded audio (not the client's clock). Checked
          // against the weekly quota before the first segment is transcribed, and stored
          // as the amount to bill when the note completes.
          if (job.secondsBilled == null) {
            const verifiedSeconds = samplesToSeconds(decodedSamples);
            try {
              await assertQuotaOrThrow({ userId, action: "note", amount: verifiedSeconds });
            } catch (error) {
              const response = limitErrorResponse(error, traceId);
              if (response) return response;
              throw error;
            }
            job.secondsBilled = verifiedSeconds;
            console.info("[ai-note/finalize] verified audio duration", {
              traceId,
              noteId,
              verifiedSeconds,
              clientReportedSeconds: reportedDurationMs ? Math.ceil(reportedDurationMs / 1000) : null,
            });
          }
          await prisma.aiNoteJob.update({ where: { noteId }, data: { segmentsTotal: total, secondsBilled: job.secondsBilled } });
          job.segmentsTotal = total;
        }

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

          const fname = `seg-${String(i).padStart(3, "0")}.wav`;
          const p = path.join(workDir, fname);
          await run(ffmpegBin, segmentExtractArgs({ source: fullSource, output: p, index: i, segmentSeconds: segTime, probe: audioProbe }), {
            signal: attemptSignal(budget, 120_000),
          }).catch((e) => {
            if (budget.signal.aborted) throw new TimeBudgetExceededError("ffmpeg_segment");
            throw Object.assign(new Error(String((e as any)?.message || e)), { _code: "FFMPEG_FAILED" });
          });
          const buf = await fs.readFile(p);
          await fs.rm(p, { force: true });

          let asrResult: ResolvedAsrResult;
          try {
            asrResult = await transcribeWithFallback(buf, fname, budget);
          } catch (error) {
            if (error instanceof TimeBudgetExceededError) throw error;
            throw mapTranscriptionProviderError(error);
          }

          const stored = storedSegmentTranscript(asrResult.text);
          const { rawText, canonicalText } = stored;
          const metadata = transcriptNormalizationMetadata(rawText, canonicalText);

          console.info("[ai-note/asr-result]", {
            traceId,
            noteId,
            segmentIndex: i,
            noSpeech: stored.noSpeech,
            rawTranscriptHash: metadata.rawTranscriptHash,
            canonicalTranscriptHash: metadata.canonicalTranscriptHash,
            normalizationChanged: metadata.normalizationChanged,
            normalizedCharacterDelta: metadata.normalizedCharacterDelta,
            asrProvider: asrResult.provider,
            asrModel: asrResult.model,
            asrEndpoint: asrResult.endpoint,
          });

          await prisma.aiNoteTranscript.upsert({
            where: { noteId_chunkIndex: { noteId, chunkIndex: i } },
            update: {
              text: canonicalText,
              rawText,
              canonicalText,
              rawHash: metadata.rawTranscriptHash,
              canonicalHash: metadata.canonicalTranscriptHash,
              asrProvider: asrResult.provider,
              asrModel: asrResult.model,
              asrEndpoint: asrResult.endpoint,
            },
            create: {
              noteId,
              chunkIndex: i,
              text: canonicalText,
              rawText,
              canonicalText,
              rawHash: metadata.rawTranscriptHash,
              canonicalHash: metadata.canonicalTranscriptHash,
              asrProvider: asrResult.provider,
              asrModel: asrResult.model,
              asrEndpoint: asrResult.endpoint,
            },
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
          select: { text: true, rawText: true, canonicalText: true },
        });

        const transcript = transcriptBundle(rows);
        const transcriptAll = transcript.canonicalText;
        if (!transcriptAll) return bad("EMPTY_TRANSCRIPT", 422, "No speech could be transcribed from this audio.", { stage: "transcribing", retryable: false }, traceId);
        await prisma.aiNoteJob.update({
          where: { noteId },
          data: {
            rawTranscriptHash: transcript.rawTranscriptHash,
            canonicalTranscriptHash: transcript.canonicalTranscriptHash,
          },
        });
        console.info("[ai-note/transcript-canonicalization]", {
          traceId,
          noteId,
          stage: "llm",
          rawTranscriptHash: transcript.rawTranscriptHash,
          canonicalTranscriptHash: transcript.canonicalTranscriptHash,
          normalizationChanged: transcript.normalizationChanged,
          normalizedCharacterDelta: transcript.normalizedCharacterDelta,
        });
        try {
          // Transcript-size limit for the plan. Cooldown was already enforced (and the
          // attempt recorded) in prep, before transcription.
          await assertNoteRequestAllowed(userId, transcriptAll.length, { allowStaged: true, checkCooldown: false });
        } catch (error) {
          const response = limitErrorResponse(error, traceId);
          if (response) return response;
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
              secondsBilled: billableSeconds(),
              error: null,
            } as any,
          });

          await deleteCompletedNoteProcessingData(noteId);
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
            secondsBilled: billableSeconds(),
            elapsedMs: Date.now() - t0,
          });
        }

        try {
          await assertQuotaOrThrow({ userId, action: "note", amount: billableSeconds() });
        } catch (e) {
          const response = limitErrorResponse(e, traceId);
          if (response) return response;
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
            secondsBilled: billableSeconds(),
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
          const llmBudget = budget.child(llmTimeoutMs);
          const part = await runAiNotePipeline(text, { phase: "segment", traceId, noteId, budget: llmBudget }).finally(() => llmBudget.dispose());
          const normalizedPart = String(part || "").trim();

          await prisma.aiNoteSummaryPart.upsert({
            where: { noteId_partIndex: { noteId, partIndex: p } },
            update: { text: normalizedPart },
            create: { noteId, partIndex: p, text: normalizedPart },
          });
          if (normalizedPart) progressiveParts.set(p, normalizedPart);

          // Spacing between provider calls; skipped when it would eat into the time budget.
          if (pauseMs > 0 && budget.remainingMs() > pauseMs + 10_000) {
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
          select: { text: true, rawText: true, canonicalText: true },
        });
        const transcript = transcriptBundle(rows);
        const transcriptAll = transcript.canonicalText;
        if (!transcriptAll) return bad("ASR_FAILED", 422, "Transcript is empty.");
        await prisma.aiNoteJob.update({
          where: { noteId },
          data: {
            rawTranscriptHash: transcript.rawTranscriptHash,
            canonicalTranscriptHash: transcript.canonicalTranscriptHash,
          },
        });

        const llmTimeoutMs = Math.max(60_000, parseEnvInt("AI_NOTE_LLM_TIMEOUT_MS", 180_000));
        const parts = await prisma.aiNoteSummaryPart.findMany({
          where: { noteId },
          orderBy: { partIndex: "asc" },
          select: { text: true },
        });
        const merged = parts.map((p) => String(p.text || "").trim()).filter(Boolean).join("\n\n---\n\n");
        const mergeBudget = budget.child(llmTimeoutMs);
        const final = await runAiNotePipeline(merged, { phase: "final", traceId, noteId, budget: mergeBudget }).finally(() => mergeBudget.dispose()).catch((error) => {
          if (error && typeof error === "object") Object.assign(error, { failedStage: "merge" });
          throw error;
        });

        await addUsageEvent(userId, "note_seconds", billableSeconds()).catch(() => {});
        await recordNoteGenerateSuccess(userId).catch(() => {});

        await prisma.aiNoteJob.update({
          where: { noteId },
          data: {
            stage: "done",
            progress: 100,
            noteMarkdown: String(final || ""),
            secondsBilled: billableSeconds(),
            error: null,
          } as any,
        });

        await deleteCompletedNoteProcessingData(noteId);
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
          secondsBilled: billableSeconds(),
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
      clearInterval(heartbeat);
      await releaseJobLock(noteId, lock.lockId).catch(() => {});
    }
  } catch (e: any) {
    const msg = String(e?.message || e);
    const preservedDraft = e instanceof AiNoteGenerationError && typeof e.bestDraft === "string" ? e.bestDraft.trim() : "";
    if (preservedDraft && noteId) {
      await prisma.aiNoteJob.update({ where: { noteId }, data: { noteMarkdown: preservedDraft } }).catch(() => {});
    }
    console.error("[ai-note/finalize] error", {
      traceId,
      noteId,
      errorClass: e instanceof Error ? e.name : "UnknownError",
      code: typeof e?.code === "string" ? e.code : undefined,
      failedStage: typeof e?.failedStage === "string" ? e.failedStage : undefined,
      bestDraftPreserved: Boolean(preservedDraft),
    });

    if (e instanceof TimeBudgetExceededError) {
      // Completed segments/parts are saved; the next request continues from there.
      return bad("PROCESSING_TIME_BUDGET", 503, "Still working on this note. Continuing automatically…", { stage: currentStage, retryable: true, retryAfterMs: 1_000 }, traceId);
    }
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
  } finally {
    budget.dispose();
  }
}
