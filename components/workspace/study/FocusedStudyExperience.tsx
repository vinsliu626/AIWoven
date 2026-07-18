"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { StudyFlipCard } from "./StudyFlipCard";

type StudyCard = { id: string; frontText: string; backText: string };
type FocusedMode = "learn" | "quiz" | "matching";

const shuffle = <T,>(items: T[]) => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
};
const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();

function ModeIcon({ mode }: { mode: FocusedMode }) {
  if (mode === "learn") return <path d="M5 5h6v14H5zM13 5h6v14h-6M8 9h1M16 9h1"/>;
  if (mode === "quiz") return <><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3 2.2c-.7.3-.7.9-.7 1.7M12 17h.01"/></>;
  return <><path d="M4 7h6v4H4zM14 13h6v4h-6M10 9h4M12 9v6M10 15h4"/></>;
}

function LearnMode({ cards, onProgress }: { cards: StudyCard[]; onProgress: (value: string) => void }) {
  const [index, setIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());
  const card = cards[index];
  useEffect(() => onProgress(`${index + 1} / ${cards.length}`), [cards.length, index, onProgress]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "ArrowLeft") setIndex((value) => Math.max(0, value - 1));
      if (event.key === "ArrowRight") setIndex((value) => Math.min(cards.length - 1, value + 1));
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [cards.length]);
  if (!card) return null;
  const face = (text: string) => <span className="flex h-full items-center justify-center overflow-y-auto p-8 text-center text-xl leading-relaxed text-white sm:p-12 sm:text-3xl custom-scrollbar"><span className="max-w-3xl whitespace-pre-wrap break-words">{text}</span></span>;
  return <div className="mx-auto w-full max-w-5xl">
    <StudyFlipCard key={card.id} testId="focused-study-card" front={face(card.frontText)} back={face(card.backText)} onReveal={() => setReviewed((current) => new Set(current).add(index))}/>
    <div className="mt-5 flex items-center justify-between"><button type="button" disabled={index === 0} onClick={() => setIndex((value) => value - 1)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-30">Previous</button><span className="text-xs text-slate-600">{reviewed.size} reviewed</span><button type="button" disabled={index === cards.length - 1} onClick={() => setIndex((value) => value + 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-30">Next</button></div>
  </div>;
}

function QuizMode({ cards, onProgress }: { cards: StudyCard[]; onProgress: (value: string) => void }) {
  const [style, setStyle] = useState<"multiple" | "fill">("multiple");
  const [order] = useState(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [complete, setComplete] = useState(false);
  const card = order[index];
  const options = useMemo(() => card ? shuffle([card.backText, ...shuffle(cards.filter((item) => item.id !== card.id).map((item) => item.backText)).slice(0, 3)]) : [], [card, cards]);
  useEffect(() => onProgress(complete ? `${correct} / ${order.length} correct` : `${index + 1} / ${order.length}`), [complete, correct, index, onProgress, order.length]);
  if (complete) return <div className="mx-auto max-w-2xl py-16 text-center"><p className="text-xs font-semibold uppercase tracking-[.2em] text-cyan-300">Quiz complete</p><h2 className="mt-3 text-4xl font-semibold text-white">{Math.round(correct / Math.max(order.length, 1) * 100)}%</h2><p className="mt-2 text-sm text-slate-400">{correct} correct · {order.length - correct} incorrect</p><button type="button" onClick={() => { setIndex(0); setCorrect(0); setAnswer(""); setSubmitted(false); setComplete(false); }} className="mt-7 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">Restart</button></div>;
  if (!card) return null;
  const isCorrect = normalize(answer) === normalize(card.backText);
  const submit = () => { if (!answer || submitted) return; if (isCorrect) setCorrect((value) => value + 1); setSubmitted(true); };
  const next = () => { if (index === order.length - 1) setComplete(true); else { setIndex((value) => value + 1); setAnswer(""); setSubmitted(false); } };
  return <div className="mx-auto w-full max-w-3xl">
    <div className="mb-5 flex justify-end"><label className="text-xs text-slate-500">Question style <select aria-label="Question style" value={style} onChange={(event) => { setStyle(event.target.value as "multiple" | "fill"); setAnswer(""); setSubmitted(false); }} className="ml-2 rounded-lg border border-white/10 bg-[#090d14] px-3 py-2 text-xs text-slate-200"><option value="multiple">Multiple Choice</option><option value="fill">Fill in the Blank</option></select></label></div>
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6 sm:p-9"><h2 className="text-xl font-medium leading-relaxed text-white sm:text-2xl">{card.frontText}</h2>{style === "multiple" ? <div className="mt-7 grid gap-2">{options.map((option) => <button key={option} type="button" disabled={submitted} onClick={() => setAnswer(option)} className={`rounded-xl border px-4 py-3 text-left text-sm ${answer === option ? "border-cyan-300/40 bg-cyan-300/[0.08] text-white" : "border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"}`}>{option}</button>)}</div> : <div className="mt-7"><label htmlFor="focused-fill-answer" className="sr-only">Your answer</label><input id="focused-fill-answer" value={answer} disabled={submitted} onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="Type your answer" className="w-full rounded-xl border border-white/10 px-4 py-3 text-sm text-white"/></div>}{submitted ? <div role="status" className={`mt-5 border-l-2 pl-4 text-sm ${isCorrect ? "border-emerald-300 text-emerald-200" : "border-red-300 text-red-200"}`}><p className="font-medium">{isCorrect ? "Correct" : "Incorrect"}</p>{!isCorrect ? <p className="mt-1">Correct answer: {card.backText}</p> : null}</div> : null}<div className="mt-7 flex justify-end">{submitted ? <button type="button" onClick={next} className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950">{index === order.length - 1 ? "View results" : "Next question"}</button> : <button type="button" onClick={submit} disabled={!answer} className="rounded-xl bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-40">Check answer</button>}</div></section>
  </div>;
}

function MatchingMode({ cards, onProgress }: { cards: StudyCard[]; onProgress: (value: string) => void }) {
  const [termOrder, setTermOrder] = useState(() => shuffle(cards));
  const [answerOrder, setAnswerOrder] = useState(() => shuffle(cards));
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  useEffect(() => onProgress(`${matched.size} / ${cards.length} matched`), [cards.length, matched.size, onProgress]);
  const chooseAnswer = (card: StudyCard) => {
    if (!selected || matched.has(card.id)) return;
    if (selected === card.id) { setMatched((current) => new Set(current).add(card.id)); setFeedback("Correct match"); }
    else setFeedback("Not a match — try again");
    setSelected(null);
  };
  const restart = () => { setTermOrder(shuffle(cards)); setAnswerOrder(shuffle(cards)); setSelected(null); setMatched(new Set()); setFeedback(""); };
  return <div className="mx-auto w-full max-w-5xl"><div className="grid gap-4 md:grid-cols-2"><div className="space-y-2">{termOrder.map((card) => <button key={card.id} type="button" disabled={matched.has(card.id)} onClick={() => { setSelected(card.id); setFeedback(""); }} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${matched.has(card.id) ? "border-emerald-300/20 text-emerald-200 opacity-50" : selected === card.id ? "border-cyan-300/40 bg-cyan-300/[0.08] text-white" : "border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"}`}>{card.frontText}</button>)}</div><div className="space-y-2">{answerOrder.map((card) => <button key={card.id} type="button" disabled={matched.has(card.id)} onClick={() => chooseAnswer(card)} className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${matched.has(card.id) ? "border-emerald-300/20 text-emerald-200 opacity-50" : "border-white/[0.08] text-slate-300 hover:bg-white/[0.04]"}`}>{card.backText}</button>)}</div></div>{feedback ? <p role="status" className={`mt-5 text-center text-sm ${feedback === "Correct match" ? "text-emerald-300" : "text-red-300"}`}>{feedback}</p> : null}<div className="mt-6 text-center"><button type="button" onClick={restart} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300">Restart</button></div></div>;
}

export function FocusedStudyExperience({ sessionId, title, fileName, cards, notes }: { sessionId: string; title: string; fileName: string | null; cards: StudyCard[]; notes: string[] }) {
  const modes: FocusedMode[] = cards.length > 0 ? ["learn", "quiz", "matching"] : ["learn"];
  const [mode, setMode] = useState<FocusedMode>("learn");
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(notes.length ? `${notes.length} notes` : "");
  const modeName = mode[0].toUpperCase() + mode.slice(1);
  const setProgressStable = useMemo(() => (value: string) => setProgress(value), []);
  return <main className="min-h-screen bg-[#05070b] text-slate-100">
    <header className="grid min-h-16 grid-cols-[1fr_auto_1fr] items-center border-b border-white/[0.08] px-4 sm:px-6">
      <div className="relative justify-self-start"><button data-testid="study-mode-selector" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm"><svg viewBox="0 0 24 24" className="h-4 w-4 text-cyan-300" fill="none" stroke="currentColor" strokeWidth="1.6"><ModeIcon mode={mode}/></svg>{modeName}<span className="text-slate-600">⌄</span></button>{menuOpen ? <div role="menu" className="absolute left-0 top-11 z-20 min-w-40 rounded-xl border border-white/10 bg-[#0b1018] p-1.5 shadow-xl">{modes.map((item) => <button key={item} role="menuitem" type="button" onClick={() => { setMode(item); setMenuOpen(false); }} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${mode === item ? "bg-cyan-300/[0.08] text-cyan-100" : "text-slate-300 hover:bg-white/[0.05]"}`}><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6"><ModeIcon mode={item}/></svg>{item[0].toUpperCase() + item.slice(1)}</button>)}</div> : null}</div>
      <p data-testid="focused-study-progress" className="max-w-36 truncate text-center text-xs text-slate-400 sm:max-w-none">{progress}</p>
      <div className="flex items-center gap-2 justify-self-end"><Link href="/ai-study" className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300">History</Link></div>
    </header>
    <section className="px-4 py-6 sm:px-6 sm:py-8"><div className="mx-auto mb-6 max-w-5xl"><p className="truncate text-xs text-slate-600">{fileName || "AI Study"}</p><h1 className="mt-1 truncate text-lg font-semibold text-white">{title}</h1></div>{mode === "learn" ? cards.length ? <LearnMode key={`${sessionId}-learn`} cards={cards} onProgress={setProgressStable}/> : <div className="mx-auto max-w-3xl space-y-4">{notes.map((note, index) => <article key={`${index}-${note.slice(0, 20)}`} className="border-b border-white/[0.08] py-4 text-sm leading-7 text-slate-200">{note}</article>)}</div> : null}{mode === "quiz" ? <QuizMode key={`${sessionId}-quiz`} cards={cards} onProgress={setProgressStable}/> : null}{mode === "matching" ? <MatchingMode key={`${sessionId}-matching`} cards={cards} onProgress={setProgressStable}/> : null}</section>
  </main>;
}
