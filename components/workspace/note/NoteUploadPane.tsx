"use client";

import React from "react";

export function NoteUploadPane({
  isZh,
  loading,
  isLoadingGlobal,
  file,
  onPickFile,
}: {
  isZh: boolean;
  loading: boolean;
  isLoadingGlobal: boolean;
  file: File | null;
  onPickFile: (f: File | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
        <p className="break-words text-sm font-semibold text-slate-900">{file ? file.name : "Drop in an audio file or browse from disk"}</p>
        <p className="mt-2 text-[12px] text-slate-500">mp3 / wav / m4a / mp4 / webm / ogg / aac / flac</p>
        <label className="mt-5 inline-flex cursor-pointer rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 transition hover:bg-slate-100">
          <input
            type="file"
            accept="audio/*,video/mp4,.mp3,.wav,.m4a,.mp4,.webm,.ogg,.aac,.flac"
            onChange={(event) => onPickFile(event.target.files?.[0] ?? null)}
            className="hidden"
            disabled={loading || isLoadingGlobal}
          />
          {isZh ? "Choose Audio" : "Choose Audio"}
        </label>
      </div>
    </div>
  );
}
