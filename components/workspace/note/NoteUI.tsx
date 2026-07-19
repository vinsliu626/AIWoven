"use client";

import React from "react";
import { NexusOrb } from "@/components/shared/NexusOrb";
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
    <div className="flex-1 overflow-hidden px-4 py-4">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950/40 via-slate-900/30 to-slate-950/40 shadow-[0_20px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="border-b border-white/10 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <NexusOrb sizeClass="h-6 w-6" />
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-50 md:text-3xl">AI Note</h2>
              </div>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                Generate structured notes from audio or text with a simpler, linear workflow.
              </p>
            </div>
          </div>

          {locked ? (
            <div className="mt-4 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
              Sign in to use AI Notes.
            </div>
          ) : null}

        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(20rem,0.88fr)] lg:grid-rows-[auto_auto]">
            <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex flex-col gap-4 border-b border-white/10 pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Input</p>
                    <p className="mt-2 text-sm text-slate-300">{helperText}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {ctl.loading ? (
                      <button type="button" onClick={ctl.cancelGeneration} className="h-11 rounded-full border border-white/10 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/5">
                        Cancel
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={ctl.generateNotes}
                      disabled={!ctl.canGenerate}
                      className="h-11 rounded-full bg-gradient-to-r from-blue-500 via-sky-500 to-emerald-400 px-5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:via-slate-700 disabled:to-slate-700 disabled:text-slate-300 disabled:shadow-none"
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

              <div className="mt-5 rounded-3xl border border-white/10 bg-slate-950/60 p-5">
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

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-blue-500/10 via-cyan-500/5 to-transparent" />
      </div>
    </div>
  );
}
