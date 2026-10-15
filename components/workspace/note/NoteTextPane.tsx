"use client";

import React from "react";

export function NoteTextPane({
  isZh,
  loading,
  isLoadingGlobal,
  locked,
  text,
  onChangeText,
  onResetAll,
}: {
  isZh: boolean;
  loading: boolean;
  isLoadingGlobal: boolean;
  locked: boolean;
  text: string;
  onChangeText: (v: string) => void;
  onResetAll: () => void;
}) {
  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(event) => {
          onResetAll();
          onChangeText(event.target.value);
        }}
        placeholder={isZh ? "Paste transcript, lecture notes, or meeting text..." : "Paste transcript, lecture notes, or meeting text..."}
        className="h-56 w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
        disabled={loading || isLoadingGlobal || locked}
      />
      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span>{text.trim().length.toLocaleString()} chars</span>
        <button
          type="button"
          onClick={() => {
            onResetAll();
            onChangeText("");
          }}
          disabled={!text || loading || isLoadingGlobal || locked}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
