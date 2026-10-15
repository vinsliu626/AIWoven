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

  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4"><div><h3 className="text-lg font-semibold text-slate-900">Study Output</h3><p className="mt-1 text-xs text-slate-500">{result.meta.usedCharCount.toLocaleString()} / {result.meta.originalCharCount.toLocaleString()} chars used</p></div><div className="flex rounded-full border border-slate-200 bg-white p-1 text-xs">{available.map(value=><button key={value} data-testid={`study-tab-${value}`} onClick={()=>setTab(value)} className={`rounded-full px-3 py-1.5 ${tab===value?"bg-blue-600 hover:bg-blue-700 text-white":"text-slate-600"}`}>{value[0].toUpperCase()+value.slice(1)}</button>)}</div></div>
    {tab === "notes" && <div className="mt-5 space-y-3">{(result.notes ?? []).map((note,index)=><div key={`${index}-${note.slice(0,20)}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800"><span className="text-slate-500">{String(index+1).padStart(2,"0")}</span><AiFormattedText text={note} className="mt-2 text-sm" /></div>)}</div>}
    {tab === "flashcards" && <FlashcardDeck key={resultKey} cards={result.flashcards ?? []} />}
    {tab === "quiz" && <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 text-slate-900"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700">Quiz ready</p><h4 className="mt-3 text-2xl font-semibold">Focus on one question at a time</h4><p className="mt-2 text-sm text-slate-500">{result.quiz?.length ?? 0} questions · progress is saved in this browser.</p>{sessionId ? <Link data-testid="start-quiz" href={`/study/quiz/${sessionId}`} className="mt-6 inline-flex rounded-lg bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-semibold text-white">Start Quiz</Link> : <p className="mt-5 text-sm text-amber-700">Save or reload this study set before starting the quiz.</p>}</div>}
  </div>;
}
