import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  audioProbeArgs,
  countDecodedSamples,
  parseAudioProbe,
  samplesToSeconds,
  seekStrategyFor,
  segmentCount,
  segmentExtractArgs,
  type AudioProbe,
} from "@/lib/aiNote/audioSegments";

const ffmpeg = path.resolve(__dirname, "../../node_modules/ffmpeg-static/ffmpeg");
const hasFfmpeg = fs.existsSync(ffmpeg);
const SEGMENT_SECONDS = 2;

function ff(args: string[]) {
  const result = spawnSync(ffmpeg, args, { maxBuffer: 256 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`ffmpeg ${args.join(" ")}\n${result.stderr}`);
  return result;
}

const toSamples = (buffer: Buffer) => new Int16Array(buffer.buffer, buffer.byteOffset, Math.floor(buffer.byteLength / 2));
function wavSamples(file: string) {
  const bytes = fs.readFileSync(file);
  const data = bytes.indexOf("data", 12, "ascii");
  return toSamples(bytes.subarray(data + 8, data + 8 + bytes.readUInt32LE(data + 4)));
}

/** Reference: decode the whole file at the ASR rate (what the old pipeline transcoded to full.wav). */
const fullDecode = (file: string) => toSamples(ff(["-loglevel", "error", "-nostdin", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-f", "s16le", "pipe:1"]).stdout);

function probe(file: string): AudioProbe {
  return parseAudioProbe(String(spawnSync(ffmpeg, audioProbeArgs(file)).stderr));
}

/** The previous ASR-stage pipeline: full transcode to WAV, then split with the segment muxer. */
function oldPipelineSegments(file: string, dir: string) {
  const full = path.join(dir, "full.wav");
  ff(["-y", "-hide_banner", "-loglevel", "error", "-i", file, "-vn", "-sn", "-dn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", full]);
  ff(["-y", "-hide_banner", "-loglevel", "error", "-i", full, "-f", "segment", "-segment_time", String(SEGMENT_SECONDS), "-reset_timestamps", "1", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", path.join(dir, "old-%03d.wav")]);
  return fs.readdirSync(dir).filter((name) => name.startsWith("old-")).sort().map((name) => wavSamples(path.join(dir, name)));
}

function newPipelineSegments(file: string, dir: string, totalSamples: number) {
  const info = probe(file);
  return Array.from({ length: segmentCount(totalSamples, SEGMENT_SECONDS) }, (_, index) => {
    const output = path.join(dir, `new-${index}.wav`);
    ff(segmentExtractArgs({ source: file, output, index, segmentSeconds: SEGMENT_SECONDS, probe: info }));
    return wavSamples(output);
  });
}

function concat(parts: Int16Array[]) {
  const out = new Int16Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/** Largest sample difference (as % of peak) after shifting `part` by up to ±maxShift samples. */
function bestAlignment(reference: Int16Array, part: Int16Array, start: number, maxShift: number) {
  let peak = 1;
  for (const value of reference) peak = Math.max(peak, Math.abs(value));
  let best = { shift: 0, maxErrorPct: Infinity };
  for (let shift = -maxShift; shift <= maxShift; shift += 1) {
    let worst = 0;
    const length = Math.min(part.length, reference.length - (start + shift));
    for (let i = 0; i < length; i += 1) worst = Math.max(worst, Math.abs(part[i] - reference[start + shift + i]));
    const pct = (worst / peak) * 100;
    if (pct < best.maxErrorPct) best = { shift, maxErrorPct: pct };
  }
  return best;
}

let dir = "";
const formats: Record<string, string[]> = {
  "wav (44.1 kHz)": ["-ar", "44100", "rec.wav"],
  flac: ["-c:a", "flac", "rec.flac"],
  "mp3 (CBR)": ["-c:a", "libmp3lame", "-b:a", "64k", "cbr.mp3"],
  "mp3 (VBR)": ["-c:a", "libmp3lame", "-q:a", "5", "vbr.mp3"],
  "ogg/opus": ["-c:a", "libopus", "-b:a", "48k", "rec.ogg"],
  "webm/opus, live (no seek index, like MediaRecorder)": ["-c:a", "libopus", "-b:a", "48k", "-live", "1", "-f", "webm", "rec.webm"],
  "m4a/aac": ["-c:a", "aac", "-b:a", "64k", "rec.m4a"],
  "aac (ADTS)": ["-c:a", "aac", "-b:a", "64k", "rec.aac"],
};

beforeAll(() => {
  if (!hasFfmpeg) return;
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-note-segments-"));
  // 7.3 s of amplitude-modulated noise plus a tone: every boundary falls inside signal.
  ff(["-loglevel", "error", "-y", "-f", "lavfi", "-i", "anoisesrc=r=48000:a=0.3:d=7.3,volume='0.5+0.5*sin(2*PI*3*t)':eval=frame", "-f", "lavfi", "-i", "sine=f=220:r=48000:d=7.3", "-filter_complex", "amix=inputs=2", "-ac", "1", path.join(dir, "src.wav")]);
  for (const args of Object.values(formats)) {
    ff(["-loglevel", "error", "-y", "-i", path.join(dir, "src.wav"), ...args.slice(0, -1), path.join(dir, args.at(-1)!)]);
  }
  fs.copyFileSync(path.resolve(__dirname, "../fixtures/audio/chromium-mediarecorder-250ms.webm"), path.join(dir, "mediarecorder.webm"));
});

afterAll(() => {
  if (dir) fs.rmSync(dir, { recursive: true, force: true });
});

describe("audio probe and strategy", () => {
  it("parses codec and first-sample time (WebM/Opus pre-skip puts the first sample at 7 ms)", () => {
    const parsed = parseAudioProbe(
      "  Duration: N/A, start: -0.007000, bitrate: N/A\n  Stream #0:0: Audio: opus, 48000 Hz, mono, fltp\n" +
        "[Parsed_ashowinfo_0 @ 0x1] n:0 pts:336 pts_time:0.007 fmt:fltp channels:1 chlayout:mono rate:48000 nb_samples:648 checksum:1"
    );
    expect(parsed).toEqual({ codec: "opus", firstSampleSeconds: 0.007, durationText: "N/A" });
    expect(parseAudioProbe("Stream #0:0[0x1](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz").codec).toBe("aac");
  });

  it("uses demuxer seeking only for codecs verified sample-exact", () => {
    for (const codec of ["pcm_s16le", "flac", "mp3", "mp3float", "opus"]) expect(seekStrategyFor(codec)).toBe("input-seek");
    for (const codec of ["aac", "vorbis", "unknown", "alac"]) expect(seekStrategyFor(codec)).toBe("decode-from-start");
  });

  it("derives segment count and billed seconds from decoded samples", () => {
    expect(segmentCount(16_000 * 360, 180)).toBe(2);
    expect(segmentCount(16_000 * 360 + 1, 180)).toBe(3);
    expect(segmentCount(0, 180)).toBe(1);
    expect(samplesToSeconds(16_000 * 13)).toBe(13);
    expect(samplesToSeconds(16_000 * 13 + 1)).toBe(14);
  });
});

describe.skipIf(!hasFfmpeg)("per-segment extraction matches the full decode (no audio lost or duplicated at boundaries)", () => {
  const cases = [...Object.entries(formats).map(([name, args]) => [name, args.at(-1)!] as const), ["real Chromium MediaRecorder recording", "mediarecorder.webm"] as const];

  for (const [name, file] of cases) {
    it(name, async () => {
      const source = path.join(dir, file);
      const work = fs.mkdtempSync(path.join(dir, "case-"));
      const full = fullDecode(source);
      const total = await countDecodedSamples(ffmpeg, source);
      expect(total).toBe(full.length);

      const oldSegments = oldPipelineSegments(source, work);
      const newSegments = newPipelineSegments(source, work, total);
      const isWebm = file.endsWith(".webm");
      // WebM block timestamps are in whole milliseconds: allow 1 ms (16 samples) of alignment.
      const tolerance = isWebm ? 16 : 0;

      // Old pipeline is the reference: it is a lossless split of the full decode.
      expect(concat(oldSegments).length).toBe(full.length);
      // Same number of segments, contiguous, covering the whole recording.
      expect(newSegments.length).toBe(segmentCount(full.length, SEGMENT_SECONDS));
      expect(Math.abs(concat(newSegments).length - full.length)).toBeLessThanOrEqual(tolerance * newSegments.length);

      newSegments.forEach((segment, index) => {
        const start = index * SEGMENT_SECONDS * 16_000;
        if (index < newSegments.length - 1) expect(segment.length, `segment ${index} length`).toBe(SEGMENT_SECONDS * 16_000);
        const alignment = bestAlignment(full, segment, start, Math.max(tolerance, 0));
        expect(Math.abs(alignment.shift), `segment ${index} offset`).toBeLessThanOrEqual(tolerance);
        expect(alignment.maxErrorPct, `segment ${index} max sample error`).toBeLessThan(0.5);
      });

      fs.rmSync(work, { recursive: true, force: true });
    }, 30_000);
  }
});
