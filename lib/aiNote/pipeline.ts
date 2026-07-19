import { z } from "zod";
import { buildAudioStudyNoteSystemPrompt, buildAudioStudyNoteUserPrompt, buildStudyNoteAuditSystemPrompt, buildStudyNoteAuditUserPrompt, buildStudyNotePrecisionRepairSystemPrompt, buildStudyNotePrecisionRepairUserPrompt, outlinePrompt, sectionNotesPrompt, finalMergePrompt } from "./prompts";

import { callGroqChat } from "@/lib/ai/providers/groq";
import { callHfRouterChat } from "@/lib/ai/providers/hfRouter";
import { normalizeAiText } from "@/lib/ui/aiTextFormat";
import { callAiNoteChatWithFallback } from "@/lib/aiNote/providerRouter";

const FAST_MODEL = "llama-3.1-8b-instant";

// HF Router models
const HF_DEEPSEEK_MODEL = "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B";
const HF_KIMI_MODEL = "moonshotai/Kimi-K2-Instruct-0905";

export class AiNoteGenerationError extends Error {
  constructor(
    public readonly code:
      | "NOTE_GENERATION_AUTH_FAILED"
      | "NOTE_GENERATION_RATE_LIMITED"
      | "NOTE_GENERATION_TIMEOUT"
      | "NOTE_GENERATION_FAILED",
    message: string,
    public readonly retryable: boolean,
    public readonly providerStatus?: number,
    public readonly retryAfterMs?: number
  ) {
    super(message);
    this.name = "AiNoteGenerationError";
  }
}

/** ===================== JSON Schemas ===================== */
const OutlineSchema = z.object({
  title: z.string().min(1),
  language: z.enum(["en", "zh", "auto"]).default("auto"),
  sourceType: z.enum(["lecture", "meeting", "quiz_review", "study_material", "general"]).default("general"),
  sections: z
    .array(
      z.object({
        id: z.string().min(1),
        heading: z.string().min(1),
        summary: z.string().min(1),

        // ✅ 放宽：允许 0 个（模型有时会给空）
        keyPoints: z.array(z.string().min(1)).default([]),

        // ✅ 放宽：允许短句
        sourceText: z.string().min(1),
      })
    )
    .min(1),
});

const SectionNotesSchema = z.object({
  id: z.string().min(1),
  heading: z.string().min(1),

  bullets: z.array(z.string().min(1)).min(2).max(8),

  keyTerms: z
    .array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
    .min(0)
    .max(5)
    .default([]),

  examples: z.array(z.string().min(1)).max(3).default([]),
  actionItems: z.array(z.string().min(1)).max(3).default([]),
});

const FinalNoteSchema = z.object({
  title: z.string().min(1).default("Notes"),

  executiveSummary: z.array(z.string().min(1)).min(0).max(6).default([]),

  sections: z
    .array(
      z.object({
            heading: z.string().min(1),
            bullets: z.array(z.string().min(1)).min(0).max(10).default([]),
          })
    )
    .min(0)
    .default([]),

  keyTerms: z
    .array(z.object({ term: z.string().min(1), definition: z.string().min(1) }))
    .min(0)
    .max(10)
    .default([]),

  takeaways: z.array(z.string().min(1)).min(0).max(8).default([]),
  studyAids: z
    .array(
      z.object({
        label: z.string().min(1),
        items: z.array(z.string().min(1)).min(1).max(6),
      })
    )
    .max(4)
    .default([]),
  answerKey: z.array(z.string().min(1)).min(0).max(8).default([]),

  markdown: z.string().min(0).default(""),
});

type OutlineResult = z.infer<typeof OutlineSchema>;
type SectionNotes = z.infer<typeof SectionNotesSchema>;
type FinalNote = z.infer<typeof FinalNoteSchema>;

/** ===================== Helpers ===================== */
function normalizeInput(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/**
 * ✅ 更稳：移除 ```json ... ``` / ``` ... ```，保留内部内容
 */
function stripCodeFences(s: string) {
  let t = String(s || "").trim();

  // 如果整段被 ```...``` 包起来：取内部
  // 支持 ```json\n...\n```、```JSON ...```、``` \n ... \n ```
  const m = t.match(/^```(?:json|JSON|js|javascript|ts|typescript)?\s*\n?([\s\S]*?)\n?```$/);
  if (m) return (m[1] || "").trim();

  // 不是整段包裹：也做一次全局替换（有些模型会多段 fence）
  t = t.replace(/```(?:json|JSON|js|javascript|ts|typescript)?\s*\n?/g, "");
  t = t.replace(/```/g, "");
  return t.trim();
}

function stripThinkBlocks(s: string) {
  return String(s || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

export function stripProviderPlanningFromMarkdown(value: string) {
  const text = stripThinkBlocks(String(value || "")).trim();
  const markdownStart = text.search(/^#{1,2}\s+(?:Segment Topic|Executive Summary|[^\n]+)$/m);
  return markdownStart > 0 ? text.slice(markdownStart).trim() : text;
}

const REQUIRED_STUDY_NOTE_HEADINGS = [
  "Executive Summary",
  "Key Definitions",
  "Key Concepts",
  "Relationships Between Concepts",
  "Key Takeaways",
] as const;

export function normalizeRequiredStudyNoteHeadings(value: string) {
  const required = new Map(REQUIRED_STUDY_NOTE_HEADINGS.map((heading) => [heading.toLowerCase(), heading]));
  return String(value || "")
    .split("\n")
    .map((line) => {
      const match = line.trim().match(/^(?:#{1,6}\s*|\d+[.)]\s*|\*\*\s*)?([^:*]+?)(?:\s*\*\*|\s*:)?$/);
      const canonical = match ? required.get(match[1].trim().toLowerCase()) : undefined;
      return canonical ? `## ${canonical}` : line;
    })
    .join("\n");
}

function looksLikeHtml(s: string) {
  const t = String(s || "").trim().toLowerCase();
  return t.startsWith("<!doctype html") || t.startsWith("<html") || t.includes("<head>") || t.includes("<body>");
}

/**
 * ✅ 抓第一个 JSON object：{ ... }
 */
function extractFirstJsonObject(s: string) {
  const text = String(s || "").trim();
  const firstBrace = text.indexOf("{");
  if (firstBrace === -1) return null;

  let depth = 0;
  let inStr = false;
  let escape = false;

  for (let i = firstBrace; i < text.length; i++) {
    const ch = text[i];

    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    } else {
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth--;

      if (depth === 0) return text.slice(firstBrace, i + 1);
    }
  }
  return null;
}

/**
 * ✅ 抓第一个 JSON array：[ ... ]
 */
function extractFirstJsonArray(s: string) {
  const text = String(s || "").trim();
  const first = text.indexOf("[");
  if (first === -1) return null;

  let depth = 0;
  let inStr = false;
  let escape = false;

  for (let i = first; i < text.length; i++) {
    const ch = text[i];

    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    } else {
      if (ch === '"') {
        inStr = true;
        continue;
      }
      if (ch === "[") depth++;
      if (ch === "]") depth--;

      if (depth === 0) return text.slice(first, i + 1);
    }
  }
  return null;
}

/**
 * ✅ 超稳 JSON 解析：fence/think 清理 + object/array 抽取
 */
function parseJsonFromModel<T>(raw: string): T {
  let t = String(raw || "").trim();
  t = stripThinkBlocks(t);
  t = stripCodeFences(t);

  // 有些模型会在 JSON 前后加“Here is the JSON:”
  // 尝试直接 parse
  try {
    return JSON.parse(t) as T;
  } catch {}

  // 抓对象
  const obj = extractFirstJsonObject(t);
  if (obj) {
    try {
      return JSON.parse(obj) as T;
    } catch {}
  }

  // 抓数组
  const arr = extractFirstJsonArray(t);
  if (arr) {
    try {
      return JSON.parse(arr) as T;
    } catch {}
  }

  // 只截取一部分，避免日志爆
  const head = String(raw || "").slice(0, 1200);
  throw new Error(`Failed to parse JSON from model (preview):\n${head}${String(raw || "").length > 1200 ? "\n...(truncated)" : ""}`);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureMinKeyPoints(section: { summary: string; sourceText: string; keyPoints?: string[] }, min = 2) {
  const kp = Array.isArray(section.keyPoints) ? section.keyPoints.filter(Boolean) : [];
  if (kp.length >= min) return kp.slice(0, 12);

  const base = `${section.summary}\n${section.sourceText}`.trim();
  const candidates = base
    .split(/[\n\.!\?]+/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const out = [...kp];
  for (const c of candidates) {
    if (out.length >= min) break;
    if (!out.includes(c)) out.push(c);
  }
  return out.slice(0, 12);
}

export function ensureOutline(note: unknown): OutlineResult {
  const value = note && typeof note === "object" ? (note as Record<string, unknown>) : {};
  const rawSections = Array.isArray(value.sections) ? value.sections : [];
  const sections = rawSections
    .map((rawSection, index) => {
      const section = rawSection && typeof rawSection === "object" ? (rawSection as Record<string, unknown>) : {};
      const heading = String(section.heading || section.title || `Section ${index + 1}`).trim();
      const summary = String(section.summary || section.sourceText || "").trim();
      const sourceText = String(section.sourceText || section.content || summary).trim();
      const keyPoints = Array.isArray(section.keyPoints)
        ? section.keyPoints.map((item) => String(item || "").trim()).filter(Boolean)
        : [];
      if (!heading || (!summary && !sourceText && keyPoints.length === 0)) return null;
      return {
        id: String(section.id || `section-${index + 1}`).trim() || `section-${index + 1}`,
        heading,
        summary: summary || keyPoints[0] || sourceText,
        keyPoints,
        sourceText: sourceText || summary || keyPoints.join(". "),
      };
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  if (sections.length === 0) {
    throw new AiNoteGenerationError("NOTE_GENERATION_FAILED", "The outline contained no usable sections.", true);
  }

  const language = ["en", "zh", "auto"].includes(String(value.language))
    ? (String(value.language) as "en" | "zh" | "auto")
    : "auto";
  const sourceTypes = ["lecture", "meeting", "quiz_review", "study_material", "general"] as const;
  const sourceTypeValue = String(value.sourceType || "general");
  const sourceType = sourceTypes.includes(sourceTypeValue as (typeof sourceTypes)[number])
    ? (sourceTypeValue as (typeof sourceTypes)[number])
    : "general";

  return OutlineSchema.parse({
    title: String(value.title || "Study Notes").trim() || "Study Notes",
    language,
    sourceType,
    sections,
  });
}

export function mapGenerationProviderError(error: unknown): AiNoteGenerationError {
  if (error instanceof AiNoteGenerationError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const structuredStatus = Number((error as { httpStatus?: number } | undefined)?.httpStatus || 0);
  const statusMatch = message.match(/(?:(?:Groq|HF Router) failed:|GROQ_HTTP_|OPENROUTER_HTTP_)[\s:]*(\d{3})/i);
  const status = structuredStatus || (statusMatch ? Number.parseInt(statusMatch[1], 10) : undefined);
  const retryMsMatch = message.match(/try again in\s*([0-9.]+)ms/i);
  const retryMinuteMatch = message.match(/try again in\s*([0-9.]+)m(?:([0-9.]+)s)?/i);
  const retrySecondMatch = message.match(/try again in\s*([0-9.]+)s/i);
  const structuredRetryAfter = Number((error as { retryAfterMs?: number } | undefined)?.retryAfterMs || 0);
  const retryAfterMs = structuredRetryAfter || (retryMsMatch
    ? Math.ceil(Number(retryMsMatch[1]))
    : retryMinuteMatch
      ? Math.ceil((Number(retryMinuteMatch[1]) * 60 + Number(retryMinuteMatch[2] || 0)) * 1000)
      : retrySecondMatch
        ? Math.ceil(Number(retrySecondMatch[1]) * 1000)
        : undefined);
  const safeMessage = status ? `The note provider returned status ${status}.` : "The note provider request failed.";
  if (status === 401 || status === 403) return new AiNoteGenerationError("NOTE_GENERATION_AUTH_FAILED", safeMessage, false, status);
  if (status === 429) return new AiNoteGenerationError("NOTE_GENERATION_RATE_LIMITED", safeMessage, true, status, retryAfterMs);
  if (/timeout|abort/i.test(message)) return new AiNoteGenerationError("NOTE_GENERATION_TIMEOUT", safeMessage, true, status);
  return new AiNoteGenerationError("NOTE_GENERATION_FAILED", safeMessage, !status || status >= 500, status);
}

export function assertFinalStudyNoteStructure(markdown: string) {
  const note = String(markdown || "").trim();
  const requiredHeadings = REQUIRED_STUDY_NOTE_HEADINGS.map((heading) => `## ${heading}`);
  const missing = requiredHeadings.filter((heading) => !note.includes(heading));
  if (missing.length > 0 || /<think>/i.test(note)) {
    throw new AiNoteGenerationError(
      "NOTE_GENERATION_FAILED",
      `The final study note did not pass its structure audit: ${missing.join(", ") || "reasoning content present"}.`,
      true
    );
  }
  if (note.indexOf("## Key Takeaways") < note.indexOf("## Key Concepts")) {
    throw new AiNoteGenerationError("NOTE_GENERATION_FAILED", "The final study note sections were out of order.", true);
  }
  return note;
}

export function preserveStructurallyCompleteStudyNote(draft: string, audited: string) {
  try {
    return assertFinalStudyNoteStructure(audited);
  } catch (auditError) {
    try {
      return assertFinalStudyNoteStructure(draft);
    } catch {
      throw auditError;
    }
  }
}

export function findStudyNotePrecisionIssues(markdown: string, evidence: string) {
  const note = String(markdown || "");
  const source = String(evidence || "");
  const combined = `${source}\n${note}`;
  const issues: string[] = [];

  const keyDefinitions = note.match(/## Key Definitions([\s\S]*?)(?=\n## |$)/i)?.[1] || "";
  if (/ionization energy/i.test(combined) && !/first ionization energy[^\n.]*neutral gaseous atom/i.test(keyDefinitions)) {
    issues.push("Define first ionization energy precisely for a neutral gaseous atom, not merely a neutral atom or an outermost shell.");
  }
  const needsSuccessiveIonization = /successive ionization|large jump/i.test(source)
    || (/periodic (?:table|trend)/i.test(combined) && /ionization energy/i.test(combined));
  if (needsSuccessiveIonization) {
    if (!/successive ionization energies/i.test(note) || !/increasingly positive gaseous ions/i.test(note)) {
      issues.push("Preserve the precise definition of successive ionization energies for increasingly positive gaseous ions.");
    }
    if (!/valence electrons[^\n.]{0,160}(?:core shell|lower-energy)/i.test(note)) {
      issues.push("Explain that the large jump follows removal of all valence electrons and requires removing the next electron from a lower-energy core shell.");
    }
  }
  const groupValenceClaims = note
    .split(/\n|(?<=[.!?])\s+/)
    .filter((line) => /\bgroup\b[^.]{0,140}valence electron|valence electron[^.]{0,140}\bgroup\b/i.test(line))
    .filter((line) => !/group\s+(?:1|2|13|14|15|16|17|18)\b/i.test(line));
  if (groupValenceClaims.some((line) => !/main[-‑ ]group elements/i.test(line))) {
    issues.push("Qualify group-to-valence-electron statements to main-group elements in every section, including Key Takeaways.");
  }
  if (/nitrogen/i.test(combined) && /oxygen/i.test(combined) && /ionization energy/i.test(combined)) {
    if (!/half[-‑ ]filled/i.test(note) || !/paired[-‑ ]electron repulsion/i.test(note)) {
      issues.push("Explain the nitrogen/oxygen exception with both half-filled-subshell stability and paired-electron repulsion in oxygen.");
    }
  }
  if (/electron affinity/i.test(combined)) {
    if (!/(?:more favorable|more exothermic|more negative)/i.test(note) || !/exception/i.test(note)) {
      issues.push("Express the electron-affinity trend with its sign/energy convention and important exceptions, not as an unqualified numeric increase.");
    }
  }
  if (/highest electron affinity/i.test(source) && /highest electron affinity/i.test(note)) {
    if (!/lecture (?:states|cites|identifies)/i.test(note) || !/standard reference data/i.test(note)) {
      issues.push("Do not repeat the source's highest-electron-affinity claim as fact; distinguish the lecture statement from the high-confidence reference correction.");
    }
  }
  if (/noble gases?[^\n.]{0,140}(?:excluded|omitted)[^\n.]{0,140}ionization energy|ionization energy[^\n.]{0,140}(?:excluded|omitted)[^\n.]{0,140}noble gases?/i.test(note)) {
    issues.push("Do not broaden a noble-gas exclusion from electron affinity or electronegativity to ionization-energy trends.");
  }
  const commonMistakes = note.match(/## Common Mistakes([\s\S]*?)(?=\n## |$)/i)?.[1] || "";
  if (/^\s*\|/m.test(commonMistakes)) {
    issues.push("Convert Common Mistakes from a table into Mistake / Correction / Brief explanation bullet entries.");
  }

  return issues;
}

export function mergeStudyNotePrecisionIssues(...groups: string[][]) {
  return Array.from(new Set(groups.flat()));
}

export function applySafeStudyNotePrecisionCorrections(markdown: string) {
  return String(markdown || "")
    .split("\n")
    .map((line) => {
      const isUniversalGroupClaim = /\bgroup\b[^.]{0,140}valence electron|valence electron[^.]{0,140}\bgroup\b/i.test(line);
      const alreadyQualified = /main[-‑ ]group elements/i.test(line);
      const isSpecificGroup = /group\s+(?:1|2|13|14|15|16|17|18)\b/i.test(line);
      if (!isUniversalGroupClaim || alreadyQualified || isSpecificGroup) return line;

      const bullet = line.match(/^(\s*(?:[-*+] |\d+\. ))/i)?.[1] || "";
      const content = line.slice(bullet.length);
      return `${bullet}For main-group elements, ${content.replace(/^Elements\b/, "elements")}`;
    })
    .join("\n");
}

function ensureMinKeyTerms(
  obj: { heading: string; bullets: string[]; keyTerms?: { term: string; definition: string }[] },
  min = 1
) {
  const out = Array.isArray(obj.keyTerms) ? obj.keyTerms.filter((x) => x?.term && x?.definition) : [];
  return out.slice(0, 10);
}

function ensureSectionNotes(note: any): SectionNotes {
  const id = String(note?.id || "section-1");
  const heading = String(note?.heading || "Section");

  const bullets = Array.isArray(note?.bullets) ? note.bullets.filter(Boolean) : [];
  const safeBullets = bullets.length > 0 ? bullets.slice(0, 8) : [heading];

  const keyTermsRaw = Array.isArray(note?.keyTerms) ? note.keyTerms : [];
  const fixedKeyTerms = ensureMinKeyTerms({ heading, bullets: safeBullets, keyTerms: keyTermsRaw }, 1);

  const examples = Array.isArray(note?.examples) ? note.examples.filter(Boolean).slice(0, 3) : [];
  const actionItems = Array.isArray(note?.actionItems) ? note.actionItems.filter(Boolean).slice(0, 3) : [];

  const obj: SectionNotes = {
    id,
    heading,
    bullets: safeBullets,
    keyTerms: fixedKeyTerms,
    examples,
    actionItems,
  };

  const parsed = SectionNotesSchema.safeParse(obj);
  if (!parsed.success) {
    return {
      id,
      heading,
      bullets: [heading],
      keyTerms: fixedKeyTerms,
      examples: [],
      actionItems: [],
    };
  }
  return parsed.data;
}

function ensureFinalNote(note: any): FinalNote {
  const title = String(note?.title || "Notes").trim() || "Notes";

  const executiveSummary = Array.isArray(note?.executiveSummary) ? note.executiveSummary.filter(Boolean).slice(0, 6) : [];
  const sectionsRaw = Array.isArray(note?.sections) ? note.sections : [];

  const safeSections =
    sectionsRaw.length > 0
      ? sectionsRaw
          .map((x: any) => ({
            heading: String(x?.heading || "Section").trim() || "Section",
            bullets: Array.isArray(x?.bullets) ? x.bullets.filter(Boolean).slice(0, 10) : [],
          }))
          .filter((x: any) => x.bullets.length > 0)
      : [
          {
            heading: "Main Notes",
            bullets: executiveSummary.length ? executiveSummary : ["(No content)"],
          },
        ];

  const keyTerms = Array.isArray(note?.keyTerms) ? note.keyTerms : [];
  const takeaways = Array.isArray(note?.takeaways) ? note.takeaways.filter(Boolean).slice(0, 8) : [];
  const studyAids = Array.isArray(note?.studyAids)
    ? note.studyAids
        .map((x: any) => ({
          label: String(x?.label || "Study Aid").trim() || "Study Aid",
          items: Array.isArray(x?.items) ? x.items.filter(Boolean).slice(0, 6) : [],
        }))
        .filter((x: any) => x.items.length > 0)
        .slice(0, 4)
    : [];
  const answerKey = Array.isArray(note?.answerKey) ? note.answerKey.filter(Boolean).slice(0, 8) : [];

  let markdown = String(note?.markdown || "").trim();

  if (!markdown) {
    markdown = [
      `# ${title}`,
      ``,
      `## Executive Summary`,
      ...(executiveSummary.length ? executiveSummary.map((x: string) => `- ${x}`) : ["- (empty)"]),
      ``,
      `## Main Notes`,
      ...safeSections.flatMap((sec: any) => [`### ${sec.heading}`, ...sec.bullets.map((b: string) => `- ${b}`), ``]),
      keyTerms.length
        ? [`## Important Terms`, ...keyTerms.slice(0, 10).map((k: any) => `- **${k.term}**: ${k.definition}`), ``].join("\n")
        : ``,
      takeaways.length
        ? [`## Takeaways`, ...takeaways.map((x: string) => `- ${x}`), ``].join("\n")
        : ``,
      studyAids.length
        ? [
            `## Study Aids`,
            ...studyAids.flatMap((aid: any) => [`### ${aid.label}`, ...aid.items.map((item: string) => `- ${item}`), ``]),
          ].join("\n")
        : ``,
      answerKey.length
        ? [`## Answer Key / Extracted Answers`, ...answerKey.map((x: string) => `- ${x}`), ``].join("\n")
        : ``,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const obj: FinalNote = {
    title,
    executiveSummary: executiveSummary.length ? executiveSummary : ["(empty)"],
    sections: safeSections,
    keyTerms,
    takeaways,
    studyAids,
    answerKey,
    markdown,
  };

  const parsed = FinalNoteSchema.safeParse(obj);
  if (!parsed.success) return { ...obj, markdown };
  return parsed.data;
}

/**
 * ✅ HF Router 调用包装：处理 503/HTML/网络抖动，指数退避重试
 */
async function callHfRouterChatRobust(hfToken: string, model: string, messages: any, opts: any, label: string) {
  const maxTry = Number.parseInt(process.env.AI_NOTE_HF_RETRIES || "4", 10) || 4;
  let lastErr: any = null;

  for (let attempt = 1; attempt <= maxTry; attempt++) {
    try {
      const raw = await callHfRouterChat(hfToken, model, messages, opts);

      if (!raw || (typeof raw === "string" && raw.trim().length === 0)) {
        throw new Error(`HF Router returned empty. label=${label}`);
      }
      if (typeof raw === "string" && looksLikeHtml(raw)) {
        throw new Error(`HF Router returned HTML (likely 503). label=${label}`);
      }

      return raw;
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);

      const statusMatch = msg.match(/HF Router failed:\s*(\d{3})/i);
      const status = statusMatch ? Number.parseInt(statusMatch[1], 10) : 0;
      const retryable =
        status === 429 ||
        status >= 500 ||
        msg.toLowerCase().includes("service unavailable") ||
        msg.toLowerCase().includes("fetch") ||
        msg.toLowerCase().includes("timeout") ||
        msg.includes("returned HTML") ||
        msg.includes("returned empty");

      if (!retryable || attempt === maxTry) break;

      const backoff = Math.min(8000, 500 * Math.pow(2, attempt - 1));
      console.warn(
        `[aiNote/pipeline] HF retry ${attempt}/${maxTry} label=${label} backoff=${backoff}ms msg=${msg.slice(0, 160)}`
      );
      await sleep(backoff);
    }
  }

  throw new Error(`HF Router failed after retries. label=${label}. last=${String(lastErr?.message || lastErr)}`);
}

/** ===================== Robust Section Notes (HF retry + fallback Groq) ===================== */
async function callSectionNotesRobust(args: {
  hfToken: string;
  groqKey: string;
  id: string;
  heading: string;
  sourceText: string;
}): Promise<SectionNotes> {
  const { hfToken, groqKey, id, heading, sourceText } = args;

  if (!hfToken) {
    try {
      const raw = await callGroqChat(groqKey, FAST_MODEL, sectionNotesPrompt({ id, heading, sourceText }), { temperature: 0 });
      return ensureSectionNotes(parseJsonFromModel<SectionNotes>(raw));
    } catch (error) {
      throw mapGenerationProviderError(error);
    }
  }

  // 1) HF first
  try {
    const raw1 = await callHfRouterChatRobust(
      hfToken,
      HF_DEEPSEEK_MODEL,
      sectionNotesPrompt({ id, heading, sourceText }),
      { temperature: 0 },
      `section:${id}`
    );

    const obj1 = parseJsonFromModel<SectionNotes>(raw1);
    const parsed1 = SectionNotesSchema.safeParse(obj1);
    if (!parsed1.success) throw new Error("SectionNotes schema mismatch");

    return ensureSectionNotes(parsed1.data);
  } catch {
    // 2) HF hard retry (force JSON)
    try {
      const hardMessages = [
        {
          role: "system" as const,
          content: [
            "Return ONLY valid JSON.",
            "Do NOT output <think> tags, reasoning, markdown, or any extra text.",
            "Do NOT wrap in ``` fences.",
            "If you previously output anything else, output JSON only now.",
          ].join("\n"),
        },
        {
          role: "user" as const,
          content: [
            `Output ONLY this JSON shape:`,
            `{`,
            `  "id": "${id}",`,
            `  "heading": "${heading}",`,
            `  "bullets": ["..."],`,
            `  "keyTerms": [{"term": "...", "definition": "..."}],`,
            `  "examples": [],`,
            `  "actionItems": []`,
            `}`,
            ``,
            `Constraints:`,
            `- bullets: 3-8, each should explain a knowledge point`,
            `- keyTerms: 0-5, only if truly supported`,
            `- examples: 0-3`,
            `- actionItems: 0-4, use as study aids or review prompts`,
            ``,
            `Source text:`,
            sourceText,
          ].join("\n"),
        },
      ];

      const raw2 = await callHfRouterChatRobust(
        hfToken,
        HF_DEEPSEEK_MODEL,
        hardMessages,
        { temperature: 0 },
        `section-hard:${id}`
      );

      const obj2 = parseJsonFromModel<SectionNotes>(raw2);
      const parsed2 = SectionNotesSchema.safeParse(obj2);
      if (!parsed2.success) throw new Error("SectionNotes schema mismatch after hard retry");

      return ensureSectionNotes(parsed2.data);
    } catch {
      // 3) fallback: Groq
      const fallbackRaw = await callGroqChat(
        groqKey,
        FAST_MODEL,
        sectionNotesPrompt({ id, heading, sourceText }),
        { temperature: 0 }
      );

      const obj3 = parseJsonFromModel<SectionNotes>(fallbackRaw);
      return ensureSectionNotes(obj3);
    }
  }
}

/** ===================== Final Merge robust (HF retry + fallback Groq) ===================== */
async function callFinalMergeRobust(args: { hfToken: string; groqKey: string; mergedInput: any }): Promise<FinalNote> {
  const { hfToken, groqKey, mergedInput } = args;

  if (!hfToken) {
    try {
      const raw = await callGroqChat(groqKey, FAST_MODEL, finalMergePrompt(mergedInput), { temperature: 0 });
      return ensureFinalNote(parseJsonFromModel<FinalNote>(raw));
    } catch (error) {
      throw mapGenerationProviderError(error);
    }
  }

  // HF first
  try {
    const raw = await callHfRouterChatRobust(
      hfToken,
      HF_KIMI_MODEL,
      finalMergePrompt(mergedInput),
      { temperature: 0 },
      "final-merge"
    );
    const obj = parseJsonFromModel<FinalNote>(raw);
    return ensureFinalNote(obj);
  } catch {
    // fallback Groq
    const raw2 = await callGroqChat(groqKey, FAST_MODEL, finalMergePrompt(mergedInput), { temperature: 0 });
    const obj2 = parseJsonFromModel<FinalNote>(raw2);
    return ensureFinalNote(obj2);
  }
}

/** ===================== Main Pipeline ===================== */
export async function runAiNotePipeline(rawText: string, options?: { phase?: "segment" | "final"; traceId?: string; noteId?: string }): Promise<string> {
  const text = normalizeInput(rawText);
  if (text.length < 20) throw new Error("Text too short");

  mustEnv("GROQ_API_KEY");
  const phase = options?.phase ?? "segment";
  const studyModel = process.env.AI_NOTE_STUDY_MODEL || process.env.AI_NOTE_TEXT_MODEL || "openai/gpt-oss-120b";
  const configuredTokens = Number.parseInt(process.env.AI_NOTE_STUDY_MAX_TOKENS || "2200", 10);
  const maxTokens = Math.max(1_600, Math.min(2_400, Number.isFinite(configuredTokens) ? configuredTokens : 2_200));
  const generationTokenLimit = phase === "final" ? Math.min(maxTokens, 1_800) : maxTokens;

  async function callWithProviderFallback(
    model: string,
    messages: Array<{ role: "system" | "user"; content: string }>,
    tokenLimit: number,
    operation: "generation" | "audit" | "precision_repair",
    reasoningEffort?: "none" | "default" | "low" | "medium" | "high"
  ) {
    const result = await callAiNoteChatWithFallback({
      messages,
      groqModel: model,
      maxTokens: tokenLimit,
      reasoningEffort,
      traceId: options?.traceId,
      noteId: options?.noteId,
      stage: `${phase}:${operation}`,
      inputChars: messages.reduce((total, message) => total + message.content.length, 0),
    });
    return result.content;
  }

  try {
    const raw = await callWithProviderFallback(
      studyModel,
      [
        { role: "system", content: buildAudioStudyNoteSystemPrompt(phase) },
        { role: "user", content: buildAudioStudyNoteUserPrompt(text, phase) },
      ],
      generationTokenLimit,
      "generation"
    );
    let normalized = normalizeRequiredStudyNoteHeadings(normalizeAiText(stripProviderPlanningFromMarkdown(String(raw || ""))));
    if (!normalized) throw new AiNoteGenerationError("NOTE_GENERATION_FAILED", "The provider returned an empty note.", true);

    if (phase === "final") {
      const generatedDraft = normalized;
      const auditModel = process.env.AI_NOTE_AUDIT_MODEL || "qwen/qwen3.6-27b";
      const auditTokenLimit = Math.min(maxTokens, 1_800);
      const draftPrecisionIssues = findStudyNotePrecisionIssues(normalized, text);
      const audited = await callWithProviderFallback(
        auditModel,
        [
          { role: "system", content: buildStudyNoteAuditSystemPrompt() },
          {
            role: "user",
            content: draftPrecisionIssues.length > 0
              ? buildStudyNotePrecisionRepairUserPrompt(text, normalized, draftPrecisionIssues)
              : buildStudyNoteAuditUserPrompt(text, normalized),
          },
        ],
        auditTokenLimit,
        "audit",
        "none"
      );
      normalized = normalizeRequiredStudyNoteHeadings(normalizeAiText(stripProviderPlanningFromMarkdown(String(audited || ""))));
      if (!normalized) throw new AiNoteGenerationError("NOTE_GENERATION_FAILED", "The grounding audit returned an empty note.", true);
      const structurallySafe = preserveStructurallyCompleteStudyNote(generatedDraft, normalized);
      if (structurallySafe === generatedDraft && normalized !== generatedDraft) {
        console.warn("[ai-note/audit] preserving structurally complete draft", {
          traceId: options?.traceId || "unknown",
          noteId: options?.noteId || "unknown",
          stage: "final:audit",
          outcome: "audit_structure_rejected",
        });
      }
      normalized = structurallySafe;
      normalized = applySafeStudyNotePrecisionCorrections(normalized);
      let precisionIssues = findStudyNotePrecisionIssues(normalized, text);
      if (precisionIssues.length > 0) {
        const precisionModel = process.env.AI_NOTE_PRECISION_MODEL || auditModel;
        const repairIssues = mergeStudyNotePrecisionIssues(draftPrecisionIssues, precisionIssues);
        const repaired = await callWithProviderFallback(
          precisionModel,
          [
            { role: "system", content: buildStudyNotePrecisionRepairSystemPrompt() },
            { role: "user", content: buildStudyNotePrecisionRepairUserPrompt(text, normalized, repairIssues) },
          ],
          auditTokenLimit,
          "precision_repair",
          "none"
        );
        normalized = normalizeRequiredStudyNoteHeadings(normalizeAiText(stripProviderPlanningFromMarkdown(String(repaired || ""))));
        if (!normalized) throw new AiNoteGenerationError("NOTE_GENERATION_FAILED", "The precision repair returned an empty note.", true);
        normalized = applySafeStudyNotePrecisionCorrections(normalized);
        precisionIssues = findStudyNotePrecisionIssues(normalized, text);
        if (precisionIssues.length > 0) {
          throw new AiNoteGenerationError(
            "NOTE_GENERATION_FAILED",
            `The final study note did not pass its precision audit: ${precisionIssues.join(" ")}`,
            true
          );
        }
      }
      normalized = assertFinalStudyNoteStructure(normalized);
    }

    return normalized;
  } catch (error) {
    throw mapGenerationProviderError(error);
  }
}
