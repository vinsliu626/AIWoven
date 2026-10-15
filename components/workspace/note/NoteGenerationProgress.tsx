"use client";

import React from "react";
import type { NotePhase } from "./useNoteController";

const PHASE_COPY: Record<NotePhase, { title: string; description: string }> = {
  idle: { title: "Ready", description: "Choose Upload, Record, or Text to create structured notes." },
  uploading: { title: "Uploading audio", description: "Your audio is being transferred securely. You can cancel at any time." },
  transcribing: { title: "Transcribing", description: "Converting the audio into text. Longer recordings can take a few minutes." },
  organizing: { title: "Organizing notes", description: "Turning the source material into a clear, structured study note." },
  finalizing: { title: "Finalizing", description: "Finishing the note and checking the final structure." },
  done: { title: "Notes ready", description: "Your generated note is available below." },
  error: { title: "Generation interrupted", description: "The request did not complete." },
};

export function NoteGenerationProgress({
  phase,
  uploadProgress,
  resultReady,
  error,
  traceId,
  failedPhase,
  retryable,
  onRetry,
}: {
  isZh: boolean;
  loading: boolean;
  phase: NotePhase;
  uploadProgress: number;
  resultReady: boolean;
  error?: string | null;
  traceId?: string | null;
  failedPhase?: NotePhase | null;
  retryable?: boolean;
  onRetry?: () => void;
}) {
  const effectivePhase: NotePhase = error ? "error" : resultReady ? "done" : phase;
  const copy = PHASE_COPY[effectivePhase];
  const failedLabel = failedPhase && failedPhase !== "error" ? PHASE_COPY[failedPhase].title : "Generation";
  const showUploadProgress = effectivePhase === "uploading";
  const isWorking = effectivePhase === "transcribing" || effectivePhase === "organizing" || effectivePhase === "finalizing";

  return (
    <div className={`rounded-2xl border p-5 ${error ? "border-red-200 bg-red-50" : "border-slate-200 bg-slate-50"}`} aria-live="polite">
      <p className="text-[11px] uppercase tracking-[.06em] text-slate-500">Status</p>
      <div className="mt-3 flex items-start gap-3">
        {isWorking ? <span className="mt-1 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-400" aria-hidden="true" /> : null}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-slate-900">{error ? `${failedLabel} failed` : copy.title}</p>
          <p className={`mt-1 text-sm ${error ? "text-red-700" : "text-slate-500"}`}>{error || copy.description}</p>
          {traceId && error ? <p className="mt-3 break-all text-[11px] text-red-700">Reference: {traceId}</p> : null}
          {retryable && error && onRetry ? (
            <button type="button" onClick={onRetry} className="mt-4 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50">
              Retry from {failedLabel.toLowerCase()}
            </button>
          ) : null}
        </div>
      </div>

      {showUploadProgress ? (
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-[11px] text-slate-500">
            <span>Uploaded</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Audio upload" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadProgress)}>
            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-emerald-300 transition-[width] duration-150" style={{ width: `${Math.max(0, Math.min(100, uploadProgress))}%` }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
