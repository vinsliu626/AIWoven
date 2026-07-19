"use client";

import React from "react";

export function NoteRecordPane({
  isZh,
  locked,
  loading,
  isLoadingGlobal,
  recording,
  recordSecs,
  liveTranscript,
  onStart,
  onStop,
}: {
  isZh: boolean;
  locked: boolean;
  loading: boolean;
  isLoadingGlobal: boolean;
  recording: boolean;
  recordSecs: number;
  liveTranscript: string;
  onStart: () => void;
  onStop: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Recorder</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">{recordSecs}s</p>
        </div>

        {!recording ? (
          <button
            onClick={onStart}
            disabled={loading || isLoadingGlobal || locked}
            className="h-10 rounded-full border border-white/10 bg-white/8 px-5 text-sm font-semibold text-slate-100 transition hover:bg-white/12 disabled:opacity-60"
          >
            {isZh ? "Start Recording" : "Start Recording"}
          </button>
        ) : (
          <button onClick={onStop} className="h-10 rounded-full bg-red-500/80 px-5 text-sm font-semibold text-white transition hover:bg-red-500">
            {isZh ? "Stop Recording" : "Stop Recording"}
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-[12px] text-slate-300">
        {recording
          ? "Recording in progress. Stop when you are ready to generate notes."
          : recordSecs > 0
          ? "Recording stopped. Generate notes when you are ready."
          : "Start recording when you are ready."}
      </div>

      {liveTranscript.trim() ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-4">
          <div className="mb-3 text-[11px] uppercase tracking-[0.24em] text-slate-500">Live Transcript</div>
          <div className="custom-scrollbar max-h-[220px] overflow-y-auto whitespace-pre-wrap text-[12px] leading-6 text-slate-100">{liveTranscript}</div>
        </div>
      ) : null}
    </div>
  );
}
