import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { callGroqChat, callGroqTranscribe } from "@/lib/ai/groq";
import { createRequestBudget, retryWithBudget, TimeBudgetExceededError } from "@/lib/ai/requestBudget";
import { callAiNoteChatWithFallback } from "@/lib/aiNote/providerRouter";
import { transcribeAudioToText } from "@/lib/asr/transcribe";
import { FINALIZE_MAX_CONSECUTIVE_RETRIES, finalizeRetryDelayMs } from "@/components/workspace/note/finalizeRetry";

/** A provider that never answers until it is cancelled. */
function hangingFetch() {
  return vi.fn(
    (_url: unknown, init?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason ?? new DOMException("aborted", "AbortError")), { once: true });
      })
  );
}

const noBackoff = () => 0;
const always = () => true;

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.ASR_URL;
});

describe("retryWithBudget", () => {
  it("returns the first success without retrying", async () => {
    const budget = createRequestBudget(5_000);
    const fn = vi.fn(async () => "ok");
    await expect(retryWithBudget(fn, { budget, label: "t", maxAttempts: 3, attemptTimeoutMs: 1_000, minAttemptMs: 10, isRetryable: always })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
    budget.dispose();
  });

  it("retries a network failure with backoff and then succeeds", async () => {
    const budget = createRequestBudget(5_000);
    const fn = vi.fn().mockRejectedValueOnce(new Error("fetch failed: ECONNRESET")).mockResolvedValueOnce("ok");
    const onRetry = vi.fn();
    await expect(retryWithBudget(fn, { budget, label: "t", maxAttempts: 3, attemptTimeoutMs: 1_000, minAttemptMs: 10, isRetryable: always, backoffMs: () => 20, onRetry })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, delayMs: 20 }));
    budget.dispose();
  });

  it("cancels a slow attempt at its timeout and retries", async () => {
    const budget = createRequestBudget(5_000);
    const seen: boolean[] = [];
    const fn = vi.fn(async (signal: AbortSignal, attempt: number) => {
      if (attempt === 1) {
        await new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
      }
      seen.push(signal.aborted);
      return "second";
    });
    const started = Date.now();
    await expect(retryWithBudget(fn, { budget, label: "t", maxAttempts: 2, attemptTimeoutMs: 50, minAttemptMs: 10, isRetryable: () => false, backoffMs: noBackoff })).resolves.toBe("second");
    expect(Date.now() - started).toBeLessThan(1_000);
    expect(seen).toEqual([false]);
    budget.dispose();
  });

  it("stops after maxAttempts and rethrows the last error (retry exhaustion)", async () => {
    const budget = createRequestBudget(5_000);
    const fn = vi.fn(async (_signal: AbortSignal, attempt: number) => {
      throw Object.assign(new Error(`HTTP error: 503 attempt ${attempt}`), { httpStatus: 503 });
    });
    await expect(retryWithBudget(fn, { budget, label: "t", maxAttempts: 3, attemptTimeoutMs: 1_000, minAttemptMs: 10, isRetryable: always, backoffMs: noBackoff })).rejects.toThrow("attempt 3");
    expect(fn).toHaveBeenCalledTimes(3);
    budget.dispose();
  });

  it("does not retry errors that are not retryable", async () => {
    const budget = createRequestBudget(5_000);
    const fn = vi.fn(async () => {
      throw Object.assign(new Error("HTTP error: 401"), { httpStatus: 401 });
    });
    await expect(retryWithBudget(fn, { budget, label: "t", maxAttempts: 4, attemptTimeoutMs: 1_000, minAttemptMs: 10, isRetryable: () => false })).rejects.toThrow("401");
    expect(fn).toHaveBeenCalledTimes(1);
    budget.dispose();
  });

  it("never starts an attempt that does not fit in the remaining budget", async () => {
    const budget = createRequestBudget(100);
    const fn = vi.fn(async () => "never");
    await expect(retryWithBudget(fn, { budget, label: "asr", maxAttempts: 3, attemptTimeoutMs: 1_000, minAttemptMs: 500, isRetryable: always })).rejects.toBeInstanceOf(TimeBudgetExceededError);
    expect(fn).not.toHaveBeenCalled();
    budget.dispose();
  });

  it("stops retrying when the backoff would run past the budget, and is retryable for the caller", async () => {
    const budget = createRequestBudget(300);
    const fn = vi.fn(async () => {
      throw new Error("fetch failed");
    });
    const error = await retryWithBudget(fn, { budget, label: "asr", maxAttempts: 5, attemptTimeoutMs: 1_000, minAttemptMs: 50, isRetryable: always, backoffMs: () => 1_000 }).catch((caught) => caught);
    expect(error).toBeInstanceOf(TimeBudgetExceededError);
    expect(error.retryable).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    budget.dispose();
  });

  it("cancels the in-flight attempt when the request budget runs out", async () => {
    const budget = createRequestBudget(80);
    let aborted = false;
    const fn = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((_resolve, reject) =>
          signal.addEventListener("abort", () => {
            aborted = true;
            reject(signal.reason);
          }, { once: true })
        )
    );
    await expect(retryWithBudget(fn, { budget, label: "llm", maxAttempts: 3, attemptTimeoutMs: 10_000, minAttemptMs: 10, isRetryable: always })).rejects.toBeInstanceOf(TimeBudgetExceededError);
    expect(aborted).toBe(true);
    budget.dispose();
  });

  it("child budgets never outlive their parent", () => {
    const parent = createRequestBudget(1_000);
    const child = parent.child(60_000);
    expect(child.remainingMs()).toBeLessThanOrEqual(1_000);
    child.dispose();
    parent.dispose();
  });
});

describe("providers are actually cancelled", () => {
  it("external ASR: the fetch is aborted and the abort reason is reported", async () => {
    process.env.ASR_URL = "http://asr.test";
    const fetchMock = hangingFetch();
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const pending = transcribeAudioToText(new Uint8Array([1]), { mime: "audio/wav", signal: controller.signal });
    controller.abort(new TimeBudgetExceededError("asr"));
    await expect(pending).rejects.toBeInstanceOf(TimeBudgetExceededError);
    expect((fetchMock.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(true);
  });

  it("Groq ASR and chat: a caller signal cancels the request; their own timeout still maps to *_TIMEOUT", async () => {
    vi.stubGlobal("fetch", hangingFetch());
    const controller = new AbortController();
    const asr = callGroqTranscribe({ apiKey: "k", audio: Buffer.from([1]), mime: "audio/wav", signal: controller.signal });
    controller.abort(new TimeBudgetExceededError("asr_groq"));
    await expect(asr).rejects.toBeInstanceOf(TimeBudgetExceededError);

    await expect(callGroqChat({ apiKey: "k", modelId: "m", messages: [{ role: "user", content: "hi" }], timeoutMs: 30 })).rejects.toMatchObject({ code: "GROQ_TIMEOUT" });
  });

  it("LLM router: no paid fallback starts once the budget cannot fit another attempt", async () => {
    process.env.AI_NOTE_LLM_MIN_ATTEMPT_MS = "1000";
    const budget = createRequestBudget(200);
    const callGroq = vi.fn();
    const callOpenRouter = vi.fn();
    await expect(
      callAiNoteChatWithFallback(
        { messages: [{ role: "user", content: "x" }], groqModel: "m", maxTokens: 10, stage: "segment:generation", inputChars: 1, promptHash: "h", groqKey: "g", openRouterKey: "o", openRouterModels: ["free"], budget },
        { callGroq, callOpenRouter, log: () => {} }
      )
    ).rejects.toBeInstanceOf(TimeBudgetExceededError);
    expect(callGroq).not.toHaveBeenCalled();
    expect(callOpenRouter).not.toHaveBeenCalled();
    budget.dispose();
    delete process.env.AI_NOTE_LLM_MIN_ATTEMPT_MS;
  });

  it("LLM router: a budget timeout on Groq does not trigger the OpenRouter fallback", async () => {
    const budget = createRequestBudget(10_000);
    const callGroq = vi.fn(async () => {
      throw new TimeBudgetExceededError("segment:groq");
    });
    const callOpenRouter = vi.fn();
    await expect(
      callAiNoteChatWithFallback(
        { messages: [{ role: "user", content: "x" }], groqModel: "m", maxTokens: 10, stage: "segment:generation", inputChars: 1, promptHash: "h", groqKey: "g", openRouterKey: "o", openRouterModels: ["free"], budget },
        { callGroq: callGroq as never, callOpenRouter, log: () => {} }
      )
    ).rejects.toBeInstanceOf(TimeBudgetExceededError);
    expect(callOpenRouter).not.toHaveBeenCalled();
    // Each attempt is limited to the time left in the budget.
    budget.dispose();
  });
});

describe("client finalize retry policy", () => {
  it("waits on a held lease without counting it as a failure", () => {
    expect(finalizeRetryDelayMs({ status: 202, payload: { error: "LOCKED", retryAfterMs: 1500 }, consecutiveFailures: 99 })).toBe(1500);
  });

  it("retries network errors, 502/503/504, and time-budget responses with growing delays", () => {
    expect(finalizeRetryDelayMs({ status: null, payload: null, consecutiveFailures: 0 })).toBe(2_000);
    expect(finalizeRetryDelayMs({ status: 504, payload: null, consecutiveFailures: 1 })).toBe(4_000);
    expect(finalizeRetryDelayMs({ status: 503, payload: { error: "PROCESSING_TIME_BUDGET", retryable: true, retryAfterMs: 1_000 }, consecutiveFailures: 2 })).toBe(8_000);
    expect(finalizeRetryDelayMs({ status: 502, payload: { retryable: true, retryAfterMs: 12_000 }, consecutiveFailures: 0 })).toBe(12_000);
  });

  it("stops after the consecutive-failure limit, and never retries non-retryable errors", () => {
    expect(finalizeRetryDelayMs({ status: 503, payload: { retryable: true }, consecutiveFailures: FINALIZE_MAX_CONSECUTIVE_RETRIES })).toBeNull();
    expect(finalizeRetryDelayMs({ status: 502, payload: { retryable: false }, consecutiveFailures: 0 })).toBeNull();
    expect(finalizeRetryDelayMs({ status: 429, payload: { error: "NOTE_DAILY_LIMIT_REACHED" }, consecutiveFailures: 0 })).toBeNull();
    expect(finalizeRetryDelayMs({ status: 422, payload: { error: "EMPTY_TRANSCRIPT" }, consecutiveFailures: 0 })).toBeNull();
  });
});
