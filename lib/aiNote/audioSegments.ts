import { spawn } from "node:child_process";

/**
 * Per-segment audio extraction for the AI Note ASR stage.
 *
 * The ASR stage transcribes one fixed-length segment per request. Instead of
 * decoding the whole recording to WAV and splitting it on every request, each
 * request decodes only the segment it needs. Segment i covers decoded-audio time
 * [i*T, (i+1)*T), the same timeline a full decode produces, so concatenating every
 * segment reproduces the full decode.
 *
 * Two extraction strategies, chosen per codec (verified against a full decode,
 * see tests/note/audio-segments.test.ts):
 * - "input-seek": seek the demuxer to ~1 s before the segment, decode that pre-roll
 *   so the decoder and resampler are warmed up, then trim exactly at the segment
 *   start. Cost is proportional to the segment, not the recording. Sample-exact for
 *   PCM, FLAC, MP3 and Ogg/Opus; WebM/Opus is within 1 ms because WebM block
 *   timestamps have millisecond precision.
 * - "decode-from-start": decode from the beginning and discard audio before the
 *   segment start. Exact for every codec; used where demuxer seeking is not
 *   reliable (AAC in MP4/M4A/ADTS) and for anything unrecognised. Still writes only
 *   the one segment, never the whole recording.
 */

export const ASR_SAMPLE_RATE = 16_000;
const PCM_BYTES_PER_SAMPLE = 2;
const PRE_ROLL_SECONDS = 1;

/** Codecs whose demuxer seek + pre-roll was verified sample-exact (WebM/Opus within 1 ms). */
const INPUT_SEEK_CODECS = /^(pcm_[a-z0-9_]+|flac|mp3|mp3float|opus)$/;

export type SeekStrategy = "input-seek" | "decode-from-start";

export type AudioProbe = {
  codec: string;
  /** Time of the first decoded sample on ffmpeg's output timeline (e.g. 0.007 s for WebM/Opus pre-skip). */
  firstSampleSeconds: number;
  /** Container-reported duration line, for logs only ("N/A" for live WebM). */
  durationText: string;
};

const ASR_OUTPUT_ARGS = ["-vn", "-sn", "-dn", "-ac", "1", "-ar", String(ASR_SAMPLE_RATE)];

const seconds = (value: number) => Math.max(0, value).toFixed(6);

/** Decodes the first 100 ms with ashowinfo: validates the stream and reports codec and first-sample time. */
export function audioProbeArgs(source: string) {
  return ["-hide_banner", "-nostdin", "-i", source, "-map", "0:a:0", "-t", "0.1", "-af", "ashowinfo", "-f", "null", "-"];
}

export function parseAudioProbe(stderr: string): AudioProbe {
  const codec = stderr.match(/Stream #\d+:\d+[^:]*: Audio: ([a-z0-9_]+)/i)?.[1]?.toLowerCase() ?? "unknown";
  const durationText = stderr.match(/Duration:\s*([^,\r\n]+)/i)?.[1]?.trim() ?? "unknown";
  const first = stderr.match(/n:0 pts:(-?\d+) pts_time:(-?[\d.]+)[^\r\n]*?rate:(\d+)/);
  let firstSampleSeconds = 0;
  if (first) {
    const [, pts, ptsTime, rate] = first;
    // pts is in 1/rate units for audio filters; pts_time is rounded in the log.
    firstSampleSeconds = Number(rate) > 0 ? Number(pts) / Number(rate) : Number(ptsTime);
  }
  return { codec, firstSampleSeconds: Number.isFinite(firstSampleSeconds) ? Math.max(0, firstSampleSeconds) : 0, durationText };
}

export function seekStrategyFor(codec: string): SeekStrategy {
  return INPUT_SEEK_CODECS.test(codec) ? "input-seek" : "decode-from-start";
}

/** Full decode to raw 16 kHz mono PCM on stdout, used once per job to count samples. */
export function decodedPcmArgs(source: string) {
  return ["-hide_banner", "-nostdin", "-loglevel", "error", "-i", source, ...ASR_OUTPUT_ARGS, "-f", "s16le", "pipe:1"];
}

export function segmentCount(totalSamples: number, segmentSeconds: number) {
  return Math.max(1, Math.ceil(totalSamples / (segmentSeconds * ASR_SAMPLE_RATE)));
}

export function samplesToSeconds(totalSamples: number) {
  return Math.max(1, Math.ceil(totalSamples / ASR_SAMPLE_RATE));
}

/** ffmpeg arguments that write segment `index` as 16 kHz mono 16-bit WAV to `output`. */
export function segmentExtractArgs(input: { source: string; output: string; index: number; segmentSeconds: number; probe: AudioProbe }) {
  const { source, output, index, segmentSeconds, probe } = input;
  const start = probe.firstSampleSeconds + index * segmentSeconds;
  const encode = [...ASR_OUTPUT_ARGS, "-c:a", "pcm_s16le", output];
  const head = ["-y", "-hide_banner", "-nostdin", "-loglevel", "error"];

  if (index === 0 || seekStrategyFor(probe.codec) === "decode-from-start") {
    return [...head, "-i", source, "-ss", seconds(start), "-t", String(segmentSeconds), ...encode];
  }
  const preRoll = Math.min(PRE_ROLL_SECONDS, start);
  return [...head, "-ss", seconds(start - preRoll), "-i", source, "-ss", seconds(preRoll), "-t", String(segmentSeconds), ...encode];
}

/** Decodes the whole recording once, streaming, and returns the number of 16 kHz samples (no file is written). */
export function countDecodedSamples(ffmpegBin: string, source: string, options: { signal?: AbortSignal } = {}) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(ffmpegBin, decodedPcmArgs(source), { stdio: ["ignore", "pipe", "pipe"], signal: options.signal, killSignal: "SIGKILL" });
    let bytes = 0;
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => (bytes += chunk.length));
    child.stderr.on("data", (chunk: Buffer) => (stderr = (stderr + chunk.toString()).slice(-4000)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(Math.floor(bytes / PCM_BYTES_PER_SAMPLE));
      else reject(new Error(`ffmpeg decode failed (${code}): ${stderr}`));
    });
  });
}
