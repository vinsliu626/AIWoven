/** Consecutive transient failures tolerated before the error is shown to the user. */
export const FINALIZE_MAX_CONSECUTIVE_RETRIES = 3;

type FinalizePayload = { error?: unknown; retryable?: unknown; retryAfterMs?: unknown; extra?: { retryAfterMs?: unknown } } | null | undefined;

/**
 * Decides whether the finalize polling loop should retry a failed step on its own.
 *
 * Each finalize request advances one step and saves its result, so repeating a
 * request never repeats completed work. Retried automatically:
 * - 202 / LOCKED: another request holds the job lease (not a failure).
 * - network errors (status null) and 502/503/504 that the server did not mark as
 *   non-retryable, including PROCESSING_TIME_BUDGET (the request ran out of time).
 * Transient failures are limited to FINALIZE_MAX_CONSECUTIVE_RETRIES in a row, with
 * growing delays (2 s, 4 s, 8 s, capped at 10 s, or the server's retryAfterMs if longer).
 *
 * Returns the delay before retrying, or null to stop and show the error.
 */
export function finalizeRetryDelayMs(input: { status: number | null; payload: FinalizePayload; consecutiveFailures: number }) {
  const { status, payload, consecutiveFailures } = input;
  const serverDelay = Number(payload?.retryAfterMs) || Number(payload?.extra?.retryAfterMs) || 0;

  if (status === 202 || payload?.error === "LOCKED") return serverDelay || 1_500;

  const transient = status === null || status === 502 || status === 503 || status === 504;
  if (!transient || payload?.retryable === false) return null;
  if (consecutiveFailures >= FINALIZE_MAX_CONSECUTIVE_RETRIES) return null;
  return Math.max(serverDelay, Math.min(10_000, 2_000 * 2 ** consecutiveFailures));
}
