"use client";

import React from "react";
import { AiFormattedText } from "@/components/shared/AiFormattedText";
import { CopyButton } from "@/components/ui/copy-button";

export function NoteResultPane({
  isZh,
  result,
  resultComplete,
}: {
  isZh: boolean;
  result: string;
  resultComplete?: boolean;
  loading?: boolean;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-6">
      <div className="flex flex-col gap-3 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Generated Notes</p>
          <p className="mt-2 text-lg font-semibold text-slate-50">
            {result ? (resultComplete ? "Final note output" : "Generating note draft") : "Awaiting result"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CopyButton text={result} />
        </div>
      </div>

      <div className="mt-5 min-h-[320px] text-[13px] leading-7 text-slate-100 md:min-h-[360px] lg:min-h-[420px]">
        {result ? <AiFormattedText text={result} /> : <span className="text-slate-500">{isZh ? "结构化笔记会显示在这里。" : "Structured notes will appear here."}</span>}
      </div>
    </div>
  );
}
