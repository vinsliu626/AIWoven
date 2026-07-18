"use client";

import Link from "next/link";
import { useStudyController } from "./useStudyController";
import type { StudyEntitlement, StudyMode, StudySessionListItem } from "./study-types";

const outputTypes: Array<{ value: StudyMode; label: string }> = [
  { value: "flashcards", label: "Flashcards" },
  { value: "quiz", label: "Quiz" },
  { value: "notes", label: "Notes" },
];

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function HistoryItem({ item, highlighted, canRetry, onRetry }: { item: StudySessionListItem; highlighted: boolean; canRetry: boolean; onRetry: () => void }) {
  const output = item.selectedModes[0] ?? "notes";
  const completed = item.status === "COMPLETED";
  const processing = item.status === "PROCESSING";
  return <article
    data-testid="study-history-item"
    data-status={item.status.toLowerCase()}
    data-new={highlighted ? "true" : "false"}
    className={`study-history-item border-y border-white/[0.08] px-1 py-4 ${highlighted ? "study-history-complete-pulse" : ""}`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
          <span className={`text-[10px] font-semibold uppercase tracking-[.16em] ${completed ? "text-emerald-300" : processing ? "text-cyan-300" : "text-red-300"}`}>
            {item.status.toLocaleLowerCase()}
          </span>
        </div>
        <p className="mt-1 truncate text-xs text-slate-500">{item.fileName || "Source document unavailable"}</p>
        <p className="mt-2 text-[11px] text-slate-600">
          {output === "flashcards" ? "Flashcards" : output === "quiz" ? "Quiz" : "Notes"} · {formatCreatedAt(item.createdAt)}
          {completed && item.itemCount > 0 ? ` · ${item.itemCount} ${item.itemCount === 1 ? "item" : "items"}` : ""}
        </p>
        {processing ? <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]"><span className="study-processing-bar block h-full w-1/3 rounded-full bg-cyan-300/70"/></div> : null}
        {item.status === "FAILED" ? <p role="status" className="mt-2 text-xs text-red-200">{item.errorSummary || "Generation could not be completed."}</p> : null}
      </div>
      {completed ? <Link href={`/study/session/${item.id}`} className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/[0.08]">Open</Link> : null}
      {item.status === "FAILED" && canRetry ? <button type="button" onClick={onRetry} className="shrink-0 rounded-lg border border-red-300/20 px-3 py-2 text-xs text-red-100 hover:bg-red-300/[0.06]">Retry</button> : null}
    </div>
  </article>;
}

export function StudyUI({
  isZh,
  locked,
  entitlement,
  onUsageRefresh,
}: {
  isZh: boolean;
  locked: boolean;
  entitlement: StudyEntitlement | null;
  onUsageRefresh: () => Promise<void> | void;
}) {
  const ctl = useStudyController({ isZh, locked, entitlement, onUsageRefresh });

  return <section className="h-full overflow-y-auto px-4 py-7 md:px-8 lg:px-10 custom-scrollbar">
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-white/[0.08] pb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[.24em] text-cyan-300">AI Workspace</p>
        <h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">AI Study</h1>
        <p className="mt-2 max-w-xl text-sm text-slate-400">Upload a document, choose one result, and continue from Study History.</p>
      </header>

      <div className="grid gap-10 py-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,.9fr)] lg:gap-14">
        <div>
          <div
            data-testid="study-upload-area"
            onDragOver={(event) => { event.preventDefault(); ctl.setDragActive(true); }}
            onDragLeave={() => ctl.setDragActive(false)}
            onDrop={(event) => { event.preventDefault(); ctl.setDragActive(false); void ctl.handleFileSelection(event.dataTransfer.files?.[0] ?? null); }}
            className={`border-y border-dashed px-5 py-12 text-center transition-colors ${ctl.dragActive ? "border-cyan-300/60 bg-cyan-300/[0.04]" : "border-white/10 bg-white/[0.015]"}`}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="mx-auto h-8 w-8 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 16V4m0 0-4 4m4-4 4 4M5 14v5h14v-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <p className="mt-4 text-base font-medium text-slate-100">Drop a PDF, DOCX, or PPTX here</p>
            <p className="mt-1 text-xs text-slate-500">Document text is extracted before generation.</p>
            <label className="mt-5 inline-flex cursor-pointer rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-slate-100">
              Choose document
              <input type="file" className="sr-only" accept=".pdf,.docx,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation" onChange={(event) => void ctl.handleFileSelection(event.target.files?.[0] ?? null)}/>
            </label>
          </div>

          {ctl.file ? <div data-testid="study-selected-file" className="mt-5 flex items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
            <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-100">{ctl.file.name}</p><p className="mt-1 text-xs text-slate-500">{(ctl.file.size / (1024 * 1024)).toFixed(2)} MB · {ctl.extracting ? "Extracting…" : ctl.extractedText ? "Ready" : "Needs attention"}</p></div>
            <button type="button" onClick={() => void ctl.handleFileSelection(null)} className="text-xs text-slate-500 hover:text-slate-200">Remove</button>
          </div> : null}

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="study-output-type" className="mb-2 block text-xs font-medium text-slate-300">Output type</label><select data-testid="study-output-type" id="study-output-type" value={ctl.outputType} onChange={(event) => ctl.setOutputType(event.target.value as StudyMode)} className="w-full rounded-xl border border-white/10 bg-[#090d14] px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"><option value="" disabled hidden></option>{outputTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></div>
            <div><label htmlFor="study-title" className="mb-2 block text-xs font-medium text-slate-300">Title <span className="text-slate-600">(optional)</span></label><input id="study-title" value={ctl.detectedTitle} onChange={(event) => ctl.setDetectedTitle(event.target.value)} maxLength={160} className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300/40"/></div>
          </div>

          {ctl.status ? <p role="status" className="mt-4 text-sm text-slate-300">{ctl.status}</p> : null}
          {ctl.localExtractionWarning ? <p className="mt-3 text-xs text-amber-200">{ctl.localExtractionWarning}</p> : null}
          {ctl.error ? <p role="alert" className="mt-4 border-l-2 border-red-300/50 pl-3 text-sm text-red-200">{ctl.error}</p> : null}

          <button data-testid="study-generate" type="button" onClick={() => void ctl.generate()} disabled={!ctl.canGenerate} className="mt-6 inline-flex min-w-40 items-center justify-center rounded-xl bg-cyan-200 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500">
            {ctl.generating ? "Generating…" : ctl.extracting ? "Extracting…" : "Generate"}
          </button>
        </div>

        <aside data-testid="study-history" aria-labelledby="study-history-heading" className="min-w-0">
          <div className="flex items-end justify-between gap-4 border-b border-white/[0.08] pb-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-slate-600">Saved results</p><h2 id="study-history-heading" className="mt-1 text-lg font-semibold text-slate-100">Study History</h2></div><span className="text-xs text-slate-600">{ctl.history.length}</span></div>
          <div className="mt-1">
            {ctl.historyLoading && ctl.history.length === 0 ? <p className="py-8 text-sm text-slate-500">Loading Study History…</p> : ctl.history.length === 0 ? <div className="py-10"><p className="text-sm font-medium text-slate-300">No study material yet</p><p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-500">Generated Flashcards, Quiz material, and Notes will appear here.</p></div> : ctl.history.map((item) => <HistoryItem key={item.id} item={item} highlighted={ctl.newHistoryId === item.id} canRetry={ctl.canRetry(item)} onRetry={() => void ctl.generate()}/>) }
          </div>
        </aside>
      </div>
    </div>
  </section>;
}
