import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { computeRms, createRecordingChunkBatcher, type RecordingBatch } from "@/components/workspace/note/audioVad";

const S = false; // silent slice
const V = true; // voiced slice

const CONFIG = { sliceMs: 250, silenceMs: 650, maxBatchMs: 30_000 };

/** Feeds a speech/silence pattern through the batcher exactly as the recorder does, then stops. */
function runBatcher<T>(values: T[], speech: boolean[], config = CONFIG) {
  const batcher = createRecordingChunkBatcher<T>(config);
  const batches: RecordingBatch<T>[] = [];
  values.forEach((value, index) => {
    const batch = batcher.push({ value, hasSpeech: speech[index] ?? false });
    if (batch) batches.push(batch);
  });
  const last = batcher.flush();
  if (last) batches.push(last);
  return batches;
}

function pattern(...runs: Array<[boolean, number]>) {
  return runs.flatMap(([voiced, count]) => Array.from({ length: count }, () => voiced));
}

const PATTERNS: Record<string, boolean[]> = {
  "starts with silence": pattern([S, 6], [V, 8]),
  "continuous speech": pattern([V, 14]),
  "silence only": pattern([S, 14]),
  "alternating speech and silence": pattern([V, 2], [S, 3], [V, 2], [S, 3], [V, 2], [S, 2]),
  "speech then a long pause": pattern([V, 3], [S, 11]),
};

describe("computeRms", () => {
  it("computes RMS energy", () => {
    expect(computeRms(new Float32Array([0, 0, 0, 0]))).toBe(0);
    expect(computeRms(new Float32Array([1, -1, 1, -1]))).toBe(1);
  });
});

describe("recording chunk batcher", () => {
  for (const [name, speech] of Object.entries(PATTERNS)) {
    it(`uploads every slice exactly once and in order: ${name}`, () => {
      const values = speech.map((_, index) => `slice-${index}`);
      const batches = runBatcher(values, speech);

      expect(batches.flatMap((batch) => batch.slices)).toEqual(values);
      expect(batches.map((batch) => batch.sequenceIndex)).toEqual(batches.map((_, index) => index));
      expect(batches[0]?.slices[0]).toBe("slice-0");
    });
  }

  it("keeps the first slice (container header) when the recording starts silent", () => {
    const batches = runBatcher(["header", "s1", "s2", "v0"], [S, S, S, V]);
    expect(batches[0].slices[0]).toBe("header");
  });

  it("ends a batch at a pause after speech so uploads stream during the recording", () => {
    // 650 ms of silence at 250 ms slices = 3 silent slices.
    const batches = runBatcher(["v0", "v1", "s0", "s1", "s2", "v2"], [V, V, S, S, S, V]);
    expect(batches.map((batch) => batch.slices)).toEqual([["v0", "v1", "s0", "s1", "s2"], ["v2"]]);
  });

  it("bounds memory: a batch never exceeds the configured maximum", () => {
    const config = { sliceMs: 250, silenceMs: 650, maxBatchMs: 1_000 }; // 4 slices
    for (const speech of [pattern([S, 13]), pattern([V, 13])]) {
      const values = speech.map((_, index) => index);
      const batches = runBatcher(values, speech, config);
      expect(batches.every((batch) => batch.sliceCount <= 4)).toBe(true);
      expect(batches.flatMap((batch) => batch.slices)).toEqual(values);
    }
  });

  it("returns nothing on flush when no slices were recorded", () => {
    expect(createRecordingChunkBatcher<string>(CONFIG).flush()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Decode regression: real MediaRecorder output reassembled the way
// /api/ai-note/finalize does it (chunks concatenated by sequence index).
// ---------------------------------------------------------------------------

const fixtureDir = path.resolve(__dirname, "../fixtures/audio");
const fixtureWebm = fs.readFileSync(path.join(fixtureDir, "chromium-mediarecorder-250ms.webm"));
const fixtureMeta = JSON.parse(fs.readFileSync(path.join(fixtureDir, "chromium-mediarecorder-250ms.slices.json"), "utf8")) as {
  sliceSizes: number[];
};
const ffmpegBin = [path.resolve(__dirname, "../../node_modules/ffmpeg-static/ffmpeg")].find((candidate) => fs.existsSync(candidate));

function fixtureSlices() {
  const slices: Buffer[] = [];
  let offset = 0;
  for (const size of fixtureMeta.sliceSizes) {
    slices.push(fixtureWebm.subarray(offset, offset + size));
    offset += size;
  }
  expect(offset).toBe(fixtureWebm.length);
  return slices;
}

/** Decodes to 16 kHz mono PCM, like the ASR stage, and returns seconds of decoded audio. */
function decodedSeconds(bytes: Buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-note-vad-"));
  try {
    const source = path.join(dir, "recording.webm");
    fs.writeFileSync(source, bytes);
    const result = spawnSync(ffmpegBin!, ["-hide_banner", "-loglevel", "error", "-i", source, "-ac", "1", "-ar", "16000", "-f", "s16le", "pipe:1"], {
      maxBuffer: 64 * 1024 * 1024,
    });
    return { ok: result.status === 0, seconds: result.stdout.length / (16_000 * 2), stderr: String(result.stderr) };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe.skipIf(!ffmpegBin)("recorded audio stays decodable after batching", () => {
  const full = decodedSeconds(fixtureWebm);

  it("decodes the untouched fixture (control)", () => {
    expect(full.ok).toBe(true);
    expect(full.seconds).toBeGreaterThan(3.5);
  });

  it("is undecodable when the first slice is dropped (the original bug)", () => {
    const withoutHeader = Buffer.concat(fixtureSlices().slice(1));
    const result = decodedSeconds(withoutHeader);
    expect(result.ok).toBe(false);
    expect(result.stderr).toMatch(/EBML header|Invalid data/i);
  });

  for (const [name, speechRuns] of Object.entries({
    "starts with silence": pattern([S, 6], [V, 8]),
    "continuous speech": pattern([V, 14]),
    "alternating speech and silence": pattern([V, 2], [S, 3], [V, 2], [S, 3], [V, 2], [S, 2]),
  })) {
    it(`reassembles a byte-identical, fully decodable recording: ${name}`, () => {
      const batches = runBatcher(fixtureSlices(), speechRuns);
      const uploaded = Buffer.concat(batches.map((batch) => Buffer.concat(batch.slices)));

      expect(uploaded.equals(fixtureWebm)).toBe(true);
      const result = decodedSeconds(uploaded);
      expect(result.ok).toBe(true);
      expect(result.seconds).toBeCloseTo(full.seconds, 2);
    });
  }
});
