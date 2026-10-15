/**
 * Retention rules for AI Note audio processing data.
 *
 * What is stored per note (prisma/schema.prisma):
 * - AiNoteChunk: raw uploaded/recorded audio bytes.
 * - AiNoteTranscript: per-segment ASR text.
 * - AiNoteSummaryPart: per-segment LLM evidence ledgers.
 * - AiNoteJob: stage/progress and the finished note (noteMarkdown).
 *
 * Applied today (inline, no schedule):
 * - Completed notes: audio, transcripts, and summary parts are deleted when the
 *   note completes (finalize merge stage). The finished note is kept so a
 *   `?resumeNoteId=` link can still show it.
 * - A user cancelling an upload deletes the session and everything under it.
 *
 * PROPOSED, NOT SCHEDULED: abandoned and stalled sessions. Their periods below
 * are proposals that need product/owner approval before any job deletes
 * existing data. `classifyAiNoteRetention` only decides eligibility; it
 * deletes nothing.
 */

export const AI_NOTE_RETENTION_PROPOSAL = {
  /** A session that never reached finalize (closed tab, failed upload). */
  abandonedSessionHours: 24,
  /** A job that stopped before completing. Long enough to allow "retry from finalizing". */
  stalledJobDays: 7,
} as const;

export type AiNoteRetentionInput = {
  sessionCreatedAt: Date;
  /** Most recent chunk upload, so a long recording that is still uploading is not "abandoned". */
  lastChunkAt?: Date | null;
  job: { stage: string; updatedAt: Date } | null;
};

export type AiNoteRetentionState = "completed" | "in_progress" | "abandoned" | "stalled";

export type AiNoteRetentionDecision = {
  state: AiNoteRetentionState;
  /** Audio, transcripts, and summary parts may be deleted. The finished note is never included. */
  processingDataEligible: boolean;
  /** When processing data becomes eligible under the proposal (null when not time-based). */
  eligibleAt: Date | null;
};

const HOUR_MS = 60 * 60 * 1000;

export function classifyAiNoteRetention(
  input: AiNoteRetentionInput,
  now: Date = new Date(),
  policy: { abandonedSessionHours: number; stalledJobDays: number } = AI_NOTE_RETENTION_PROPOSAL
): AiNoteRetentionDecision {
  if (input.job?.stage === "done") {
    return { state: "completed", processingDataEligible: true, eligibleAt: null };
  }

  if (!input.job) {
    const lastActivity = Math.max(input.sessionCreatedAt.getTime(), input.lastChunkAt?.getTime() ?? 0);
    const eligibleAt = new Date(lastActivity + policy.abandonedSessionHours * HOUR_MS);
    return now >= eligibleAt
      ? { state: "abandoned", processingDataEligible: true, eligibleAt }
      : { state: "in_progress", processingDataEligible: false, eligibleAt };
  }

  const eligibleAt = new Date(input.job.updatedAt.getTime() + policy.stalledJobDays * 24 * HOUR_MS);
  return now >= eligibleAt
    ? { state: "stalled", processingDataEligible: true, eligibleAt }
    : { state: "in_progress", processingDataEligible: false, eligibleAt };
}
