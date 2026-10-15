// components/note/NoteTabs.tsx
"use client";

import React from "react";
import type { NoteTab } from "./useNoteController";

export function NoteTabs({
  tab,
  isZh,
  recording,
  loading,
  isLoadingGlobal,
  locked,
  onSwitch,
}: {
  tab: NoteTab;
  isZh: boolean;
  recording: boolean;
  loading: boolean;
  isLoadingGlobal: boolean;
  locked: boolean;
  onSwitch: (t: NoteTab) => void;
}) {
  const tabBtn = (k: NoteTab, label: string) => {
    const active = tab === k;
    return (
      <button
        type="button"
        onClick={() => onSwitch(k)}
        aria-pressed={active}
        className={[
          "h-8 rounded-md px-4 text-[13px] font-semibold transition",
          active
            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
            : "text-slate-500 hover:text-slate-800",
        ].join(" ")}
      >
        {label}
      </button>
    );
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
      {tabBtn("upload", isZh ? "上传" : "Upload")}
      {tabBtn("record", isZh ? "录音" : "Record")}
      {tabBtn("text", isZh ? "文本" : "Text")}
    </div>
  );
}