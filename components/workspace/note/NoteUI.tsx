"use client";

import React from "react";
import { NoteGenerationProgress } from "./NoteGenerationProgress";
import { NoteRecordPane } from "./NoteRecordPane";
import { NoteResultPane } from "./NoteResultPane";
import { NoteTabs } from "./NoteTabs";
import { NoteTextPane } from "./NoteTextPane";
import { NoteUploadPane } from "./NoteUploadPane";
import { useNoteController } from "./useNoteController";

type NoteEntitlement = {
  plan: "basic" | "pro" | "ultra" | "gift";
  noteGeneratesPerDay?: number;
  noteInputMaxChars?: number;
  noteMaxItems?: number;
  noteCooldownMs?: number;
  usedNoteGeneratesToday?: number;
};

export function NoteUI({
  isLoadingGlobal,
  isZh,
  locked,
  onUsageRefresh,
}: {
  isLoadingGlobal: boolean;
  isZh: boolean;
  locked: boolean;
  entitlement?: NoteEntitlement | null;
  onUsageRefresh?: () => Promise<void> | void;
}) {
  const ctl = useNoteController({ locked, isLoadingGlobal, isZh, onUsageRefresh });
  const resultReady = ctl.resultComplete;
  const helperText =
    ctl.tab === "upload"
      ? "Upload audio and generate structured notes."
      : ctl.tab === "record"
      ? "Record in the browser, then generate notes from the captured audio."
      : "Paste source text and turn it into a concise note summary.";

  return (
    <div className="w-full">
      {locked ? (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
          Sign in to use AI Notes.
        </div>
      ) : null}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:grid-rows-[auto_auto]">
            <section className="ui-card p-5">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">Source</h2>
                    <p className="mt-1 text-[13px] text-slate-500">{helperText}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {ctl.loading ? (
                      <button type="button" onClick={ctl.cancelGeneration} className="h-10 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={ctl.generateNotes}
                      disabled={!ctl.canGenerate}
                      className="h-10 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                    >
                      {ctl.loading ? (ctl.phase === "uploading" ? "Uploading..." : "Generating...") : "Generate Notes"}
                    </button>
                  </div>
                </div>

                <div>
                  <NoteTabs
                    tab={ctl.tab}
                    isZh={isZh}
                    recording={ctl.recording}
                    loading={ctl.loading}
                    isLoadingGlobal={isLoadingGlobal}
                    locked={locked}
                    onSwitch={ctl.switchTab}
                  />

                </div>
              </div>

              <div className="mt-5">
                {ctl.tab === "upload" ? (
                  <NoteUploadPane
                    isZh={isZh}
                    loading={ctl.loading}
                    isLoadingGlobal={isLoadingGlobal}
                    file={ctl.file}
                    onPickFile={ctl.onPickFile}
                  />
                ) : null}

                {ctl.tab === "record" ? (
                  <NoteRecordPane
                    isZh={isZh}
                    locked={locked}
                    loading={ctl.loading}
                    isLoadingGlobal={isLoadingGlobal}
                    recording={ctl.recording}
                    recordSecs={ctl.recordSecs}
                    liveTranscript={ctl.liveTranscript}
                    onStart={ctl.startRecording}
                    onStop={ctl.stopRecording}
                  />
                ) : null}

                {ctl.tab === "text" ? (
                  <NoteTextPane
                    isZh={isZh}
                    loading={ctl.loading}
                    isLoadingGlobal={isLoadingGlobal}
                    locked={locked}
                    text={ctl.text}
                    onChangeText={ctl.setText}
                    onResetAll={ctl.resetAll}
                  />
                ) : null}
              </div>
            </section>

            <div className="space-y-6">
              <NoteGenerationProgress
                isZh={isZh}
                loading={ctl.loading}
                phase={resultReady ? "done" : ctl.phase}
                uploadProgress={ctl.uploadProgress}
                resultReady={resultReady}
                error={ctl.loading ? null : ctl.error}
                traceId={ctl.errorTraceId}
                failedPhase={ctl.failedPhase}
                retryable={ctl.errorRetryable}
                onRetry={ctl.retryGeneration}
              />
            </div>

            <div className="lg:col-span-2">
              <NoteResultPane
                isZh={isZh}
                result={ctl.result}
                resultComplete={ctl.resultComplete}
                loading={ctl.loading}
              />
            </div>
      </div>
    </div>
  );
}
