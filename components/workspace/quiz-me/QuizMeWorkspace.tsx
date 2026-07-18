"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ManualFlashcardSet } from "@/lib/flashcards/types";

type QuizMode = "matching" | "fill" | "multiple";
type Phase = "select" | "running" | "summary";
const modes: Array<{ id: QuizMode; title: string; description: string }> = [
  { id: "matching", title: "Matching", description: "Connect each prompt to its answer." },
  { id: "fill", title: "Fill in the Blank", description: "Recall the answer without hints." },
  { id: "multiple", title: "Multiple Choice", description: "Choose the best answer, one card at a time." },
];
const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

export function QuizMeWorkspace({ locked }: { locked: boolean }) {
  const [sets, setSets] = useState<ManualFlashcardSet[]>([]);
  const [selectedSetId, setSelectedSetId] = useState("");
  const [mode, setMode] = useState<QuizMode>("multiple");
  const [phase, setPhase] = useState<Phase>("select");
  const [order, setOrder] = useState<number[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selectedFront, setSelectedFront] = useState<number | null>(null);
  const [backOrder, setBackOrder] = useState<number[]>([]);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(!locked);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (locked) return;
    setLoading(true);
    fetch("/api/flashcards/sets", { cache: "no-store", credentials: "include" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not load study material."); return data; })
      .then((data) => { setSets(data.sets || []); setSelectedSetId((current) => current || data.sets?.[0]?.id || ""); })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load study material."))
      .finally(() => setLoading(false));
  }, [locked]);

  const selectedSet = sets.find((set) => set.id === selectedSetId);
  const cards = selectedSet?.cards ?? [];
  const currentCard = cards[order[index]];
  const options = useMemo(() => {
    if (!currentCard || mode !== "multiple") return [];
    const wrong = shuffle(cards.filter((card) => card.id !== currentCard.id).map((card) => card.backText)).slice(0, 3);
    return shuffle([currentCard.backText, ...wrong]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCard?.id, mode, index]);

  const resetRun = () => {
    const nextOrder = shuffle(cards.map((_, cardIndex) => cardIndex));
    setOrder(nextOrder); setBackOrder(shuffle(nextOrder)); setIndex(0); setAnswer(""); setSelectedOption(""); setSubmitted(false); setCorrect(0); setIncorrect(0); setMatched(new Set()); setSelectedFront(null); setFeedback(""); setPhase("running");
  };

  const submitAnswer = () => {
    if (!currentCard || submitted || (mode === "fill" ? !answer.trim() : !selectedOption)) return;
    const response = mode === "fill" ? answer : selectedOption;
    const isCorrect = normalize(response) === normalize(currentCard.backText);
    if (isCorrect) setCorrect((value) => value + 1); else setIncorrect((value) => value + 1);
    setFeedback(isCorrect ? "Correct" : "Incorrect"); setSubmitted(true);
  };

  const nextQuestion = () => {
    if (index >= order.length - 1) { setPhase("summary"); return; }
    setIndex((value) => value + 1); setAnswer(""); setSelectedOption(""); setSubmitted(false); setFeedback("");
  };

  const chooseBack = (backIndex: number) => {
    if (selectedFront === null || matched.has(backIndex)) return;
    if (selectedFront === backIndex) {
      const next = new Set(matched).add(backIndex); setMatched(next); setCorrect((value) => value + 1); setFeedback("Correct match"); setSelectedFront(null);
      if (next.size === order.length) window.setTimeout(() => setPhase("summary"), 450);
    } else { setIncorrect((value) => value + 1); setFeedback("Not a match — try again"); setSelectedFront(null); }
  };

  if (locked) return <div className="mx-auto flex h-full max-w-3xl items-center justify-center px-5"><div className="w-full border-y border-white/10 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">Quiz Me</p><h1 className="mt-3 text-3xl font-semibold text-white">Practice from your own material</h1><p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">Sign in to launch quizzes from your private flashcard sets.</p><Link href="/api/auth/signin?callbackUrl=/quiz-me" className="mt-7 inline-flex rounded-xl bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-slate-950">Sign in</Link></div></div>;

  return <section className="h-full overflow-y-auto px-4 py-6 md:px-8 lg:px-10 custom-scrollbar"><div className="mx-auto max-w-5xl">
    <header className="border-b border-white/[0.08] pb-6"><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-cyan-300">Study tools</p><h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Quiz Me</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Practice the flashcards you created with focused, non-AI study activities.</p></header>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200">{error}</p> : null}

    {phase === "select" ? <div className="mt-8"><div className="max-w-xl"><label htmlFor="quiz-set" className="mb-2 block text-xs font-medium text-slate-300">Study material</label><select id="quiz-set" value={selectedSetId} onChange={(event) => setSelectedSetId(event.target.value)} className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white"><option value="">Select a flashcard set</option>{sets.map((set) => <option key={set.id} value={set.id}>{set.title} ({set.cards.length} cards)</option>)}</select></div>
      {loading ? <p className="mt-8 text-sm text-slate-500">Loading study material…</p> : !sets.length ? <div className="mt-8 border-y border-dashed border-white/10 py-14 text-center"><h2 className="text-lg font-medium text-slate-200">No study material yet</h2><p className="mt-2 text-sm text-slate-500">Create a flashcard set before starting a quiz.</p><Link href="/flashcards" className="mt-5 inline-flex rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] px-4 py-2.5 text-sm text-cyan-100">Create flashcards</Link></div> : <><fieldset className="mt-8"><legend className="text-xs font-medium text-slate-300">Quiz format</legend><div className="mt-3 grid gap-3 md:grid-cols-3">{modes.map((item) => <label key={item.id} className={`cursor-pointer rounded-2xl border p-5 transition-colors ${mode === item.id ? "border-cyan-300/30 bg-cyan-300/[0.07]" : "border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.045]"}`}><input type="radio" name="quiz-mode" value={item.id} checked={mode === item.id} onChange={() => setMode(item.id)} className="sr-only"/><span className="text-sm font-semibold text-slate-100">{item.title}</span><span className="mt-2 block text-xs leading-relaxed text-slate-500">{item.description}</span></label>)}</div></fieldset><button data-testid="quiz-me-start" disabled={!selectedSet || cards.length < (mode === "multiple" ? 2 : 1)} onClick={resetRun} className="mt-7 rounded-xl bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Start {modes.find((item) => item.id === mode)?.title}</button>{mode === "multiple" && cards.length === 1 ? <p className="mt-2 text-xs text-amber-300">Multiple choice needs at least two cards.</p> : null}</>}</div> : null}

    {phase === "running" && selectedSet ? <div className="mx-auto mt-8 max-w-3xl"><div className="flex items-center justify-between text-xs text-slate-400"><span>{mode === "matching" ? `${matched.size} of ${order.length} matched` : `Question ${index + 1} of ${order.length}`}</span><span className="text-emerald-300">{correct} correct <span className="mx-1 text-slate-600">·</span> <span className="text-red-300">{incorrect} incorrect</span></span></div><div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full bg-cyan-300 transition-[width]" style={{ width: `${mode === "matching" ? matched.size / Math.max(order.length, 1) * 100 : index / Math.max(order.length, 1) * 100}%` }}/></div>
      {mode === "matching" ? <div className="mt-7 grid gap-4 md:grid-cols-2"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Prompts</p><div className="space-y-2">{order.map((cardIndex) => <button key={cards[cardIndex].id} disabled={matched.has(cardIndex)} onClick={() => { setSelectedFront(cardIndex); setFeedback(""); }} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${matched.has(cardIndex) ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200 opacity-60" : selectedFront === cardIndex ? "border-cyan-300/40 bg-cyan-300/[0.09] text-white" : "border-white/10 bg-white/[0.025] text-slate-200 hover:bg-white/[0.05]"}`}>{cards[cardIndex].frontText}</button>)}</div></div><div><p className="mb-3 text-xs font-semibold uppercase tracking-[.16em] text-slate-500">Answers</p><div className="space-y-2">{backOrder.map((cardIndex) => <button key={cards[cardIndex].id} disabled={matched.has(cardIndex)} onClick={() => chooseBack(cardIndex)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${matched.has(cardIndex) ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200 opacity-60" : "border-white/10 bg-white/[0.025] text-slate-200 hover:bg-white/[0.05]"}`}>{cards[cardIndex].backText}</button>)}</div></div></div> : currentCard ? <div className="mt-7 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 md:p-8"><p className="text-xs font-semibold uppercase tracking-[.18em] text-cyan-300">Prompt</p><h2 className="mt-3 text-xl leading-relaxed text-white">{currentCard.frontText}</h2>{mode === "fill" ? <div className="mt-7"><label htmlFor="fill-answer" className="mb-2 block text-xs text-slate-400">Your answer</label><input id="fill-answer" value={answer} disabled={submitted} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submitAnswer(); }} autoFocus className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white"/></div> : <div className="mt-7 grid gap-2">{options.map((option) => <button key={option} disabled={submitted} onClick={() => setSelectedOption(option)} className={`rounded-xl border px-4 py-3 text-left text-sm ${selectedOption === option ? "border-cyan-300/40 bg-cyan-300/[0.09] text-white" : "border-white/10 bg-white/[0.02] text-slate-300 hover:bg-white/[0.05]"}`}>{option}</button>)}</div>}{submitted ? <div role="status" className={`mt-5 rounded-xl border px-4 py-3 text-sm ${feedback === "Correct" ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200" : "border-red-400/20 bg-red-400/[0.07] text-red-200"}`}><p className="font-semibold">{feedback}</p>{feedback !== "Correct" ? <p className="mt-1">Correct answer: {currentCard.backText}</p> : null}</div> : null}<div className="mt-6 flex justify-end">{submitted ? <button onClick={nextQuestion} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">{index === order.length - 1 ? "View results" : "Next question"}</button> : <button onClick={submitAnswer} disabled={mode === "fill" ? !answer.trim() : !selectedOption} className="rounded-xl bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40">Check answer</button>}</div></div> : null}
      {feedback && mode === "matching" ? <p role="status" className={`mt-4 text-center text-sm ${feedback === "Correct match" ? "text-emerald-300" : "text-red-300"}`}>{feedback}</p> : null}</div> : null}

    {phase === "summary" ? <div className="mx-auto mt-10 max-w-2xl border-y border-white/10 py-10 text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Session complete</p><h2 className="mt-3 text-3xl font-semibold text-white">{correct} correct</h2><p className="mt-2 text-sm text-slate-400">{incorrect} incorrect · {correct + incorrect} attempts</p><div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={resetRun} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">Restart</button><button onClick={() => setPhase("select")} className="rounded-xl border border-white/10 px-5 py-2.5 text-sm text-slate-300">Choose another mode</button><Link href="/flashcards" className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-5 py-2.5 text-sm text-cyan-100">Return to study material</Link></div></div> : null}
  </div></section>;
}
