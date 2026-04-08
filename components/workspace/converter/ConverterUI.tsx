"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

import {
  getFormatsByCategory,
  getTargetOptions,
  isConversionPairAllowed,
  normalizeConverterPlan,
  validateConverterRequest,
  type ConverterCategory,
  type ConverterFormatId,
} from "@/lib/converter/config";
import { convertFile, getConverterAccept, isFileCompatibleWithFormat, type ConverterResult } from "@/lib/converter/browser";

export type ConverterEntitlement = {
  plan: "basic" | "pro" | "ultra" | "gift";
  usedConverterCountToday?: number;
  converterConversionsPerDay?: number;
  converterMaxFileSizeBytes?: number;
  converterBatchMaxFiles?: number;
  converterAllowAdvancedVideo?: boolean;
  converterAllowLinkToAudio?: boolean;
  converterPriority?: "standard" | "fast" | "priority";
};

type TestModeConfig = {
  enabled: boolean;
  dailyUsageStorageKey: string;
  forceFailure?: boolean;
};

type Copy = {
  badge: string;
  workspaceDescription: string;
  lockedTitle: string;
  lockedBody: string;
  title: string;
  subtitle: string;
  fromLabel: string;
  toLabel: string;
  swapLabel: string;
  uploadTitle: string;
  uploadSubtitle: string;
  uploadHint: string;
  dragActive: string;
  browseLabel: string;
  selectedFilesLabel: string;
  supportedFormats: string;
  planLimit: string;
  temporaryNoteLabel: string;
  temporaryNote: string;
  currentPair: string;
  pairReady: string;
  pairUnavailable: string;
  targetHelp: string;
  invalidPair: string;
  planUsage: string;
  usageToday: string;
  maxFileSize: string;
  batchProcessing: string;
  speed: string;
  mediaAccess: string;
  standard: string;
  faster: string;
  priority: string;
  singleFileOnly: string;
  filesCount: string;
  noAdvancedVideo: string;
  limitedMedia: string;
  fullCommonSupport: string;
  plansLabel: string;
  dailyLimitLabel: string;
  batchLimitLabel: string;
  activePlan: string;
  basic: string;
  pro: string;
  ultra: string;
  dailyConversions: string;
  batchUpTo: string;
  noBatch: string;
  standardSpeed: string;
  fasterSpeed: string;
  priorityProcessing: string;
  basicFeature: string;
  proFeature: string;
  ultraFeature: string;
  validationFileTooLarge: string;
  validationBatch: string;
  validationInvalidPair: string;
  validationPlan: string;
  validationUnsupportedFile: string;
  validationEmpty: string;
  validationQuota: string;
  validationBatchPending: string;
  conversionFailed: string;
  convertAction: string;
  convertingAction: string;
  successTitle: string;
  successDetail: string;
  downloadAction: string;
  resultReady: string;
  previewLabel: string;
  documents: string;
  images: string;
  audio: string;
  video: string;
  pdf: string;
  docx: string;
  txt: string;
  pptx: string;
  jpg: string;
  png: string;
  webp: string;
  mp3: string;
  wav: string;
  m4a: string;
  mp4: string;
  mov: string;
  extractAudio: string;
  upgradeForMore: string;
  comingSoon: string;
};

const copy: Copy = {
  badge: "Converter",
  workspaceDescription: "Convert documents, images, audio, and common media formats",
  lockedTitle: "Sign in to open Converter",
  lockedBody: "Use a dedicated NexusDesk workspace for flexible file conversion with plan-aware limits and a cleaner upload flow.",
  title: "Convert files with a clear FROM to TO flow",
  subtitle: "Supported live conversions currently focus on lightweight PDF and image workflows. Media paths stay visible but intentionally disabled until they are wired.",
  fromLabel: "From",
  toLabel: "To",
  swapLabel: "Swap formats",
  uploadTitle: "Upload or drag and drop your file",
  uploadSubtitle: "Maximum size depends on your plan",
  uploadHint: "Supported targets update automatically from the source format you choose.",
  dragActive: "Drop files here to prepare the conversion",
  browseLabel: "Choose files",
  selectedFilesLabel: "Selected files",
  supportedFormats: "Supported formats",
  planLimit: "Plan limit",
  temporaryNoteLabel: "Processing mode",
  temporaryNote: "Supported live conversions run locally in your browser.",
  currentPair: "Current pair",
  pairReady: "Ready to convert this file.",
  pairUnavailable: "This pair is disabled on your current plan or not wired yet.",
  targetHelp: "Target options narrow down automatically after you choose a source format.",
  invalidPair: "Choose another target format for this source.",
  planUsage: "Plan & Usage",
  usageToday: "Daily conversions",
  maxFileSize: "Max file size",
  batchProcessing: "Batch processing",
  speed: "Processing speed",
  mediaAccess: "Media support",
  standard: "Standard",
  faster: "Faster",
  priority: "Priority",
  singleFileOnly: "Single file only",
  filesCount: "files",
  noAdvancedVideo: "No advanced video conversion",
  limitedMedia: "Limited media support",
  fullCommonSupport: "Full common format support",
  plansLabel: "Plan tiers",
  dailyLimitLabel: "Daily limit",
  batchLimitLabel: "Batch",
  activePlan: "Current",
  basic: "Basic",
  pro: "Pro",
  ultra: "Ultra",
  dailyConversions: "daily conversions",
  batchUpTo: "up to",
  noBatch: "No batch",
  standardSpeed: "Standard speed",
  fasterSpeed: "Faster speed",
  priorityProcessing: "Priority processing",
  basicFeature: "Live image and PDF export",
  proFeature: "More quota, media still staged",
  ultraFeature: "Higher limits, advanced media still staged",
  validationFileTooLarge: "Selected files exceed your current Converter file size limit.",
  validationBatch: "This plan does not allow that many files in one conversion.",
  validationInvalidPair: "That conversion pair is not supported.",
  validationPlan: "This conversion needs a higher plan.",
  validationUnsupportedFile: "The uploaded file does not match the selected FROM format.",
  validationEmpty: "Upload a file before converting.",
  validationQuota: "You've used all Converter runs for today. Upgrade your plan or try again tomorrow.",
  validationBatchPending: "Batch conversion is not wired yet. Upload one file at a time.",
  conversionFailed: "Unable to complete this conversion.",
  convertAction: "Convert file",
  convertingAction: "Converting...",
  successTitle: "Conversion complete",
  successDetail: "Your output is ready to download.",
  downloadAction: "Download result",
  resultReady: "Result ready",
  previewLabel: "Preview",
  documents: "Documents",
  images: "Images",
  audio: "Audio",
  video: "Video / Media",
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  pptx: "PPTX",
  jpg: "JPG",
  png: "PNG",
  webp: "WEBP",
  mp3: "MP3",
  wav: "WAV",
  m4a: "M4A",
  mp4: "MP4",
  mov: "MOV",
  extractAudio: "Extract Audio",
  upgradeForMore: "Upgrade for more",
  comingSoon: "Coming soon",
};

const categoryOrder: ConverterCategory[] = ["documents", "images", "audio", "video"];

type PlanCardDefinition = {
  id: "basic" | "pro" | "ultra";
  sizeBytes: number;
  conversionsPerDay: number;
  batchMaxFiles: number;
  speed: "standard" | "fast" | "priority";
};

const PLAN_CARD_DEFS: PlanCardDefinition[] = [
  { id: "basic", sizeBytes: 10 * 1024 * 1024, conversionsPerDay: 5, batchMaxFiles: 1, speed: "standard" },
  { id: "pro", sizeBytes: 50 * 1024 * 1024, conversionsPerDay: 30, batchMaxFiles: 3, speed: "fast" },
  { id: "ultra", sizeBytes: 200 * 1024 * 1024, conversionsPerDay: 100, batchMaxFiles: 10, speed: "priority" },
];

function formatFileSize(bytes?: number | null) {
  if (!bytes && bytes !== 0) return "--";
  if (bytes === 0) return "0 B";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb % 1 === 0 ? mb.toFixed(0) : mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb % 1 === 0 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
}

function formatLabel(formatId: ConverterFormatId) {
  return {
    pdf: copy.pdf,
    docx: copy.docx,
    txt: copy.txt,
    pptx: copy.pptx,
    jpg: copy.jpg,
    png: copy.png,
    webp: copy.webp,
    mp3: copy.mp3,
    wav: copy.wav,
    m4a: copy.m4a,
    mp4: copy.mp4,
    mov: copy.mov,
    extract_audio: copy.extractAudio,
  }[formatId];
}

function categoryLabel(category: ConverterCategory) {
  return {
    documents: copy.documents,
    images: copy.images,
    audio: copy.audio,
    video: copy.video,
  }[category];
}

function planLabel(plan: ConverterEntitlement["plan"]) {
  const normalized = normalizeConverterPlan(plan);
  if (normalized === "ultra") return copy.ultra;
  if (normalized === "pro") return copy.pro;
  return copy.basic;
}

function speedLabel(priority: ConverterEntitlement["converterPriority"]) {
  if (priority === "priority") return copy.priority;
  if (priority === "fast") return copy.faster;
  return copy.standard;
}

function planTierSpeedLabel(speed: PlanCardDefinition["speed"]) {
  if (speed === "priority") return copy.priorityProcessing;
  if (speed === "fast") return copy.fasterSpeed;
  return copy.standardSpeed;
}

function mediaSupportLabel(planId: PlanCardDefinition["id"]) {
  if (planId === "ultra") return copy.ultraFeature;
  if (planId === "pro") return copy.proFeature;
  return copy.basicFeature;
}

function currentMediaSupport(entitlement: ConverterEntitlement | null) {
  const normalized = normalizeConverterPlan(entitlement?.plan);
  if (normalized === "ultra" && entitlement?.converterAllowAdvancedVideo) return copy.fullCommonSupport;
  if (normalized === "pro") return copy.limitedMedia;
  return copy.noAdvancedVideo;
}

function buildSourceOptions(entitlement: ConverterEntitlement | null) {
  return getFormatsByCategory(entitlement?.plan ?? "basic", Boolean(entitlement?.converterAllowAdvancedVideo));
}

function OptionMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/20 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}

export function ConverterUI({
  locked,
  entitlement,
  testMode,
}: {
  isZh: boolean;
  locked: boolean;
  entitlement: ConverterEntitlement | null;
  testMode?: TestModeConfig | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fromFormat, setFromFormat] = useState<ConverterFormatId>("pdf");
  const [toFormat, setToFormat] = useState<ConverterFormatId>("jpg");
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"neutral" | "warning" | "success">("neutral");
  const [result, setResult] = useState<ConverterResult | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [usedToday, setUsedToday] = useState(entitlement?.usedConverterCountToday ?? 0);

  useEffect(() => {
    if (testMode?.enabled && typeof window !== "undefined") {
      const raw = window.localStorage.getItem(testMode.dailyUsageStorageKey);
      if (raw != null) {
        const parsed = Number.parseInt(raw, 10);
        setUsedToday(Number.isFinite(parsed) ? parsed : entitlement?.usedConverterCountToday ?? 0);
        return;
      }
    }
    setUsedToday(entitlement?.usedConverterCountToday ?? 0);
  }, [entitlement?.usedConverterCountToday, testMode?.dailyUsageStorageKey, testMode?.enabled]);

  const sourceGroups = useMemo(() => buildSourceOptions(entitlement), [entitlement]);
  const targetOptions = useMemo(
    () => getTargetOptions(fromFormat, entitlement?.plan ?? "basic", Boolean(entitlement?.converterAllowAdvancedVideo)),
    [entitlement?.converterAllowAdvancedVideo, entitlement?.plan, fromFormat]
  );
  const enabledTarget = targetOptions.find((option) => option.enabled)?.id ?? null;
  const activeToFormat = targetOptions.some((option) => option.id === toFormat && option.enabled) ? toFormat : enabledTarget;
  const currentPairValid = activeToFormat
    ? isConversionPairAllowed(fromFormat, activeToFormat, entitlement?.plan ?? "basic", Boolean(entitlement?.converterAllowAdvancedVideo))
    : false;
  const activePlan = normalizeConverterPlan(entitlement?.plan);
  const supportedFormatsValue = useMemo(
    () => categoryOrder.flatMap((category) => sourceGroups[category].map((item) => formatLabel(item.id))).join(" · "),
    [sourceGroups]
  );

  function setFeedback(tone: "neutral" | "warning" | "success", nextMessage: string | null) {
    setMessageTone(tone);
    setMessage(nextMessage);
  }

  function persistUsedToday(nextUsedToday: number) {
    setUsedToday(nextUsedToday);
    if (testMode?.enabled && typeof window !== "undefined") {
      window.localStorage.setItem(testMode.dailyUsageStorageKey, String(nextUsedToday));
    }
  }

  function getValidationCopy(code: string) {
    switch (code) {
      case "FILE_TOO_LARGE":
        return copy.validationFileTooLarge;
      case "BATCH_LIMIT_EXCEEDED":
        return copy.validationBatch;
      case "PLAN_REQUIRED":
      case "ADVANCED_VIDEO_REQUIRED":
        return copy.validationPlan;
      default:
        return copy.validationInvalidPair;
    }
  }

  function validateFiles(files: File[]) {
    if (files.length === 0) return { ok: false as const, message: copy.validationEmpty };

    const maxBatchFiles = entitlement?.converterBatchMaxFiles ?? 1;
    if (files.length > 1 && maxBatchFiles > 1) {
      return { ok: false as const, message: copy.validationBatchPending };
    }

    const requestValidation = validateConverterRequest({
      plan: entitlement?.plan ?? "basic",
      allowAdvancedVideo: entitlement?.converterAllowAdvancedVideo,
      from: fromFormat,
      to: activeToFormat,
      fileCount: files.length,
      batchMaxFiles: maxBatchFiles,
      fileSizeBytes: files.reduce((max, file) => Math.max(max, file.size), 0),
      maxFileSizeBytes: entitlement?.converterMaxFileSizeBytes ?? 10 * 1024 * 1024,
    });

    if (!requestValidation.ok) return { ok: false as const, message: getValidationCopy(requestValidation.code) };
    if (files.some((file) => !isFileCompatibleWithFormat(file, fromFormat))) {
      return { ok: false as const, message: copy.validationUnsupportedFile };
    }
    if ((entitlement?.converterConversionsPerDay ?? 0) > 0 && usedToday >= (entitlement?.converterConversionsPerDay ?? 0)) {
      return { ok: false as const, message: copy.validationQuota };
    }
    return { ok: true as const };
  }

  async function handleSelectedFiles(nextFiles: FileList | null) {
    if (!nextFiles) return;
    const files = Array.from(nextFiles);
    setSelectedFiles(files);
    setResult(null);
    const validation = validateFiles(files);
    setFeedback(validation.ok ? "neutral" : "warning", validation.ok ? copy.pairReady : validation.message);
  }

  async function handleConvert() {
    if (!activeToFormat) {
      setFeedback("warning", copy.validationInvalidPair);
      return;
    }

    const validation = validateFiles(selectedFiles);
    if (!validation.ok) {
      setFeedback("warning", validation.message);
      return;
    }

    setIsConverting(true);
    setResult(null);
    setFeedback("neutral", null);

    try {
      if (testMode?.forceFailure) throw new Error("FORCED_FAILURE");
      const nextResult = await convertFile({ file: selectedFiles[0], from: fromFormat, to: activeToFormat });
      setResult(nextResult);
      setFeedback("success", `${copy.successTitle}. ${copy.successDetail}`);
      persistUsedToday(usedToday + 1);
    } catch (error) {
      console.error("[converter] conversion failed", error);
      setFeedback("warning", copy.conversionFailed);
    } finally {
      setIsConverting(false);
    }
  }

  function handleSwap() {
    if (!activeToFormat || !isConversionPairAllowed(activeToFormat, fromFormat, entitlement?.plan ?? "basic", Boolean(entitlement?.converterAllowAdvancedVideo))) {
      setFeedback("warning", copy.invalidPair);
      return;
    }
    setResult(null);
    setSelectedFiles([]);
    setFeedback("neutral", null);
    setFromFormat(activeToFormat);
    setToFormat(fromFormat);
  }

  useEffect(() => {
    setSelectedFiles([]);
    setResult(null);
    setFeedback("neutral", null);
  }, [fromFormat, toFormat]);

  if (locked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-10 md:px-8">
        <div className="w-full max-w-4xl rounded-[34px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_28px_120px_rgba(2,6,23,0.45)]">
          <p className="text-center text-[11px] uppercase tracking-[0.32em] text-slate-500">{copy.badge}</p>
          <h2 className="mt-4 text-center text-3xl font-semibold tracking-tight text-slate-50 md:text-4xl">{copy.lockedTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-7 text-slate-300">{copy.lockedBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 md:py-10" data-testid="converter-ui">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[38px] border border-white/10 bg-white/[0.04] px-5 py-8 shadow-[0_36px_120px_rgba(2,6,23,0.48)] md:px-8 md:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] uppercase tracking-[0.34em] text-slate-500">{copy.badge}</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-50 md:text-5xl">{copy.title}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-[15px]">{copy.subtitle}</p>
          </div>

          <div className="mx-auto mt-8 max-w-4xl rounded-[30px] border border-white/10 bg-black/20 p-4 md:p-5">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto] md:items-end">
              <label className="block">
                <span className="mb-2 block text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.fromLabel}</span>
                <select
                  value={fromFormat}
                  onChange={(event) => {
                    const nextFrom = event.target.value as ConverterFormatId;
                    const nextTargets = getTargetOptions(nextFrom, entitlement?.plan ?? "basic", Boolean(entitlement?.converterAllowAdvancedVideo));
                    const nextTo = nextTargets.find((option) => option.enabled)?.id;
                    setFromFormat(nextFrom);
                    if (nextTo) setToFormat(nextTo);
                  }}
                  className="h-14 w-full rounded-[22px] border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-slate-100"
                  aria-label={copy.fromLabel}
                >
                  {categoryOrder.map((category) => {
                    const formats = sourceGroups[category];
                    if (formats.length === 0) return null;
                    return (
                      <optgroup key={category} label={categoryLabel(category)}>
                        {formats.map((format) => (
                          <option key={format.id} value={format.id}>
                            {formatLabel(format.id)}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </label>

              <div className="flex items-center justify-center pb-1">
                <button
                  type="button"
                  onClick={handleSwap}
                  className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-slate-200"
                  aria-label={copy.swapLabel}
                >
                  ⇄
                </button>
              </div>

              <label className="block">
                <span className="mb-2 block text-left text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.toLabel}</span>
                <select
                  value={activeToFormat ?? ""}
                  onChange={(event) => setToFormat(event.target.value as ConverterFormatId)}
                  className="h-14 w-full rounded-[22px] border border-white/10 bg-white/[0.06] px-4 text-sm font-medium text-slate-100"
                  aria-label={copy.toLabel}
                >
                  {targetOptions.map((option) => (
                    <option key={option.id} value={option.id} disabled={!option.enabled}>
                      {formatLabel(option.id)}
                      {!option.enabled ? ` · ${option.comingSoon ? copy.comingSoon : copy.upgradeForMore}` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <div className="pb-1 text-left md:text-right">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{copy.currentPair}</p>
                <p className="mt-2 text-sm font-medium text-slate-100">
                  {formatLabel(fromFormat)} → {activeToFormat ? formatLabel(activeToFormat) : "--"}
                </p>
              </div>
            </div>

            <p className="mt-3 text-center text-[12px] text-slate-400">{currentPairValid ? copy.targetHelp : copy.pairUnavailable}</p>
          </div>

          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) setDragActive(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragActive(false);
              handleSelectedFiles(event.dataTransfer.files);
            }}
            data-testid="converter-dropzone"
            className={[
              "mx-auto mt-6 max-w-4xl rounded-[32px] border border-dashed px-6 py-10 text-center md:px-8 md:py-12",
              dragActive ? "border-sky-300/50 bg-sky-400/5" : "border-white/12 bg-white/[0.02]",
            ].join(" ")}
          >
            <input ref={inputRef} type="file" multiple hidden accept={getConverterAccept(fromFormat)} onChange={(event) => handleSelectedFiles(event.target.files)} data-testid="converter-file-input" />
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-50">{dragActive ? copy.dragActive : copy.uploadTitle}</h3>
            <p className="mt-2 text-sm text-slate-400">{copy.uploadSubtitle}</p>
            <p className="mt-2 text-[12px] text-slate-500">
              {copy.planLimit}: {formatFileSize(entitlement?.converterMaxFileSizeBytes)}
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button type="button" onClick={() => inputRef.current?.click()} className="h-12 rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-emerald-400 px-5 text-sm font-semibold text-white">
                {copy.browseLabel}
              </button>
              <span className="text-[12px] text-slate-500">{copy.uploadHint}</span>
            </div>

            {selectedFiles.length > 0 ? (
              <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 p-4 text-left">
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{copy.selectedFilesLabel}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedFiles.map((file) => (
                    <div key={`${file.name}-${file.size}`} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                      <p className="truncate text-sm font-medium text-slate-100">{file.name}</p>
                      <p className="mt-1 text-[12px] text-slate-400">{formatFileSize(file.size)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleConvert}
                disabled={!currentPairValid || isConverting}
                className="h-12 rounded-full bg-white px-6 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
              >
                {isConverting ? copy.convertingAction : copy.convertAction}
              </button>
            </div>

            {message ? (
              <p className={["mt-5 text-sm", messageTone === "warning" ? "text-amber-300" : messageTone === "success" ? "text-emerald-300" : "text-slate-300"].join(" ")} role={messageTone === "warning" ? "alert" : "status"}>
                {message}
              </p>
            ) : (
              <p className="mt-5 text-sm text-slate-300">{currentPairValid ? copy.pairReady : copy.invalidPair}</p>
            )}

            {result ? (
              <div className="mt-6 rounded-[24px] border border-emerald-300/20 bg-emerald-400/5 p-4 text-left" data-testid="converter-result">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200/80">{copy.resultReady}</p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-50">{copy.successTitle}</h4>
                    <p className="mt-1 text-sm text-slate-300">{result.fileName}</p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      {result.mimeType} · {formatFileSize(result.sizeBytes)}
                    </p>
                  </div>
                  <a href={result.downloadUrl} download={result.fileName} className="inline-flex h-11 items-center justify-center rounded-full border border-emerald-300/20 bg-white px-5 text-sm font-semibold text-slate-950">
                    {copy.downloadAction}
                  </a>
                </div>
                {result.previewUrl ? (
                  <div className="mt-4">
                    <p className="mb-2 text-[10px] uppercase tracking-[0.24em] text-slate-500">{copy.previewLabel}</p>
                    <img src={result.previewUrl} alt={result.fileName} className="max-h-64 rounded-2xl border border-white/10 object-contain" />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="mx-auto mt-5 grid max-w-4xl gap-3 md:grid-cols-3">
            <OptionMeta label={copy.supportedFormats} value={supportedFormatsValue} />
            <OptionMeta label={copy.planLimit} value={`${planLabel(entitlement?.plan ?? "basic")} · ${formatFileSize(entitlement?.converterMaxFileSizeBytes)}`} />
            <OptionMeta label={copy.temporaryNoteLabel} value={copy.temporaryNote} />
          </div>
        </section>

        <section className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{copy.planUsage}</p>
                <h3 className="mt-2 text-lg font-semibold text-slate-50">{planLabel(entitlement?.plan ?? "basic")}</h3>
                <p className="mt-1 text-sm text-slate-400">{copy.workspaceDescription}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{copy.speed}</p>
                <p className="mt-1 text-sm font-semibold text-slate-100">{speedLabel(entitlement?.converterPriority)}</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <OptionMeta label={copy.usageToday} value={`${usedToday} / ${entitlement?.converterConversionsPerDay ?? "--"}`} />
              <OptionMeta label={copy.maxFileSize} value={formatFileSize(entitlement?.converterMaxFileSizeBytes)} />
              <OptionMeta label={copy.batchProcessing} value={entitlement?.converterBatchMaxFiles && entitlement.converterBatchMaxFiles > 1 ? `${copy.batchUpTo} ${entitlement.converterBatchMaxFiles} ${copy.filesCount}` : copy.singleFileOnly} />
              <OptionMeta label={copy.mediaAccess} value={currentMediaSupport(entitlement)} />
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5">
            <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">{copy.plansLabel}</p>
            <div className="mt-4 space-y-3">
              {PLAN_CARD_DEFS.map((plan) => {
                const isActive = plan.id === activePlan;
                return (
                  <div key={plan.id} className={["rounded-[24px] border px-4 py-4", isActive ? "border-sky-400/35 bg-sky-400/5" : "border-white/8 bg-black/20"].join(" ")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-50">{plan.id === "basic" ? copy.basic : plan.id === "pro" ? copy.pro : copy.ultra}</p>
                        {isActive ? <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-2 py-0.5 text-[10px] text-sky-100">{copy.activePlan}</span> : null}
                      </div>
                      <p className="text-[12px] text-slate-400">{formatFileSize(plan.sizeBytes)}</p>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{copy.dailyLimitLabel}</p>
                        <p className="mt-1 text-sm text-slate-100">
                          {plan.conversionsPerDay} {copy.dailyConversions}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{copy.batchLimitLabel}</p>
                        <p className="mt-1 text-sm text-slate-100">{plan.batchMaxFiles > 1 ? `${copy.batchUpTo} ${plan.batchMaxFiles}` : copy.noBatch}</p>
                      </div>
                      <div className="rounded-2xl border border-white/8 bg-black/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">{copy.speed}</p>
                        <p className="mt-1 text-sm text-slate-100">{planTierSpeedLabel(plan.speed)}</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm text-slate-300">{mediaSupportLabel(plan.id)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
