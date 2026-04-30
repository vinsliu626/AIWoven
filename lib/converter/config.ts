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

export type ConverterRunLocation = "client" | "server";

export type ConverterAvailabilityReason = "coming-soon" | "plan" | "advanced-video";

export type ConverterFormatDefinition = {
  id: ConverterFormatId;
  category: ConverterCategory;
};

export type ConverterSourceOption = ConverterFormatDefinition & {
  enabled: boolean;
  reason: ConverterAvailabilityReason | null;
  comingSoonReason?: string;
};

export type ConverterTargetRule = {
  id: ConverterFormatId;
  enabled: boolean;
  reason: ConverterAvailabilityReason | null;
  supported: boolean;
  runsOn: ConverterRunLocation;
  inputMimeTypes: string[];
  outputMimeType: string;
  maxFileSizeBytes: number;
  label: string;
  comingSoon?: boolean;
  comingSoonReason?: string;
};

export type ConverterPairDefinition = {
  from: ConverterFormatId;
  to: ConverterFormatId;
  supported: boolean;
  inputMimeTypes: string[];
  outputMimeType: string;
  maxFileSizeBytes: number;
  runsOn: ConverterRunLocation;
  label: string;
  comingSoonReason?: string;
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
  { id: "mp3", category: "audio" },
  { id: "wav", category: "audio" },
  { id: "m4a", category: "audio" },
  { id: "mp4", category: "video" },
  { id: "mov", category: "video" },
  { id: "extract_audio", category: "video" },
];

export const CONVERTER_PAIRS: ConverterPairDefinition[] = [
  {
    from: "pdf",
    to: "jpg",
    supported: true,
    inputMimeTypes: ["application/pdf"],
    outputMimeType: "image/jpeg",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "PDF to JPG",
  },
  {
    from: "pdf",
    to: "png",
    supported: true,
    inputMimeTypes: ["application/pdf"],
    outputMimeType: "image/png",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "PDF to PNG",
  },
  {
    from: "pdf",
    to: "webp",
    supported: true,
    inputMimeTypes: ["application/pdf"],
    outputMimeType: "image/webp",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "PDF to WEBP",
  },
  {
    from: "docx",
    to: "pdf",
    supported: false,
    inputMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    outputMimeType: "application/pdf",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "server",
    label: "DOCX to PDF",
    comingSoonReason: "DOCX conversion is not live yet.",
  },
  {
    from: "docx",
    to: "txt",
    supported: false,
    inputMimeTypes: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    outputMimeType: "text/plain",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "server",
    label: "DOCX to TXT",
    comingSoonReason: "DOCX text extraction is not live yet.",
  },
  {
    from: "txt",
    to: "pdf",
    supported: false,
    inputMimeTypes: ["text/plain"],
    outputMimeType: "application/pdf",
    maxFileSizeBytes: 10 * 1024 * 1024,
    runsOn: "client",
    label: "TXT to PDF",
    comingSoonReason: "TXT to PDF is not enabled yet.",
  },
  {
    from: "txt",
    to: "docx",
    supported: false,
    inputMimeTypes: ["text/plain"],
    outputMimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    maxFileSizeBytes: 10 * 1024 * 1024,
    runsOn: "server",
    label: "TXT to DOCX",
    comingSoonReason: "TXT to DOCX is not enabled yet.",
  },
  {
    from: "pptx",
    to: "pdf",
    supported: false,
    inputMimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    outputMimeType: "application/pdf",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "PPTX to PDF",
    comingSoonReason: "PPTX conversion is not live yet.",
  },
  {
    from: "pptx",
    to: "jpg",
    supported: false,
    inputMimeTypes: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    outputMimeType: "image/jpeg",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "PPTX to JPG",
    comingSoonReason: "Slide export is not live yet.",
  },
  {
    from: "jpg",
    to: "png",
    supported: true,
    inputMimeTypes: ["image/jpeg"],
    outputMimeType: "image/png",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "JPG to PNG",
  },
  {
    from: "jpg",
    to: "webp",
    supported: true,
    inputMimeTypes: ["image/jpeg"],
    outputMimeType: "image/webp",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "JPG to WEBP",
  },
  {
    from: "jpg",
    to: "pdf",
    supported: true,
    inputMimeTypes: ["image/jpeg"],
    outputMimeType: "application/pdf",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "JPG to PDF",
  },
  {
    from: "png",
    to: "jpg",
    supported: true,
    inputMimeTypes: ["image/png"],
    outputMimeType: "image/jpeg",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "PNG to JPG",
  },
  {
    from: "png",
    to: "webp",
    supported: true,
    inputMimeTypes: ["image/png"],
    outputMimeType: "image/webp",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "PNG to WEBP",
  },
  {
    from: "png",
    to: "pdf",
    supported: true,
    inputMimeTypes: ["image/png"],
    outputMimeType: "application/pdf",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "PNG to PDF",
  },
  {
    from: "webp",
    to: "jpg",
    supported: true,
    inputMimeTypes: ["image/webp"],
    outputMimeType: "image/jpeg",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "WEBP to JPG",
  },
  {
    from: "webp",
    to: "png",
    supported: true,
    inputMimeTypes: ["image/webp"],
    outputMimeType: "image/png",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "WEBP to PNG",
  },
  {
    from: "webp",
    to: "pdf",
    supported: true,
    inputMimeTypes: ["image/webp"],
    outputMimeType: "application/pdf",
    maxFileSizeBytes: 20 * 1024 * 1024,
    runsOn: "client",
    label: "WEBP to PDF",
  },
  {
    from: "mp3",
    to: "wav",
    supported: false,
    inputMimeTypes: ["audio/mpeg"],
    outputMimeType: "audio/wav",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "MP3 to WAV",
    comingSoonReason: "Audio conversion is not live yet.",
  },
  {
    from: "mp3",
    to: "m4a",
    supported: false,
    inputMimeTypes: ["audio/mpeg"],
    outputMimeType: "audio/mp4",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "MP3 to M4A",
    comingSoonReason: "Audio conversion is not live yet.",
  },
  {
    from: "wav",
    to: "mp3",
    supported: false,
    inputMimeTypes: ["audio/wav"],
    outputMimeType: "audio/mpeg",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "WAV to MP3",
    comingSoonReason: "Audio conversion is not live yet.",
  },
  {
    from: "wav",
    to: "m4a",
    supported: false,
    inputMimeTypes: ["audio/wav"],
    outputMimeType: "audio/mp4",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "WAV to M4A",
    comingSoonReason: "Audio conversion is not live yet.",
  },
  {
    from: "m4a",
    to: "mp3",
    supported: false,
    inputMimeTypes: ["audio/mp4"],
    outputMimeType: "audio/mpeg",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "M4A to MP3",
    comingSoonReason: "Audio conversion is not live yet.",
  },
  {
    from: "m4a",
    to: "wav",
    supported: false,
    inputMimeTypes: ["audio/mp4"],
    outputMimeType: "audio/wav",
    maxFileSizeBytes: 30 * 1024 * 1024,
    runsOn: "server",
    label: "M4A to WAV",
    comingSoonReason: "Audio conversion is not live yet.",
  },
  {
    from: "mp4",
    to: "mp3",
    supported: false,
    inputMimeTypes: ["video/mp4"],
    outputMimeType: "audio/mpeg",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "MP4 to MP3",
    comingSoonReason: "Video audio extraction is not live yet.",
  },
  {
    from: "mp4",
    to: "wav",
    supported: false,
    inputMimeTypes: ["video/mp4"],
    outputMimeType: "audio/wav",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "MP4 to WAV",
    comingSoonReason: "Video audio extraction is not live yet.",
  },
  {
    from: "mp4",
    to: "extract_audio",
    supported: false,
    inputMimeTypes: ["video/mp4"],
    outputMimeType: "audio/mpeg",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "Extract audio from MP4",
    comingSoonReason: "Video audio extraction is not live yet.",
  },
  {
    from: "mp4",
    to: "mov",
    supported: false,
    inputMimeTypes: ["video/mp4"],
    outputMimeType: "video/quicktime",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "MP4 to MOV",
    comingSoonReason: "Video conversion is not live yet.",
  },
  {
    from: "mov",
    to: "mp4",
    supported: false,
    inputMimeTypes: ["video/quicktime"],
    outputMimeType: "video/mp4",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "MOV to MP4",
    comingSoonReason: "Video conversion is not live yet.",
  },
  {
    from: "mov",
    to: "mp3",
    supported: false,
    inputMimeTypes: ["video/quicktime"],
    outputMimeType: "audio/mpeg",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "MOV to MP3",
    comingSoonReason: "Video audio extraction is not live yet.",
  },
  {
    from: "mov",
    to: "wav",
    supported: false,
    inputMimeTypes: ["video/quicktime"],
    outputMimeType: "audio/wav",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "MOV to WAV",
    comingSoonReason: "Video audio extraction is not live yet.",
  },
  {
    from: "mov",
    to: "extract_audio",
    supported: false,
    inputMimeTypes: ["video/quicktime"],
    outputMimeType: "audio/mpeg",
    maxFileSizeBytes: 50 * 1024 * 1024,
    runsOn: "server",
    label: "Extract audio from MOV",
    comingSoonReason: "Video audio extraction is not live yet.",
  },
];

const SUPPORTED_SOURCE_IDS = new Set(CONVERTER_PAIRS.filter((pair) => pair.supported).map((pair) => pair.from));
const SUPPORTED_TARGET_IDS = new Set(CONVERTER_PAIRS.filter((pair) => pair.supported).map((pair) => pair.to));

export function normalizeConverterPlan(plan: ConverterPlanId | null | undefined): PlanId {
  return plan === "ultra" || plan === "gift" ? "ultra" : plan === "pro" ? "pro" : "basic";
}

function meetsPlan(plan: PlanId, minPlan?: PlanId) {
  if (!minPlan) return true;
  return PLAN_ORDER[plan] >= PLAN_ORDER[minPlan];
}

export function getPdfPageLimit(planLike: ConverterPlanId | null | undefined) {
  const plan = normalizeConverterPlan(planLike);
  if (plan === "ultra") return 20;
  if (plan === "pro") return 10;
  return 5;
}

export function getSupportedConversionPair(from: ConverterFormatId, to: ConverterFormatId) {
  const pair = CONVERTER_PAIRS.find((item) => item.from === from && item.to === to);
  return pair?.supported ? pair : null;
}

export function isFormatEnabledForPlan(formatId: ConverterFormatId, planLike: ConverterPlanId | null | undefined, allowAdvancedVideo = false) {
  void normalizeConverterPlan(planLike);
  void allowAdvancedVideo;
  return SUPPORTED_SOURCE_IDS.has(formatId) || SUPPORTED_TARGET_IDS.has(formatId);
}

export function getFormatsByCategory(planLike: ConverterPlanId | null | undefined, allowAdvancedVideo = false) {
  void normalizeConverterPlan(planLike);
  void allowAdvancedVideo;
  return CONVERTER_FORMATS.reduce<Record<ConverterCategory, ConverterSourceOption[]>>(
    (acc, format) => {
      const enabled = SUPPORTED_SOURCE_IDS.has(format.id);
      acc[format.category].push({
        ...format,
        enabled,
        reason: enabled ? null : "coming-soon",
        comingSoonReason: enabled ? undefined : `${format.id.toUpperCase()} conversion options are coming soon.`,
      });
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
  const _plan = normalizeConverterPlan(planLike);
  void allowAdvancedVideo;
  if (!source) return [];

  return CONVERTER_PAIRS.filter((pair) => pair.from === source).map<ConverterTargetRule>((pair) => ({
    id: pair.to,
    enabled: pair.supported && meetsPlan(_plan),
    reason: pair.supported ? null : "coming-soon",
    supported: pair.supported,
    runsOn: pair.runsOn,
    inputMimeTypes: pair.inputMimeTypes,
    outputMimeType: pair.outputMimeType,
    maxFileSizeBytes: pair.maxFileSizeBytes,
    label: pair.label,
    comingSoon: !pair.supported,
    comingSoonReason: pair.comingSoonReason,
  }));
}

export function isConversionPairAllowed(
  source: ConverterFormatId | null | undefined,
  target: ConverterFormatId | null | undefined,
  planLike: ConverterPlanId | null | undefined,
  allowAdvancedVideo = false
) {
  if (!source || !target) return false;
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
  if (!SUPPORTED_SOURCE_IDS.has(from)) return { ok: false, code: "UNSUPPORTED_SOURCE" };

  const option = getTargetOptions(from, plan, allowAdvancedVideo).find((item) => item.id === to);
  if (!option) return { ok: false, code: "INVALID_PAIR" };
  if (!option.enabled && option.reason === "plan") return { ok: false, code: "PLAN_REQUIRED" };
  if (!option.enabled && option.reason === "advanced-video") return { ok: false, code: "ADVANCED_VIDEO_REQUIRED" };
  if (!SUPPORTED_TARGET_IDS.has(to)) return { ok: false, code: "UNSUPPORTED_TARGET" };
  if (!option.supported) return { ok: false, code: "INVALID_PAIR" };
  if (maxFileSizeBytes != null && fileSizeBytes != null && fileSizeBytes > maxFileSizeBytes) {
    return { ok: false, code: "FILE_TOO_LARGE" };
  }
  if (batchMaxFiles != null && fileCount != null && fileCount > batchMaxFiles) {
    return { ok: false, code: "BATCH_LIMIT_EXCEEDED" };
  }
  return { ok: true };
}
