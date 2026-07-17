"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiFormattedText } from "@/components/shared/AiFormattedText";
import { FlashcardDeck } from "./FlashcardDeck";
import type { StudyResult } from "./study-types";

type ResultTab = "notes" | "flashcards" | "quiz";

export function StudyResults({ result, sessionId }: { result: StudyResult; sessionId?: string | null }) {
  const available = useMemo(() => (["notes","flashcards","quiz"] as ResultTab[]).filter((tab) => tab === "notes" ? result.notes?.length : tab === "flashcards" ? result.flashcards?.length : result.quiz?.length), [result]);
  const resultKey = `${result.meta.title ?? "study"}-${result.meta.usedCharCount}-${result.quiz?.length ?? 0}`;
  const [tab, setTab] = useState<ResultTab>(available[0] ?? "notes");

  return <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4"><div><h3 className="text-lg font-semibold text-slate-50">Study Output</h3><p className="mt-1 text-xs text-slate-400">{result.meta.usedCharCount.toLocaleString()} / {result.meta.originalCharCount.toLocaleString()} chars used</p></div><div className="flex rounded-full border border-white/10 bg-slate-950/60 p-1 text-xs">{available.map(value=><button key={value} data-testid={`study-tab-${value}`} onClick={()=>setTab(value)} className={`rounded-full px-3 py-1.5 ${tab===value?"bg-white text-black":"text-slate-300"}`}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div></div>
    {tab === "notes" && <div className="mt-5 space-y-3">{(result.notes ?? []).map((note,index)=><div key={`${index}-${note.slice(0,20)}`} className="rounded-2xl border border-white/8 bg-slate-950/60 px-4 py-3 text-sm text-slate-200"><span className="text-slate-500">{String(index+1).padStart(2,"0")}</span><AiFormattedText text={note} className="mt-2 text-sm" /></div>)}</div>}
    {tab === "flashcards" && <FlashcardDeck key={resultKey} cards={result.flashcards ?? []} />}
    {tab === "quiz" && <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-7 text-slate-50"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Quiz ready</p><h4 className="mt-3 text-2xl font-semibold">Focus on one question at a time</h4><p className="mt-2 text-sm text-slate-400">{result.quiz?.length ?? 0} questions · progress is saved in this browser.</p>{sessionId ? <Link data-testid="start-quiz" href={`/study/quiz/${sessionId}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950">Start Quiz</Link> : <p className="mt-5 text-sm text-amber-300">Save or reload this study set before starting the quiz.</p>}</div>}
  </div>;
}
