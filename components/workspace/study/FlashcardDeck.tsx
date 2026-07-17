"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Card = { front: string; back: string };

export function FlashcardDeck({ cards }: { cards: Card[] }) {
  const [order, setOrder] = useState(() => cards.map((_, index) => index));
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [animating, setAnimating] = useState(false);
  const unlockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (unlockTimer.current) clearTimeout(unlockTimer.current); }, []);

  const card = cards[order[position]];
  const flip = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setFlipped((value) => !value);
    unlockTimer.current = setTimeout(() => setAnimating(false), 520);
  }, [animating]);

  const move = useCallback((delta: number) => {
    setFlipped(false);
    setAnimating(false);
    setPosition((current) => Math.min(order.length - 1, Math.max(0, current + delta)));
  }, [order.length]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable=true]")) return;
      if (event.code === "Space") { event.preventDefault(); flip(); }
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flip, move]);

  const progress = useMemo(() => `${position + 1} / ${cards.length}`, [cards.length, position]);
  if (!card) return null;

  return <section className="mt-6" aria-label="Flashcard study deck">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><p data-testid="flashcard-progress" className="text-sm font-medium text-slate-200">{progress}</p><p className="mt-1 text-xs text-slate-500">Click the card or press Space to flip</p></div><div className="flex gap-2"><button data-testid="flashcard-restart" type="button" onClick={() => { setOrder(cards.map((_,i)=>i)); setPosition(0); setFlipped(false); }} className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200">Restart</button><button data-testid="flashcard-shuffle" type="button" onClick={() => { const next=[...order]; for(let i=next.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1)); [next[i],next[j]]=[next[j],next[i]];} setOrder(next); setPosition(0); setFlipped(false); }} className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-200">Shuffle</button></div></div>
    <button data-testid="flashcard" type="button" onClick={flip} aria-label={flipped ? "Show flashcard front" : "Show flashcard answer"} className="flashcard-perspective block min-h-[360px] w-full overflow-hidden rounded-[28px] text-left md:min-h-[440px]">
      <span className={`flashcard-inner relative block min-h-[360px] w-full md:min-h-[440px] ${flipped ? "is-flipped" : ""}`}>
        <span data-testid="flashcard-front" className="flashcard-face absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 px-8 py-12 text-center shadow-[0_24px_80px_rgba(2,6,23,0.45)]"><span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-400">Question</span><span className="mt-6 max-w-3xl break-words whitespace-pre-wrap text-xl font-semibold leading-relaxed text-slate-50 md:text-3xl">{card.front}</span></span>
        <span data-testid="flashcard-back" className="flashcard-face flashcard-back absolute inset-0 flex flex-col items-center justify-center overflow-y-auto rounded-[28px] border border-sky-400/25 bg-sky-950 px-8 py-12 text-center shadow-[0_24px_80px_rgba(2,6,23,0.45)]"><span className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Answer</span><span className="mt-6 max-w-3xl break-words whitespace-pre-wrap text-lg font-medium leading-relaxed text-slate-100 md:text-2xl">{card.back}</span></span>
      </span>
    </button>
    <div className="mt-5 flex items-center justify-center gap-3"><button data-testid="flashcard-previous" type="button" onClick={() => move(-1)} disabled={position===0} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-200 disabled:opacity-40">← Previous</button><button data-testid="flashcard-flip" type="button" onClick={flip} disabled={animating} className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-70">Flip card</button><button data-testid="flashcard-next" type="button" onClick={() => move(1)} disabled={position===order.length-1} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-200 disabled:opacity-40">Next →</button></div>
  </section>;
}
