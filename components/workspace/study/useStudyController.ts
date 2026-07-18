"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { extractDocumentText } from "./extractors";
import type { StudyEntitlement, StudyMode, StudySessionListItem } from "./study-types";

const defaultQuizTypes = ["multiple_choice", "fill_blank", "matching"] as const;

export function modeLabel(mode: StudyMode) {
  if (mode === "notes") return "Notes";
  if (mode === "flashcards") return "Flashcards";
  return "Quiz";
}

function userFriendlyStudyError(errorCode: string | undefined, fallback: string) {
  if (errorCode === "STUDY_QUOTA_EXCEEDED") return "You've used all AI Study generations for today. Upgrade your plan or come back tomorrow.";
  if (errorCode === "STUDY_COOLDOWN_ACTIVE") return "Please wait a short moment before generating another study result.";
  if (errorCode === "DB_UNAVAILABLE") return "Study storage is temporarily unavailable. Your document is still selected; please try again.";
  return fallback || "Study generation failed. Your document is still selected, so you can try again.";
}

export function useStudyController({
  locked,
  entitlement,
  onUsageRefresh,
}: {
  isZh: boolean;
  locked: boolean;
  entitlement: StudyEntitlement | null;
  onUsageRefresh: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [detectedTitle, setDetectedTitle] = useState("");
  const [outputType, setOutputType] = useState<StudyMode | "">("");
  const [status, setStatus] = useState("");
  const [localExtractionWarning, setLocalExtractionWarning] = useState<string | null>(null);
  const [history, setHistory] = useState<StudySessionListItem[]>([]);
  const [newHistoryId, setNewHistoryId] = useState<string | null>(null);

  const limits = entitlement ? {
    maxFileSizeBytes: entitlement.studyMaxFileSizeBytes,
    maxExtractedChars: entitlement.studyMaxExtractedChars,
  } : null;

  const canGenerate = Boolean(file && extractedText && outputType && !extracting && !generating && !locked && entitlement);

  const loadHistory = useCallback(async () => {
    if (locked || !entitlement) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/study/sessions", { cache: "no-store", credentials: "include" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error("Study History could not be loaded.");
      setHistory(Array.isArray(data?.sessions) ? data.sessions : []);
    } catch (historyError) {
      setError(historyError instanceof Error ? historyError.message : "Study History could not be loaded.");
    } finally {
      setHistoryLoading(false);
    }
  }, [entitlement, locked]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const processingCount = useMemo(() => history.filter((item) => item.status === "PROCESSING").length, [history]);
  useEffect(() => {
    if (processingCount === 0) return;
    const timer = window.setTimeout(() => void loadHistory(), 2_500);
    return () => window.clearTimeout(timer);
  }, [loadHistory, processingCount]);

  async function handleFileSelection(nextFile: File | null) {
    setError(null);
    setLocalExtractionWarning(null);
    setExtractedText("");
    setStatus("");
    setFile(nextFile);
    setDetectedTitle(nextFile ? nextFile.name.replace(/\.[^.]+$/, "") : "");
    setNewHistoryId(null);

    if (!nextFile) return;
    if (limits && nextFile.size > limits.maxFileSizeBytes) {
      setError(`This document exceeds your current upload limit of ${Math.round(limits.maxFileSizeBytes / (1024 * 1024))} MB.`);
      return;
    }

    setExtracting(true);
    setStatus("Extracting document text…");
    try {
      const text = (await extractDocumentText(nextFile)).replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      if (!text) throw new Error("No readable text was found in this document.");
      setExtractedText(text);
      if (limits && text.length > limits.maxExtractedChars) setLocalExtractionWarning("This document is long, so generation will use the supported portion of its text.");
      setStatus("Document ready");
    } catch (extractError) {
      setError(extractError instanceof Error ? extractError.message : "Document extraction failed.");
      setStatus("");
    } finally {
      setExtracting(false);
    }
  }

  async function generate() {
    if (!canGenerate || !file || !outputType) return;
    setError(null);
    setGenerating(true);
    setNewHistoryId(null);
    setStatus("Generating study material…");

    try {
      const response = await fetch("/api/study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          extractedText,
          title: detectedTitle || file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
          fileSizeBytes: file.size,
          mimeType: file.type,
          selectedModes: [outputType],
          quizTypes: outputType === "quiz" ? defaultQuizTypes : undefined,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) throw new Error(userFriendlyStudyError(data?.error, data?.message || "Study generation failed."));

      const sessionId = data?.session?.id as string | undefined;
      setStatus("Generation complete. Open it from Study History.");
      setNewHistoryId(sessionId ?? null);
      await Promise.all([onUsageRefresh(), loadHistory()]);
    } catch (generationError) {
      setError(generationError instanceof Error ? generationError.message : "Study generation failed.");
      setStatus("");
      await Promise.all([onUsageRefresh(), loadHistory()]);
    } finally {
      setGenerating(false);
    }
  }

  function canRetry(item: StudySessionListItem) {
    return item.status === "FAILED" && Boolean(file && extractedText && outputType === item.selectedModes[0] && file.name === item.fileName);
  }

  return {
    file,
    dragActive,
    extracting,
    generating,
    historyLoading,
    error,
    extractedText,
    detectedTitle,
    outputType,
    status,
    localExtractionWarning,
    history,
    newHistoryId,
    canGenerate,
    canRetry,
    modeLabel,
    setDragActive,
    setDetectedTitle,
    setOutputType,
    handleFileSelection,
    generate,
  };
}
