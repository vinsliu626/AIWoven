/**
 * A wall-clock budget for one serverless request, plus bounded, cancellable retries.
 *
 * Every provider call made under a budget gets an AbortSignal that fires at the
 * earlier of its own attempt timeout and the request deadline, so a timed-out call
 * is actually cancelled (fetch is aborted, ffmpeg is killed) instead of running on
 * after the response. No attempt starts unless it can get at least `minAttemptMs`,
 * which keeps the request inside the platform limit (Vercel `maxDuration`) and
 * avoids paying for calls whose results would be thrown away.
 */

export class TimeBudgetExceededError extends Error {
  readonly code = "TIME_BUDGET_EXHAUSTED";
  readonly retryable = true;

  constructor(
    readonly label: string,
    readonly lastError?: unknown
  ) {
    super(`TIME_BUDGET_EXHAUSTED: not enough time left for ${label}`);
    this.name = "TimeBudgetExceededError";
  }
}

export type RequestBudget = {
  readonly deadline: number;
  /** Aborts when the deadline passes. */
  readonly signal: AbortSignal;
  remainingMs(): number;
  /** A shorter budget nested inside this one (never extends past this deadline). */
  child(maxMs: number): RequestBudget;
  dispose(): void;
};

export function createRequestBudget(totalMs: number, options: { now?: () => number; parent?: AbortSignal } = {}): RequestBudget {
  const now = options.now ?? Date.now;
  const deadline = now() + Math.max(0, totalMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new TimeBudgetExceededError("request")), Math.max(0, totalMs));
  const onParentAbort = () => controller.abort(options.parent?.reason);
  if (options.parent?.aborted) controller.abort(options.parent.reason);
  else options.parent?.addEventListener("abort", onParentAbort, { once: true });

  const budget: RequestBudget = {
    deadline,
    signal: controller.signal,
    remainingMs: () => Math.max(0, deadline - now()),
    child: (maxMs) => createRequestBudget(Math.min(maxMs, budget.remainingMs()), { now, parent: controller.signal }),
    dispose: () => {
      clearTimeout(timer);
      options.parent?.removeEventListener("abort", onParentAbort);
    },
  };
  return budget;
}

/** Signal for one attempt: fires at `timeoutMs` or at the budget deadline, whichever is first. */
export function attemptSignal(budget: RequestBudget, timeoutMs: number) {
  return AbortSignal.any([budget.signal, AbortSignal.timeout(Math.max(1, timeoutMs))]);
}

export function isAbortError(error: unknown) {
  const name = (error as { name?: string } | null)?.name;
  return name === "AbortError" || name === "TimeoutError" || error instanceof TimeBudgetExceededError;
}

function abortableSleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export type RetryOptions = {
  budget: RequestBudget;
  label: string;
  /** Total attempts, including the first. */
  maxAttempts: number;
  /** Upper bound for a single attempt. */
  attemptTimeoutMs: number;
  /** Do not start an attempt with less time than this. */
  minAttemptMs: number;
  /** Errors that may succeed on another attempt. Timeouts are always retryable. */
  isRetryable: (error: unknown) => boolean;
  /** Delay before attempt n+1 (n starts at 1). Defaults to 1 s, 2 s, 4 s … capped at 8 s, plus jitter. */
  backoffMs?: (attempt: number) => number;
  onRetry?: (info: { attempt: number; delayMs: number; error: unknown }) => void;
};

export const defaultBackoffMs = (attempt: number) => Math.min(8_000, 1_000 * 2 ** (attempt - 1)) + Math.floor(Math.random() * 250);

/**
 * Runs `fn` with bounded retries inside the budget. Throws the last error when
 * attempts run out, or TimeBudgetExceededError (retryable by the caller, e.g. on
 * the next request) when the budget cannot fit another attempt.
 */
export async function retryWithBudget<T>(fn: (signal: AbortSignal, attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  const backoff = options.backoffMs ?? defaultBackoffMs;
  let lastError: unknown;
  for (let attempt = 1; attempt <= Math.max(1, options.maxAttempts); attempt += 1) {
    const available = options.budget.remainingMs();
    if (available < options.minAttemptMs) throw new TimeBudgetExceededError(options.label, lastError);
    const signal = attemptSignal(options.budget, Math.min(options.attemptTimeoutMs, available));
    try {
      return await fn(signal, attempt);
    } catch (error) {
      lastError = signal.aborted && !isAbortError(error) ? Object.assign(new Error(`TIMEOUT:${options.label}`), { name: "TimeoutError", cause: error }) : error;
      const timedOut = signal.aborted || isAbortError(error);
      if (options.budget.signal.aborted) throw new TimeBudgetExceededError(options.label, lastError);
      if (!timedOut && !options.isRetryable(error)) throw error;
      if (attempt >= options.maxAttempts) throw lastError;
      const delayMs = backoff(attempt);
      if (options.budget.remainingMs() - delayMs < options.minAttemptMs) throw new TimeBudgetExceededError(options.label, lastError);
      options.onRetry?.({ attempt, delayMs, error });
      await abortableSleep(delayMs, options.budget.signal).catch(() => {
        throw new TimeBudgetExceededError(options.label, lastError);
      });
    }
  }
  throw lastError;
}
