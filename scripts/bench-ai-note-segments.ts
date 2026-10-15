/**
 * Benchmarks the AI Note ASR-stage audio preparation: the previous pipeline (full
 * transcode to WAV + split, on every ASR step) against per-segment extraction
 * (lib/aiNote/audioSegments.ts). Local only: synthetic audio, no network, no user data.
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/bench-ai-note-segments.ts [minutes...]
 *
 * CPU time and peak RSS come from getrusage(RUSAGE_CHILDREN) around each ffmpeg run.
 * The old pipeline does identical work on every step, so one step is measured and
 * multiplied by the step count; every step of the new pipeline is measured.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { audioProbeArgs, decodedPcmArgs, parseAudioProbe, segmentCount, segmentExtractArgs } from "../lib/aiNote/audioSegments";

const FFMPEG = path.resolve(__dirname, "../node_modules/ffmpeg-static/ffmpeg");
const SEGMENT_SECONDS = 180;
const SHIM = `
import json, resource, subprocess, sys, time
t = time.time()
r = subprocess.run(sys.argv[1:], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
u = resource.getrusage(resource.RUSAGE_CHILDREN)
print(json.dumps({"code": r.returncode, "cpu": u.ru_utime + u.ru_stime, "rssKb": u.ru_maxrss, "wall": time.time() - t, "stderr": r.stderr.decode(errors="ignore")[-3000:]}))
`;

type Run = { cpu: number; rssKb: number; wall: number; stderr: string };

function measure(args: string[]): Run {
  const out = spawnSync("python3", ["-c", SHIM, FFMPEG, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const result = JSON.parse(out.stdout.trim().split("\n").pop()!);
  if (result.code !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}\n${result.stderr}`);
  return result;
}

function dirBytes(dir: string) {
  return fs.readdirSync(dir).reduce((sum, name) => sum + fs.statSync(path.join(dir, name)).size, 0);
}

function makeInput(dir: string, minutes: number, kind: "webm" | "mp3" | "m4a") {
  const file = path.join(dir, `lecture-${minutes}m.${kind}`);
  if (fs.existsSync(file)) return file;
  const seconds = minutes * 60;
  const codec =
    kind === "webm" ? ["-c:a", "libopus", "-b:a", "48k", "-live", "1", "-f", "webm"] : kind === "mp3" ? ["-c:a", "libmp3lame", "-b:a", "64k"] : ["-c:a", "aac", "-b:a", "64k"];
  const result = spawnSync(FFMPEG, [
    "-loglevel", "error", "-y",
    "-f", "lavfi", "-i", `anoisesrc=r=48000:a=0.2:d=${seconds},volume='0.5+0.5*sin(2*PI*3*t)':eval=frame`,
    "-f", "lavfi", "-i", `sine=f=220:r=48000:d=${seconds}`,
    "-filter_complex", "amix=inputs=2", "-ac", "1", ...codec, file,
  ]);
  if (result.status !== 0) throw new Error(String(result.stderr));
  return file;
}

function oldPipeline(source: string, work: string, steps: number) {
  const probe = measure(["-hide_banner", "-i", source, "-map", "0:a:0", "-t", "0.1", "-f", "null", "-"]);
  const full = path.join(work, "full.wav");
  const transcode = measure(["-y", "-hide_banner", "-i", source, "-vn", "-sn", "-dn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", full]);
  const split = measure(["-y", "-hide_banner", "-i", full, "-f", "segment", "-segment_time", String(SEGMENT_SECONDS), "-reset_timestamps", "1", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", path.join(work, "seg-%03d.wav")]);
  const tmpBytes = dirBytes(work);
  const perStep = probe.cpu + transcode.cpu + split.cpu;
  return {
    cpuPerJob: perStep * steps,
    wallPerJob: (probe.wall + transcode.wall + split.wall) * steps,
    maxStepCpu: perStep,
    maxStepWall: probe.wall + transcode.wall + split.wall,
    peakRssMb: Math.max(probe.rssKb, transcode.rssKb, split.rssKb) / 1024,
    peakTmpMb: tmpBytes / 1e6,
  };
}

function newPipeline(source: string, work: string) {
  const probeRun = measure(audioProbeArgs(source));
  const probe = parseAudioProbe(probeRun.stderr);
  // First step only: one streaming decode to count samples (measured for CPU/RSS; the
  // count itself is taken from a second run because the shim discards stdout).
  const count = measure(decodedPcmArgs(source));
  const decoded = spawnSync(FFMPEG, decodedPcmArgs(source), { maxBuffer: 2 * 1024 * 1024 * 1024 }).stdout.length / 2;
  const steps = segmentCount(decoded, SEGMENT_SECONDS);
  let cpu = count.cpu;
  let wall = count.wall;
  let maxStepCpu = 0;
  let maxStepWall = 0;
  let peakRssKb = Math.max(probeRun.rssKb, count.rssKb);
  let peakTmp = 0;
  for (let index = 0; index < steps; index += 1) {
    const output = path.join(work, `seg-${index}.wav`);
    const step = measure(segmentExtractArgs({ source, output, index, segmentSeconds: SEGMENT_SECONDS, probe }));
    const stepProbe = index === 0 ? probeRun : measure(audioProbeArgs(source));
    const stepCpu = step.cpu + stepProbe.cpu + (index === 0 ? count.cpu : 0);
    cpu += step.cpu + stepProbe.cpu;
    wall += step.wall + stepProbe.wall;
    maxStepCpu = Math.max(maxStepCpu, stepCpu);
    maxStepWall = Math.max(maxStepWall, step.wall + stepProbe.wall + (index === 0 ? count.wall : 0));
    peakRssKb = Math.max(peakRssKb, step.rssKb);
    peakTmp = Math.max(peakTmp, fs.statSync(output).size);
    fs.rmSync(output);
  }
  return { steps, codec: probe.codec, cpuPerJob: cpu, wallPerJob: wall, maxStepCpu, maxStepWall, peakRssMb: peakRssKb / 1024, peakTmpMb: peakTmp / 1e6 };
}

function main() {
  const minutesList = process.argv.slice(2).map(Number).filter((value) => value > 0);
  const cases: Array<[number, "webm" | "mp3" | "m4a"]> = minutesList.length
    ? minutesList.map((minutes) => [minutes, "webm"])
    : [[15, "webm"], [60, "webm"], [120, "webm"], [60, "mp3"], [60, "m4a"]];
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-note-bench-"));
  const rows: Record<string, unknown>[] = [];
  try {
    for (const [minutes, kind] of cases) {
      const source = makeInput(dir, minutes, kind);
      const oldWork = fs.mkdtempSync(path.join(dir, "old-"));
      const newWork = fs.mkdtempSync(path.join(dir, "new-"));
      const after = newPipeline(source, newWork);
      const before = oldPipeline(source, oldWork, after.steps);
      fs.rmSync(oldWork, { recursive: true, force: true });
      fs.rmSync(newWork, { recursive: true, force: true });
      const round = (value: number) => Math.round(value * 10) / 10;
      rows.push({
        input: `${minutes} min ${kind} (${after.codec})`,
        steps: after.steps,
        "CPU s/job before": round(before.cpuPerJob),
        "CPU s/job after": round(after.cpuPerJob),
        "max CPU s/step before": round(before.maxStepCpu),
        "max CPU s/step after": round(after.maxStepCpu),
        "max wall s/step before": round(before.maxStepWall),
        "max wall s/step after": round(after.maxStepWall),
        "wall s/job before": round(before.wallPerJob),
        "wall s/job after": round(after.wallPerJob),
        "peak /tmp MB before": round(before.peakTmpMb),
        "peak /tmp MB after": round(after.peakTmpMb),
        "peak ffmpeg RSS MB before": round(before.peakRssMb),
        "peak ffmpeg RSS MB after": round(after.peakRssMb),
      });
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  console.log(`Local benchmark on ${os.cpus().length} CPUs (${os.cpus()[0]?.model ?? "unknown"}); segment ${SEGMENT_SECONDS}s.`);
  console.table(rows);
}

main();
