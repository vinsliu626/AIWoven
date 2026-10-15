# ASR rework, timeout budgets, and transcript-length limits

**Status:** 2026-10-15. **Sections 1 and 2 are now implemented** on this branch (see "Implemented" below each). Section 3 is unchanged: no plan limit has changed.
**Follows:** findings F-03, F-06, and F-07 in `docs/audits/audio-to-notes-audit.md`.

Labels: **MEASURED** (local run in this container), **FACT** (code), **ESTIMATE** (arithmetic from stated assumptions).

## 1. Repeated full-audio conversion (F-06)

### Evidence

**FACT:** every call to the `asr` stage of `app/api/ai-note/finalize/route.ts` does all of the following, then transcribes one 180 s segment (`AI_NOTE_ASR_BATCH` defaults to 1):
1. Loads every chunk from Postgres.
2. Rewrites the whole source file.
3. Hashes it.
4. Probes it.
5. Transcodes the whole file to 16 kHz WAV.
6. Splits the whole WAV into segments.

**MEASURED:** synthetic 60-minute files, local 4-core container, warm disk cache, no network. Serverless CPUs will be slower; the ratio is what matters.

| Step | WebM/Opus (live-muxed, no seek index, like MediaRecorder) | MP3 |
|---|---|---|
| Full transcode to 16 kHz WAV | 7.25 s | 4.58 s |
| Split WAV into 180 s segments | 1.36 s | 1.40 s |
| **Current work per ASR call** | **≈ 8.6 s, 230 MB written to /tmp** | **≈ 6.0 s, 230 MB** |
| Decode only the needed segment (`-ss <start> -t 180` before `-i`), worst case = last segment | 0.43 s, 5.8 MB | 0.32 s, 5.8 MB |
| Duration by stream-copy scan (`-c copy -f null`), once per job | 1.62 s | 1.42 s |

**MEASURED, equivalence:** segment 10 decoded directly matched segment 10 from the current transcode-and-split path on 99.99% (WebM) and 99.97% (MP3) of samples (±64 tolerance). The best alignment offset was 8 ms (WebM) and 0 ms (MP3).

**ESTIMATE:** a 60-minute recording has 20 ASR calls.
- Current conversion work: ≈ 20 × 8.6 s ≈ 172 s, plus 20 × 230 MB of /tmp writes.
- With per-segment decoding: ≈ 1.6 s + 20 × 0.43 s ≈ 10 s.
- **Not measured:** the repeated read of every chunk from Postgres, about 20 × the file size per job. It remains after this fix.

### Proposed minimal fix (not implemented)

- In the `asr` stage, determine the duration once. The verified duration is already stored in `AiNoteJob.secondsBilled`. Set `segmentsTotal = ceil(duration / segTime)`.
- Then decode only segment `i` with `ffmpeg -ss i*segTime -t segTime -i source …`, and stop writing `full.wav` and every `seg-*.wav`.
- Keep the SHA-256 and probe validation, but only on the first ASR call.
- **Scope:** one stage of one file; same stepper; no schema or storage change.
- **Risks:**
  - Segment boundaries can shift by a few milliseconds (measured 8 ms for WebM).
  - Very long WebM files without a seek index make ffmpeg scan from the start on every call. That scan was still fast in the measurement (0.43 s at minute 57).
- **Follow-up, a larger change:** store decoded segments (object storage or rows) so each call stops reading the whole recording from Postgres.

### Implemented (commits `f7e6096`, `029ab38`)

`lib/aiNote/audioSegments.ts`, used by the `asr` stage of `finalize/route.ts`:
- **First ASR step:** one streaming decode, with no file written, counts the samples. That gives the segment count and the verified duration.
- **Every step:** decodes only its own segment, then deletes the segment file.
- **Seeking:**
  - Demuxer seek with 1 s of pre-roll for PCM, FLAC, MP3, Ogg/Opus and WebM/Opus.
  - Decode from the start for AAC (MP4/M4A/ADTS) and unknown codecs. For these, demuxer seeking was measured to give wrong audio.
  - The first-decoded-sample offset (for example the 7 ms WebM/Opus pre-skip) keeps segments on the same timeline as a full decode.

**Accuracy** (`tests/note/audio-segments.test.ts`, 8 formats plus a real Chromium MediaRecorder recording):
- Each new segment matches the full decode, and therefore the old pipeline's output.
- The match is sample-exact, except WebM, which is within 1 ms: WebM block timestamps have millisecond precision.
- Segment counts are equal, and the segments together cover the whole recording. No audio is lost or duplicated at a boundary beyond that 1 ms WebM tolerance.

**Measured** with `scripts/bench-ai-note-segments.ts`: idle 4-CPU container, synthetic audio, ffmpeg-static, 180 s segments.

| Input | Steps | CPU s/job before → after | Wall s/job before → after | Peak /tmp MB before → after | Peak ffmpeg RSS MB before → after |
|---|---|---|---|---|---|
| 15 min WebM/Opus | 5 | 19.3 → 7.0 | 15.8 → 4.6 | 57.6 → 5.8 | 14.8 → 15.1 |
| 60 min WebM/Opus | 20 | 323.4 → 29.5 | 156.6 → 15.0 | 230.4 → 5.8 | 14.9 → 15.2 |
| 120 min WebM/Opus | 40 | 1326.4 → 61.2 | 649.3 → 32.0 | 460.8 → 5.8 | 14.9 → 15.1 |
| 60 min MP3 | 20 | 229.6 → 19.0 | 99.7 → 8.5 | 230.4 → 5.8 | 14.7 → 15.1 |
| 60 min M4A/AAC | 20 | 213.4 → 81.8 | 90.4 → 49.6 | 230.4 → 5.8 | 18.4 → 19.6 |

The longest single step is about the same before and after, because the first step's sample count is still one full decode: 16.2 s → 15.2 s of wall time at 120 min. AAC gains least, because its steps still decode from the start.

**Not measured:** reading every chunk from Postgres on each step is unchanged.

## 2. Timeout and retry budgets (F-07)

### Evidence (FACT, defaults)

| Setting | Value | Where |
|---|---|---|
| Function limit | `maxDuration = 300` s | `finalize/route.ts` |
| ASR per attempt | `AI_NOTE_ASR_TIMEOUT_MS` = 180 s, up to `AI_NOTE_ASR_MAX_TRIES` = 4, external then Groq | `transcribeWithFallback`, `withRetry` |
| LLM per stage call | outer `withTimeout` 180 s around `runAiNotePipeline`; inside it, Groq 60 s then up to 3 OpenRouter models at 60 s each | `finalize/route.ts`, `providerRouter.ts`, `lib/ai/groq.ts` |
| Merge | one 180 s outer timeout around up to 3 sequential LLM calls (draft, audit, repair) | `runAiNotePipeline` |
| Lease lock | TTL 60 s, refreshed only between segments | `acquireJobLock` / `refreshJobLock` |
| Cancellation | `withTimeout` only races a timer: the `fetch` (no `AbortSignal`) and ffmpeg keep running | `finalize/route.ts` |
| Client | retries only 202 / `LOCKED`; every other non-2xx is final | `useNoteController.ts` |

**ESTIMATE, worst case for one ASR segment:**
- External ASR: 4 × 180 s plus ~3.5 s of backoff ≈ 724 s.
- Groq fallback: another 4 × 180 s.
- Total ≈ 1,444 s, about 4.8 × the 300 s function limit.

**ESTIMATE, worst case for one LLM call chain:** 60 + 3 × 60 = 240 s. That exceeds the 180 s outer timeout, which fires while the requests continue in the background.

A 180 s ASR call also outlives the 60 s lock lease, so a second request (for example a user retry) can take the lock while the first is still working.

### Proposed minimal fixes (not implemented)

1. **Per-request deadline.**
   - Set `deadline = start + 300 s − 20 s margin`.
   - Derive each attempt's timeout with the existing `computeAttemptTimeoutMs` in `lib/ai/retryBudget.ts`, which the detector route already uses.
   - Stop retrying when the budget runs out and return `503` with `retryable: true`. Progress is already saved per segment.
2. **Real cancellation.** Pass an `AbortSignal` into `transcribeAudioToText`, `callGroqTranscribe`, and the LLM calls, and kill ffmpeg when its timeout fires.
3. **Lock.** Refresh the lease on an interval while a provider call is in flight, or set the TTL above the per-request deadline (≈ 280 s).
4. **Client.** Retry `502`/`503`/`504` up to about 3 times with backoff. The stepper is idempotent: completed segments are skipped.
5. **LLM pause.** Replace the fixed 15 s sleep after each segment with a sleep only after a 429, honouring `retryAfterMs`.

Fixes 1, 2, and 4 are small and local. Fix 3 is one helper. None changes the architecture, models, or prompts.

### Implemented (commit `1352b55`)

- **Per-request time budget.** `lib/ai/requestBudget.ts` sets a deadline for each request (`AI_NOTE_REQUEST_BUDGET_MS`, default 270 s, capped at 285 s, inside `maxDuration = 300`). `retryWithBudget` provides:
  - bounded attempts;
  - backoff of 1/2/4 s (capped at 8 s), plus jitter;
  - a timeout per attempt;
  - no attempt starts without `minAttemptMs` remaining (ASR 30 s, LLM 15 s).
- **Real cancellation.** `AbortSignal` is passed to the external ASR, Groq ASR and chat, and OpenRouter calls. ffmpeg is spawned with that signal and `killSignal: SIGKILL`.
- **Fewer paid calls.**
  - Groq ASR runs only after the external ASR fails, and at most `AI_NOTE_ASR_FALLBACK_MAX_TRIES` times (default 2).
  - The LLM router never starts a fallback call once the budget can't fit one.
  - The fixed 15 s pause after each segment is skipped when it would eat into the budget.
- **No duplicate processing.** A heartbeat refreshes the lease lock while a step runs, so a long provider call can't outlive the lease.
- **Recoverability.** A request that runs out of time returns `503 PROCESSING_TIME_BUDGET` (`retryable: true`). Completed segments and parts stay saved, and the job is never marked failed.
- **Client.** The finalize loop retries network errors and retryable 502/503/504 responses up to 3 times in a row, after 2 s, 4 s and 8 s (`components/workspace/note/finalizeRetry.ts`).

## 3. Transcript-length limits vs subscription entitlements (F-03)

### What users are entitled to (FACT, `lib/plans/productLimits.ts`; shown in `UsageCards` and `PlanModal`)

| Plan | Weekly AI Note audio | Notes per day | Per-note transcript limit (`note.maxInputChars`) |
|---|---|---|---|
| Basic | 2 h | 3 | 12,000 characters |
| Pro | 30 h | 12 | 30,000 characters |
| Ultra | Unlimited | 30 | 60,000, but Ultra is `unlimited`, so it is not enforced |

**FACT:** for audio, the character limit is checked in the `llm` stage, after transcription (`assertNoteRequestAllowed` with the transcript length). The P0 iteration moved the daily limit, the cooldown, and the weekly duration quota before transcription, but not this check, because it needs a product decision.

**ESTIMATE, English speech** (130–160 words/min, ~6 characters/word, so ≈ 780–960 characters/min):

| Plan | Longest audio note before rejection | Compared with the weekly allowance |
|---|---|---|
| Basic | ≈ 13–15 min | 2 h/week, but one normal lecture cannot be used |
| Pro | ≈ 31–38 min | 30 h/week, but a 50–90 min lecture is rejected after it has been transcribed |

For Chinese, characters per minute are much lower, so the same limits allow far longer recordings. That means the limit treats languages unequally.

**Measure the real rate before deciding.** This is a read-only query on a database that still keeps transcripts; current `main` does. Note that this branch deletes transcripts when a note completes:
```sql
SELECT round(sum(length(t."canonicalText"))::numeric / nullif(sum(j."secondsBilled"), 0) * 60) AS chars_per_minute
FROM "AiNoteTranscript" t JOIN "AiNoteJob" j ON j."noteId" = t."noteId"
WHERE j.stage = 'done' AND j."secondsBilled" > 0;
```
`secondsBilled` from before this branch is wall-clock based, so treat the result as approximate.

### Options (owner decision; nothing changed)

| Option | What it means | Trade-off |
|---|---|---|
| A. Per-plan **minutes** per audio note, checked before transcription using the verified duration (for example Basic 20 min, Pro 120 min), with no character limit for audio | Predictable, language-neutral, rejected before any cost | Needs new numbers per plan |
| B. Remove the character limit for audio notes, relying on the weekly-hours quota | Simplest, and matches what the UI advertises | Longer LLM runs per note (cost); the output cap (F-13) limits coverage anyway |
| C. Keep characters, but estimate before transcription (duration × measured characters/min) and reject early | No product change | Estimates are wrong for some speakers and languages; still rejects normal lectures on Basic and Pro |

**Recommendation:** A, using the measured characters per minute to choose the numbers, and keep character limits for the pasted-text tab only.
