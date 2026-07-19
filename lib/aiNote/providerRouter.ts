import { callGroqChat } from "@/lib/ai/groq";
import { callOpenRouterChat, shouldFallback, type ChatMessage } from "@/lib/ai/openrouter";

export type AiNoteProvider = "groq" | "openrouter";

export type AiNoteProviderAttemptLog = {
  traceId: string;
  noteId: string;
  stage: string;
  provider: AiNoteProvider;
  model: string;
  attempt: number;
  inputChars: number;
  estimatedInputTokens: number;
  startedAt: string;
  elapsedMs: number;
  status: "succeeded" | "failed";
  errorClass?: string;
  retryable: boolean;
  fallbackEligible: boolean;
  outcome: "primary_success" | "fallback_started" | "fallback_success" | "next_fallback" | "terminal_failure";
};

type ProviderFailure = Error & {
  code?: string;
  httpStatus?: number;
  retryAfterMs?: number;
};

type ProviderDependencies = {
  callGroq?: typeof callGroqChat;
  callOpenRouter?: typeof callOpenRouterChat;
  log?: (entry: AiNoteProviderAttemptLog) => void;
};

const DEFAULT_OPENROUTER_MODELS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "openai/gpt-oss-20b:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "openrouter/free",
];

export function getAiNoteOpenRouterModels(value = process.env.AI_NOTE_OPENROUTER_MODELS) {
  const configured = String(value || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);
  return Array.from(new Set(configured.length > 0 ? configured : DEFAULT_OPENROUTER_MODELS));
}

function providerStatus(error: unknown) {
  const structured = Number((error as ProviderFailure | undefined)?.httpStatus || 0);
  if (structured > 0) return structured;
  const message = error instanceof Error ? error.message : String(error || "");
  const match = message.match(/(?:Groq failed:|GROQ_HTTP_|OPENROUTER_HTTP_)[\s:]*(\d{3})/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function errorCode(error: unknown) {
  return String((error as ProviderFailure | undefined)?.code || "");
}

export function isGroqFallbackEligible(error: unknown) {
  const status = providerStatus(error);
  const code = errorCode(error);
  if (status === 408 || status === 409 || status === 429 || status >= 500) return true;
  return /TIMEOUT|RATE_LIMIT|QUOTA|CAPACITY|OVERLOAD|NO_RESPONSE|BAD_JSON/i.test(code)
    || /timeout|timed out|quota|capacity|overload|rate.?limit/i.test(error instanceof Error ? error.message : String(error || ""));
}

function isRetryable(error: unknown) {
  const status = providerStatus(error);
  if (status === 408 || status === 409 || status === 429 || status >= 500) return true;
  return /TIMEOUT|RATE_LIMIT|QUOTA|CAPACITY|OVERLOAD|NO_RESPONSE|BAD_JSON/i.test(errorCode(error));
}

function safeErrorClass(error: unknown) {
  const code = errorCode(error);
  if (code) return code.slice(0, 80);
  const status = providerStatus(error);
  if (status) return `HTTP_${status}`;
  return error instanceof Error ? error.name.slice(0, 80) : "ProviderError";
}

function emitAttempt(
  log: (entry: AiNoteProviderAttemptLog) => void,
  base: Omit<AiNoteProviderAttemptLog, "elapsedMs" | "status" | "retryable" | "fallbackEligible" | "outcome" | "errorClass">,
  startedMs: number,
  result: Pick<AiNoteProviderAttemptLog, "status" | "retryable" | "fallbackEligible" | "outcome" | "errorClass">
) {
  log({ ...base, elapsedMs: Date.now() - startedMs, ...result });
}

export async function callAiNoteChatWithFallback(
  input: {
    messages: ChatMessage[];
    groqModel: string;
    maxTokens: number;
    reasoningEffort?: "none" | "default" | "low" | "medium" | "high";
    traceId?: string;
    noteId?: string;
    stage: string;
    inputChars: number;
    groqKey?: string;
    openRouterKey?: string;
    openRouterModels?: string[];
  },
  dependencies: ProviderDependencies = {}
) {
  const groqKey = input.groqKey ?? process.env.GROQ_API_KEY;
  if (!groqKey) throw Object.assign(new Error("GROQ_API_KEY_MISSING"), { code: "GROQ_API_KEY_MISSING", httpStatus: 503 });

  const openRouterKey = input.openRouterKey ?? process.env.OPENROUTER_API_KEY;
  const models = input.openRouterModels ?? getAiNoteOpenRouterModels();
  const groq = dependencies.callGroq ?? callGroqChat;
  const openRouter = dependencies.callOpenRouter ?? callOpenRouterChat;
  const log = dependencies.log ?? ((entry) => console.info("[ai-note/provider-attempt]", entry));
  const common = {
    traceId: input.traceId || "unknown",
    noteId: input.noteId || "unknown",
    stage: input.stage,
    inputChars: input.inputChars,
    estimatedInputTokens: Math.ceil(input.inputChars / 4),
  };

  const primaryStarted = Date.now();
  try {
    const result = await groq({
      apiKey: groqKey,
      modelId: input.groqModel,
      messages: input.messages,
      maxTokens: input.maxTokens,
      temperature: 0,
      reasoningEffort: input.reasoningEffort,
    });
    emitAttempt(log, { ...common, provider: "groq", model: result.modelUsed, attempt: 1, startedAt: new Date(primaryStarted).toISOString() }, primaryStarted, {
      status: "succeeded", retryable: false, fallbackEligible: false, outcome: "primary_success", errorClass: undefined,
    });
    return { content: result.content, provider: "groq" as const, model: result.modelUsed, fallbackUsed: false };
  } catch (error) {
    const eligible = isGroqFallbackEligible(error);
    emitAttempt(log, { ...common, provider: "groq", model: input.groqModel, attempt: 1, startedAt: new Date(primaryStarted).toISOString() }, primaryStarted, {
      status: "failed", retryable: isRetryable(error), fallbackEligible: eligible,
      outcome: eligible && openRouterKey && models.length > 0 ? "fallback_started" : "terminal_failure",
      errorClass: safeErrorClass(error),
    });
    if (!eligible || !openRouterKey || models.length === 0) throw error;
  }

  let lastError: unknown;
  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    const started = Date.now();
    try {
      const result = await openRouter({
        apiKey: openRouterKey!,
        modelId: model,
        messages: input.messages,
        maxTokens: input.maxTokens,
        temperature: 0,
        reasoningEffort: input.reasoningEffort,
      });
      emitAttempt(log, { ...common, provider: "openrouter", model: result.modelUsed, attempt: index + 1, startedAt: new Date(started).toISOString() }, started, {
        status: "succeeded", retryable: false, fallbackEligible: false, outcome: "fallback_success", errorClass: undefined,
      });
      return { content: result.content, provider: "openrouter" as const, model: result.modelUsed, fallbackUsed: true };
    } catch (error) {
      lastError = error;
      const canTryNext = shouldFallback(error) && index < models.length - 1;
      emitAttempt(log, { ...common, provider: "openrouter", model, attempt: index + 1, startedAt: new Date(started).toISOString() }, started, {
        status: "failed", retryable: isRetryable(error), fallbackEligible: shouldFallback(error),
        outcome: canTryNext ? "next_fallback" : "terminal_failure", errorClass: safeErrorClass(error),
      });
      if (!canTryNext) throw error;
    }
  }

  throw lastError || Object.assign(new Error("AI_NOTE_PROVIDERS_UNAVAILABLE"), { code: "AI_NOTE_PROVIDERS_UNAVAILABLE", httpStatus: 503 });
}
