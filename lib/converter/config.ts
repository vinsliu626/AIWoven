import type { PlanId } from "@/lib/plans/productLimits";

export type ConverterPlanId = PlanId | "gift";

export type ConverterCategory = "documents" | "images" | "audio" | "video";

export type ConverterFormatId =
  | "pdf"
  | "docx"
  | "txt"
  | "pptx"
  | "jpg"
  | "png"
  | "webp"
  | "mp3"
  | "wav"
  | "m4a"
  | "mp4"
  | "mov"
  | "extract_audio";

export type ConverterTargetRule = {
  id: ConverterFormatId;
  minPlan?: PlanId;
  requiresAdvancedVideo?: boolean;
  comingSoon?: boolean;
};

export type ConverterFormatDefinition = {
  id: ConverterFormatId;
  category: ConverterCategory;
  minPlan?: PlanId;
  requiresAdvancedVideo?: boolean;
};

export type ConverterValidationResult =
  | { ok: true }
  | {
      ok: false;
      code:
        | "MISSING_SOURCE"
        | "MISSING_TARGET"
        | "UNSUPPORTED_SOURCE"
        | "UNSUPPORTED_TARGET"
        | "INVALID_PAIR"
        | "PLAN_REQUIRED"
        | "ADVANCED_VIDEO_REQUIRED"
        | "FILE_TOO_LARGE"
        | "BATCH_LIMIT_EXCEEDED";
    };

const PLAN_ORDER: Record<PlanId, number> = {
  basic: 0,
  pro: 1,
  ultra: 2,
};

export const CONVERTER_FORMATS: ConverterFormatDefinition[] = [
  { id: "pdf", category: "documents" },
  { id: "docx", category: "documents" },
  { id: "txt", category: "documents" },
  { id: "pptx", category: "documents" },
  { id: "jpg", category: "images" },
  { id: "png", category: "images" },
  { id: "webp", category: "images" },
  { id: "mp3", category: "audio", minPlan: "pro" },
  { id: "wav", category: "audio", minPlan: "pro" },
  { id: "m4a", category: "audio", minPlan: "pro" },
  { id: "mp4", category: "video", minPlan: "pro" },
  { id: "mov", category: "video", minPlan: "ultra", requiresAdvancedVideo: true },
  { id: "extract_audio", category: "video", minPlan: "pro" },
];

export const CONVERTER_TARGETS: Record<Exclude<ConverterFormatId, "extract_audio">, ConverterTargetRule[]> = {
  pdf: [{ id: "jpg" }, { id: "png" }, { id: "docx", minPlan: "pro", comingSoon: true }],
  docx: [{ id: "pdf", comingSoon: true }, { id: "txt", comingSoon: true }],
  txt: [{ id: "pdf", comingSoon: true }, { id: "docx", comingSoon: true }],
  pptx: [{ id: "pdf", comingSoon: true }, { id: "jpg", minPlan: "pro", comingSoon: true }],
  jpg: [{ id: "png" }, { id: "webp" }, { id: "pdf" }],
  png: [{ id: "jpg" }, { id: "webp" }, { id: "pdf" }],
  webp: [{ id: "jpg" }, { id: "png" }, { id: "pdf" }],
  mp3: [{ id: "wav", comingSoon: true }, { id: "m4a", comingSoon: true }],
  wav: [{ id: "mp3", comingSoon: true }, { id: "m4a", comingSoon: true }],
  m4a: [{ id: "mp3", comingSoon: true }, { id: "wav", comingSoon: true }],
  mp4: [
    { id: "mp3", minPlan: "pro", comingSoon: true },
    { id: "wav", minPlan: "pro", comingSoon: true },
    { id: "extract_audio", minPlan: "pro", comingSoon: true },
    { id: "mov", minPlan: "ultra", requiresAdvancedVideo: true, comingSoon: true },
  ],
  mov: [
    { id: "mp4", minPlan: "ultra", requiresAdvancedVideo: true, comingSoon: true },
    { id: "mp3", minPlan: "ultra", requiresAdvancedVideo: true, comingSoon: true },
    { id: "wav", minPlan: "ultra", requiresAdvancedVideo: true, comingSoon: true },
    { id: "extract_audio", minPlan: "ultra", requiresAdvancedVideo: true, comingSoon: true },
  ],
};

export function normalizeConverterPlan(plan: ConverterPlanId | null | undefined): PlanId {
  return plan === "ultra" || plan === "gift" ? "ultra" : plan === "pro" ? "pro" : "basic";
}

function meetsPlan(plan: PlanId, minPlan?: PlanId) {
  if (!minPlan) return true;
  return PLAN_ORDER[plan] >= PLAN_ORDER[minPlan];
}

export function isFormatEnabledForPlan(formatId: ConverterFormatId, planLike: ConverterPlanId | null | undefined, allowAdvancedVideo = false) {
  const plan = normalizeConverterPlan(planLike);
  const format = CONVERTER_FORMATS.find((item) => item.id === formatId);
  if (!format) return false;
  if (!meetsPlan(plan, format.minPlan)) return false;
  if (format.requiresAdvancedVideo && !allowAdvancedVideo) return false;
  return true;
}

export function getFormatsByCategory(planLike: ConverterPlanId | null | undefined, allowAdvancedVideo = false) {
  return CONVERTER_FORMATS.reduce<Record<ConverterCategory, ConverterFormatDefinition[]>>(
    (acc, format) => {
      if (isFormatEnabledForPlan(format.id, planLike, allowAdvancedVideo)) {
        acc[format.category].push(format);
      }
      return acc;
    },
    { documents: [], images: [], audio: [], video: [] }
  );
}

export function getTargetOptions(
  source: ConverterFormatId | null | undefined,
  planLike: ConverterPlanId | null | undefined,
  allowAdvancedVideo = false
) {
  if (!source || source === "extract_audio") return [];
  const plan = normalizeConverterPlan(planLike);
  const rules = CONVERTER_TARGETS[source] ?? [];
  return rules.map((rule) => {
    const enabledByPlan = meetsPlan(plan, rule.minPlan);
    const enabledByVideo = !rule.requiresAdvancedVideo || allowAdvancedVideo;
    const enabledByImplementation = !rule.comingSoon;
    return {
      ...rule,
      enabled: enabledByPlan && enabledByVideo && enabledByImplementation,
      reason: !enabledByPlan ? "plan" : !enabledByVideo ? "advanced-video" : !enabledByImplementation ? "coming-soon" : null,
    };
  });
}

export function isConversionPairAllowed(
  source: ConverterFormatId | null | undefined,
  target: ConverterFormatId | null | undefined,
  planLike: ConverterPlanId | null | undefined,
  allowAdvancedVideo = false
) {
  if (!source || !target || source === "extract_audio") return false;
  return getTargetOptions(source, planLike, allowAdvancedVideo).some((option) => option.id === target && option.enabled);
}

export function validateConverterRequest(input: {
  plan: ConverterPlanId | null | undefined;
  allowAdvancedVideo?: boolean;
  from: ConverterFormatId | null | undefined;
  to: ConverterFormatId | null | undefined;
  fileSizeBytes?: number | null;
  maxFileSizeBytes?: number | null;
  fileCount?: number | null;
  batchMaxFiles?: number | null;
}): ConverterValidationResult {
  const { plan, allowAdvancedVideo = false, from, to, fileSizeBytes, maxFileSizeBytes, fileCount, batchMaxFiles } = input;
  if (!from) return { ok: false, code: "MISSING_SOURCE" };
  if (!to) return { ok: false, code: "MISSING_TARGET" };
  if (!isFormatEnabledForPlan(from, plan, allowAdvancedVideo)) return { ok: false, code: "UNSUPPORTED_SOURCE" };

  const option = getTargetOptions(from, plan, allowAdvancedVideo).find((item) => item.id === to);
  if (!option) return { ok: false, code: "INVALID_PAIR" };
  if (!option.enabled && option.reason === "plan") return { ok: false, code: "PLAN_REQUIRED" };
  if (!option.enabled && option.reason === "advanced-video") return { ok: false, code: "ADVANCED_VIDEO_REQUIRED" };
  if (!isFormatEnabledForPlan(to, plan, allowAdvancedVideo)) return { ok: false, code: "UNSUPPORTED_TARGET" };
  if (maxFileSizeBytes != null && fileSizeBytes != null && fileSizeBytes > maxFileSizeBytes) {
    return { ok: false, code: "FILE_TOO_LARGE" };
  }
  if (batchMaxFiles != null && fileCount != null && fileCount > batchMaxFiles) {
    return { ok: false, code: "BATCH_LIMIT_EXCEEDED" };
  }
  return { ok: true };
}
