import { NextResponse, type NextRequest } from "next/server";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fssync from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getRouteSessionUser } from "@/lib/auth/routeSession";
import { isOwnerIdentity } from "@/lib/auth/owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ffmpegPath() {
  const configured = process.env.FFMPEG_PATH?.trim();
  if (configured && fssync.existsSync(configured)) return configured;
  const executable = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
  const roots = [process.cwd(), "/var/task", path.join(process.cwd(), ".next", "standalone")];
  return roots
    .flatMap((root) => [
      path.join(root, "node_modules", "ffmpeg-static", executable),
      path.join(root, "node_modules", "ffmpeg-static", "bin", executable),
    ])
    .find((candidate) => fssync.existsSync(candidate));
}

function commandVersion(command: string) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, ["-version"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => (output += String(chunk)));
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve(output.split(/\r?\n/, 1)[0] || "available") : reject(new Error(`exit ${code}`))
    );
  });
}

async function reachable(url: string, init: RequestInit) {
  try {
    const response = await fetch(url, { ...init, signal: AbortSignal.timeout(5_000) });
    return { reachable: true, status: response.status };
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.name : "network_error" };
  }
}

export async function GET(request: NextRequest) {
  const traceId = request.headers.get("x-vercel-id") || randomUUID();
  const user = await getRouteSessionUser(request);
  if (!user || !isOwnerIdentity(user)) {
    return NextResponse.json(
      { ok: false, error: "FORBIDDEN", message: "Owner access is required.", traceId },
      { status: 403, headers: { "x-trace-id": traceId } }
    );
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "ai-note-health-"));
  let tempWritable = false;
  try {
    const probe = path.join(tempDir, "probe.txt");
    await fs.writeFile(probe, "ok");
    tempWritable = (await fs.readFile(probe, "utf8")) === "ok";
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }

  const binary = ffmpegPath();
  let ffmpeg: { available: boolean; version?: string } = { available: false };
  if (binary) {
    try {
      ffmpeg = { available: true, version: await commandVersion(binary) };
    } catch {
      ffmpeg = { available: false };
    }
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  const asrBase = process.env.ASR_URL?.trim();
  const groqCheck = () =>
    groqKey
      ? reachable("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${groqKey}` } })
      : Promise.resolve({ reachable: false, error: "not_configured" });
  const [noteProvider, transcriptionProvider] = await Promise.all([
    groqCheck(),
    asrBase ? reachable(asrBase, { method: "GET" }) : groqCheck(),
  ]);

  const checks = {
    environment: {
      groqConfigured: Boolean(groqKey),
      asrConfigured: Boolean(asrBase),
      asrFallbackConfigured: Boolean(groqKey),
    },
    tempStorage: { writable: tempWritable },
    ffmpeg,
    transcriptionProvider,
    noteProvider,
  };
  const ok = tempWritable && ffmpeg.available && noteProvider.reachable && transcriptionProvider.reachable;
  return NextResponse.json(
    { ok, checks, traceId },
    { status: ok ? 200 : 503, headers: { "x-trace-id": traceId } }
  );
}
