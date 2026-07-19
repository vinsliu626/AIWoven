import { describe, expect, it, vi } from "vitest";
import { callAiNoteChatWithFallback, getAiNoteOpenRouterModels, isGroqFallbackEligible } from "@/lib/aiNote/providerRouter";

function providerError(status: number, code = `HTTP_${status}`, message = code) {
  return Object.assign(new Error(message), { httpStatus: status, code });
}

const base = {
  messages: [
    { role: "system" as const, content: "Organize the saved transcript as Markdown." },
    { role: "user" as const, content: "A sufficiently long saved transcript about cell biology and mitochondria." },
  ],
  groqModel: "primary-model",
  maxTokens: 1800,
  traceId: "trace-1",
  noteId: "note-1",
  stage: "final:generation",
  inputChars: 70,
  groqKey: "groq-secret",
  openRouterKey: "router-secret",
  openRouterModels: ["fallback-a:free", "fallback-b:free"],
};

describe("AI Note provider routing", () => {
  it("returns the primary result without invoking OpenRouter", async () => {
    const callGroq = vi.fn().mockResolvedValue({ content: "# Primary note", modelUsed: "primary-model" });
    const callOpenRouter = vi.fn();
    const result = await callAiNoteChatWithFallback(base, { callGroq, callOpenRouter, log: vi.fn() });
    expect(result).toMatchObject({ content: "# Primary note", provider: "groq", fallbackUsed: false });
    expect(callGroq).toHaveBeenCalledOnce();
    expect(callOpenRouter).not.toHaveBeenCalled();
  });

  it.each([
    [429, "UPSTREAM_RATE_LIMIT"],
    [503, "UPSTREAM_OVERLOADED"],
    [504, "GROQ_TIMEOUT"],
  ])("falls back after an eligible Groq %s failure", async (status, code) => {
    const callGroq = vi.fn().mockRejectedValue(providerError(status, code));
    const callOpenRouter = vi.fn().mockResolvedValue({ content: "# Fallback note", modelUsed: "fallback-a:free" });
    const log = vi.fn();
    const result = await callAiNoteChatWithFallback(base, { callGroq, callOpenRouter, log });
    expect(result).toMatchObject({ content: "# Fallback note", provider: "openrouter", fallbackUsed: true });
    expect(callOpenRouter).toHaveBeenCalledOnce();
    expect(callOpenRouter).toHaveBeenCalledWith(expect.objectContaining({ reasoningEffort: "minimal", excludeReasoning: true }));
    expect(log).toHaveBeenNthCalledWith(1, expect.objectContaining({
      traceId: "trace-1", noteId: "note-1", provider: "groq", status: "failed",
      retryable: true, fallbackEligible: true, outcome: "fallback_started",
    }));
    expect(log).toHaveBeenNthCalledWith(2, expect.objectContaining({ provider: "openrouter", outcome: "fallback_success" }));
  });

  it.each([400, 401, 403, 422])("does not mask non-retryable Groq status %s", async (status) => {
    const failure = providerError(status);
    const callOpenRouter = vi.fn();
    await expect(callAiNoteChatWithFallback(base, {
      callGroq: vi.fn().mockRejectedValue(failure), callOpenRouter, log: vi.fn(),
    })).rejects.toBe(failure);
    expect(callOpenRouter).not.toHaveBeenCalled();
  });

  it("reports an eligible primary failure when the fallback key is missing", async () => {
    const failure = providerError(429, "UPSTREAM_RATE_LIMIT");
    const log = vi.fn();
    await expect(callAiNoteChatWithFallback({ ...base, openRouterKey: "" }, {
      callGroq: vi.fn().mockRejectedValue(failure), callOpenRouter: vi.fn(), log,
    })).rejects.toBe(failure);
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ outcome: "terminal_failure", fallbackEligible: true }));
  });

  it("tries the next configured free model when the first fallback is unavailable", async () => {
    const callOpenRouter = vi.fn()
      .mockRejectedValueOnce(providerError(503, "UPSTREAM_OVERLOADED"))
      .mockResolvedValueOnce({ content: "# Second fallback", modelUsed: "fallback-b:free" });
    const result = await callAiNoteChatWithFallback(base, {
      callGroq: vi.fn().mockRejectedValue(providerError(429, "UPSTREAM_RATE_LIMIT")), callOpenRouter, log: vi.fn(),
    });
    expect(result.model).toBe("fallback-b:free");
    expect(callOpenRouter).toHaveBeenCalledTimes(2);
    expect(callOpenRouter.mock.calls.map(([request]) => request.modelId)).toEqual(["fallback-a:free", "fallback-b:free"]);
  });

  it("returns a terminal provider error when every fallback is unavailable", async () => {
    const last = providerError(503, "UPSTREAM_OVERLOADED");
    await expect(callAiNoteChatWithFallback(base, {
      callGroq: vi.fn().mockRejectedValue(providerError(429, "UPSTREAM_RATE_LIMIT")),
      callOpenRouter: vi.fn().mockRejectedValue(last),
      log: vi.fn(),
    })).rejects.toBe(last);
  });

  it("forwards long saved input once per provider without mutating it or exposing it in logs", async () => {
    const transcript = `sensitive transcript ${"educational content ".repeat(20_000)}`;
    const messages = [{ role: "user" as const, content: transcript }];
    const log = vi.fn();
    const callOpenRouter = vi.fn().mockResolvedValue({ content: "# Long note", modelUsed: "fallback-a:free" });
    await callAiNoteChatWithFallback({ ...base, messages, inputChars: transcript.length }, {
      callGroq: vi.fn().mockRejectedValue(providerError(429, "UPSTREAM_RATE_LIMIT", "secret upstream body")),
      callOpenRouter,
      log,
    });
    expect(callOpenRouter.mock.calls[0][0].messages[0].content).toBe(transcript);
    const serializedLogs = JSON.stringify(log.mock.calls);
    expect(serializedLogs).not.toContain("sensitive transcript");
    expect(serializedLogs).not.toContain("groq-secret");
    expect(serializedLogs).not.toContain("router-secret");
    expect(serializedLogs).not.toContain("secret upstream body");
  });

  it("parses a deduplicated configurable model order", () => {
    expect(getAiNoteOpenRouterModels(" first:free, second:free, first:free ")).toEqual(["first:free", "second:free"]);
    expect(getAiNoteOpenRouterModels()).not.toHaveLength(0);
  });

  it("classifies quota, capacity, timeout, and retryable server failures", () => {
    expect(isGroqFallbackEligible(providerError(429, "QUOTA_EXCEEDED"))).toBe(true);
    expect(isGroqFallbackEligible(providerError(409, "CAPACITY_EXCEEDED"))).toBe(true);
    expect(isGroqFallbackEligible(providerError(504, "GROQ_TIMEOUT"))).toBe(true);
    expect(isGroqFallbackEligible(providerError(500))).toBe(true);
    expect(isGroqFallbackEligible(providerError(401))).toBe(false);
  });
});
