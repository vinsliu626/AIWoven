"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ManualFlashcard, ManualFlashcardSet } from "@/lib/flashcards/types";

type DraftCard = ManualFlashcard & { frontFile?: File | null; backFile?: File | null; frontPreview?: string | null; backPreview?: string | null };
const emptyCard = (position = 0): DraftCard => ({ id: `new-${crypto.randomUUID()}`, frontText: "", backText: "", position, images: [] });

async function jsonRequest(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, credentials: "include" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

function imageFor(card: DraftCard, side: "front" | "back") {
  return card.images.find((image) => image.side === side);
}

type CardSide = "front" | "back";

function StudyCardFace({ card, side, reverse = false }: { card: DraftCard; side: CardSide; reverse?: boolean }) {
  const src = side === "front" ? card.frontPreview || imageFor(card, side)?.url : card.backPreview || imageFor(card, side)?.url;
  return <div aria-hidden={reverse ? "true" : undefined} className={`manual-flashcard-face ${reverse ? "manual-flashcard-face-back" : "manual-flashcard-face-front"}`}>
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 overflow-y-auto p-6 text-center sm:p-9 custom-scrollbar">
      {src ? <Image src={src} alt={`${side} side illustration`} width={640} height={240} unoptimized className="h-auto max-h-48 w-auto max-w-full shrink-0 rounded-xl object-contain"/> : null}
      <p className="max-w-2xl whitespace-pre-wrap break-words text-xl leading-relaxed text-white sm:text-2xl">{side === "front" ? card.frontText : card.backText}</p>
    </div>
  </div>;
}

function ManualStudyCard({ card, onReview }: { card: DraftCard; onReview: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [primarySide, setPrimarySide] = useState<CardSide>("front");
  const [reverseSide, setReverseSide] = useState<CardSide>("back");
  const [rotationTurns, setRotationTurns] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  const flip = () => {
    if (animating) return;
    const nextSide: CardSide = flipped ? "front" : "back";
    const duration = reducedMotion ? 140 : 620;
    setReverseSide(nextSide);
    setAnimating(true);
    setRotationTurns((turns) => turns + 1);
    onReview();
    timers.current.push(window.setTimeout(() => {
      // The primary plane is backface-hidden here, so replacing its content is invisible.
      setPrimarySide(nextSide);
      setFlipped(nextSide === "back");
    }, duration / 2));
    timers.current.push(window.setTimeout(() => {
      setAnimating(false);
      timers.current = [];
    }, duration));
  };

  return <button
    type="button"
    data-testid="manual-flashcard"
    data-side={flipped ? "back" : "front"}
    data-animating={animating ? "true" : "false"}
    data-flip-turn={rotationTurns}
    onClick={flip}
    aria-label={flipped ? "Show question" : "Show answer"}
    aria-pressed={flipped}
    aria-disabled={animating}
    className="manual-flashcard-perspective group mt-6 block w-full cursor-pointer rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#080a0f]"
  >
    <span
      data-testid="manual-flashcard-inner"
      className={`manual-flashcard-inner block ${animating ? "is-animating" : ""}`}
      style={{ transform: `rotateX(${rotationTurns * 360}deg)` }}
    >
      <StudyCardFace card={card} side={primarySide}/>
      <StudyCardFace card={card} side={reverseSide} reverse/>
    </span>
  </button>;
}

export function FlashcardsWorkspace({ locked }: { locked: boolean }) {
  const [sets, setSets] = useState<ManualFlashcardSet[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState<DraftCard[]>([emptyCard()]);
  const [view, setView] = useState<"library" | "edit" | "study">("library");
  const [loading, setLoading] = useState(!locked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const loadSets = async (selectId?: string) => {
    if (locked) return;
    setLoading(true);
    try {
      const data = await jsonRequest("/api/flashcards/sets", { cache: "no-store" });
      setSets(data.sets || []);
      if (selectId) openSet((data.sets || []).find((set: ManualFlashcardSet) => set.id === selectId));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load flashcards."); }
    finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void loadSets(); }, [locked]);

  const openSet = (set?: ManualFlashcardSet, nextView: "edit" | "study" = "edit") => {
    if (!set) return;
    setSelectedId(set.id);
    setTitle(set.title);
    setCards(set.cards.map((card) => ({ ...card })));
    setView(nextView);
    setStudyIndex(0); setReviewed(new Set()); setError(null); setNotice(null);
  };

  const startNew = () => {
    setSelectedId(null); setTitle(""); setCards([emptyCard()]); setView("edit"); setError(null); setNotice(null);
  };

  const updateCard = (index: number, patch: Partial<DraftCard>) => setCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, ...patch } : card));
  const moveCard = (index: number, delta: number) => setCards((current) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= current.length) return current;
    const next = [...current]; [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return next.map((card, position) => ({ ...card, position }));
  });

  const chooseImage = (index: number, side: "front" | "back", file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setError("Use a JPG, PNG, WebP, or GIF image up to 2 MB."); return;
    }
    const preview = URL.createObjectURL(file);
    updateCard(index, side === "front" ? { frontFile: file, frontPreview: preview } : { backFile: file, backPreview: preview });
  };

  const removeImage = async (index: number, side: "front" | "back") => {
    const card = cards[index];
    if (!card.id.startsWith("new-") && imageFor(card, side)) {
      try { await jsonRequest(`/api/flashcards/cards/${card.id}/image?side=${side}`, { method: "DELETE" }); }
      catch (removeError) { setError(removeError instanceof Error ? removeError.message : "Could not remove image."); return; }
    }
    updateCard(index, { images: card.images.filter((image) => image.side !== side), ...(side === "front" ? { frontFile: null, frontPreview: null } : { backFile: null, backPreview: null }) });
  };

  const save = async () => {
    setError(null); setNotice(null);
    if (!title.trim()) return setError("Name this flashcard set.");
    if (!cards.length || cards.some((card) => !card.frontText.trim() || !card.backText.trim())) return setError("Every card needs both a front and a back.");
    setSaving(true);
    try {
      const payload = { title: title.trim(), cards: cards.map((card) => ({ ...(card.id.startsWith("new-") ? {} : { id: card.id }), frontText: card.frontText.trim(), backText: card.backText.trim() })) };
      const data = await jsonRequest(selectedId ? `/api/flashcards/sets/${selectedId}` : "/api/flashcards/sets", { method: selectedId ? "PATCH" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const saved = data.set as ManualFlashcardSet;
      for (let index = 0; index < cards.length; index += 1) {
        for (const side of ["front", "back"] as const) {
          const file = side === "front" ? cards[index].frontFile : cards[index].backFile;
          if (!file) continue;
          const form = new FormData(); form.append("side", side); form.append("file", file);
          await jsonRequest(`/api/flashcards/cards/${saved.cards[index].id}/image`, { method: "POST", body: form });
        }
      }
      setSelectedId(saved.id); await loadSets(saved.id); setNotice("Flashcard set saved.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save this set."); }
    finally { setSaving(false); }
  };

  const deleteSet = async (set: ManualFlashcardSet) => {
    if (!window.confirm(`Delete “${set.title}”? This cannot be undone.`)) return;
    try { await jsonRequest(`/api/flashcards/sets/${set.id}`, { method: "DELETE" }); setView("library"); setSelectedId(null); await loadSets(); }
    catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete this set."); }
  };

  const currentCard = cards[studyIndex];
  const progress = cards.length ? Math.round((reviewed.size / cards.length) * 100) : 0;
  const showSideImage = (card: DraftCard, side: "front" | "back") => {
    const src = side === "front" ? card.frontPreview || imageFor(card, side)?.url : card.backPreview || imageFor(card, side)?.url;
    return src ? <Image src={src} alt={`${side} side illustration`} width={640} height={240} unoptimized className="h-auto max-h-48 w-auto max-w-full rounded-xl object-contain"/> : null;
  };

  if (locked) return <div className="mx-auto flex h-full max-w-3xl items-center justify-center px-5"><div className="w-full border-y border-white/10 py-12 text-center"><p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">Flashcards</p><h1 className="mt-3 text-3xl font-semibold text-white">Your study library is private</h1><p className="mx-auto mt-3 max-w-lg text-sm text-slate-400">Sign in to create, save, and study flashcard sets tied to your account.</p><Link href="/api/auth/signin?callbackUrl=/flashcards" className="mt-7 inline-flex rounded-xl bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-slate-950">Sign in</Link></div></div>;

  return <section className="h-full overflow-y-auto px-4 py-6 md:px-8 lg:px-10 custom-scrollbar">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.24em] text-cyan-300">Study tools</p><h1 className="mt-2 text-2xl font-semibold text-white md:text-3xl">Flashcards</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Build your own sets with text and optional images, then study at your pace.</p></div>{view === "library" ? <button onClick={startNew} className="rounded-xl bg-cyan-200 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-100">Create set</button> : <button onClick={() => setView("library")} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.08]">Back to library</button>}</header>
      {error ? <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-400/[0.08] px-4 py-3 text-sm text-red-200">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}

      {view === "library" ? <div className="mt-7">{loading ? <p className="text-sm text-slate-500">Loading sets…</p> : sets.length ? <div className="divide-y divide-white/[0.07] border-y border-white/[0.07]">{sets.map((set) => <article key={set.id} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h2 className="truncate text-base font-medium text-slate-100">{set.title}</h2><p className="mt-1 text-xs text-slate-500">{set.cards.length} {set.cards.length === 1 ? "card" : "cards"} · Updated {new Date(set.updatedAt).toLocaleDateString()}</p></div><div className="flex gap-2"><button onClick={() => openSet(set, "study")} className="rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-slate-950">Study</button><button onClick={() => openSet(set)} className="rounded-lg border border-white/10 px-3.5 py-2 text-xs text-slate-300 hover:bg-white/[0.05]">Edit</button><button onClick={() => void deleteSet(set)} className="rounded-lg border border-red-400/15 px-3.5 py-2 text-xs text-red-300 hover:bg-red-400/[0.06]">Delete</button></div></article>)}</div> : <div className="border-y border-dashed border-white/10 py-16 text-center"><h2 className="text-lg font-medium text-slate-200">No flashcard sets yet</h2><p className="mt-2 text-sm text-slate-500">Create a set to start building your study library.</p></div>}</div> : null}

      {view === "edit" ? <div className="mt-7 space-y-5"><div><label htmlFor="set-title" className="mb-2 block text-xs font-medium text-slate-300">Set name</label><input id="set-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} placeholder="Biology midterm" className="w-full max-w-xl rounded-xl border border-white/10 px-4 py-3 text-sm text-white"/></div>
        <div className="space-y-4">{cards.map((card, index) => <article key={card.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 md:p-5"><div className="mb-4 flex items-center justify-between"><p className="text-xs font-semibold text-slate-400">Card {index + 1}</p><div className="flex gap-1"><button aria-label={`Move card ${index + 1} up`} disabled={index === 0} onClick={() => moveCard(index, -1)} className="h-8 w-8 rounded-lg border border-white/10 text-slate-400 disabled:opacity-25">↑</button><button aria-label={`Move card ${index + 1} down`} disabled={index === cards.length - 1} onClick={() => moveCard(index, 1)} className="h-8 w-8 rounded-lg border border-white/10 text-slate-400 disabled:opacity-25">↓</button><button aria-label={`Delete card ${index + 1}`} disabled={cards.length === 1} onClick={() => setCards((current) => current.filter((_, cardIndex) => cardIndex !== index).map((item, position) => ({ ...item, position })))} className="h-8 rounded-lg border border-red-400/15 px-2 text-xs text-red-300 disabled:opacity-25">Delete</button></div></div><div className="grid gap-4 md:grid-cols-2">{(["front", "back"] as const).map((side) => <div key={side}><label htmlFor={`${card.id}-${side}`} className="mb-2 block text-xs font-medium capitalize text-slate-300">{side}</label><textarea id={`${card.id}-${side}`} value={side === "front" ? card.frontText : card.backText} onChange={(event) => updateCard(index, side === "front" ? { frontText: event.target.value } : { backText: event.target.value })} rows={4} maxLength={5000} className="w-full resize-y rounded-xl border border-white/10 px-3 py-3 text-sm text-white" placeholder={side === "front" ? "Term or question" : "Definition or answer"}/><div className="mt-2 flex min-h-20 items-center gap-3">{showSideImage(card, side)}<div><label className="inline-flex cursor-pointer rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.05]"><span>{side === "front" && (card.frontPreview || imageFor(card, side)) || side === "back" && (card.backPreview || imageFor(card, side)) ? "Replace image" : "Add image"}</span><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => chooseImage(index, side, event.target.files?.[0])}/></label>{(side === "front" && (card.frontPreview || imageFor(card, side)) || side === "back" && (card.backPreview || imageFor(card, side))) ? <button type="button" onClick={() => void removeImage(index, side)} className="ml-2 text-xs text-red-300">Remove</button> : null}<p className="mt-1 text-[10px] text-slate-600">JPG, PNG, WebP, GIF · 2 MB max</p></div></div></div>)}</div></article>)}</div>
        <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-5"><button onClick={() => setCards((current) => [...current, emptyCard(current.length)])} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/[0.05]">Add card</button><button onClick={() => void save()} disabled={saving} className="rounded-xl bg-cyan-200 px-5 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-50">{saving ? "Saving…" : "Save set"}</button>{selectedId ? <button onClick={() => setView("study")} className="rounded-xl border border-cyan-300/20 bg-cyan-300/[0.06] px-4 py-2.5 text-sm text-cyan-100">Study this set</button> : null}</div></div> : null}

      {view === "study" && currentCard ? <div className="mx-auto mt-8 max-w-3xl"><div className="mb-4 flex items-center justify-between text-xs text-slate-400"><span>{studyIndex + 1} / {cards.length}</span><span>{progress}% reviewed</span></div><div className="h-1 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full bg-cyan-300 transition-[width]" style={{ width: `${progress}%` }}/></div><ManualStudyCard key={currentCard.id} card={currentCard} onReview={() => setReviewed((current) => new Set(current).add(studyIndex))}/><div className="mt-5 flex items-center justify-between"><button disabled={studyIndex === 0} onClick={() => setStudyIndex((index) => index - 1)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 disabled:opacity-30">Previous</button><button onClick={() => { setStudyIndex(0); setReviewed(new Set()); }} className="text-xs text-slate-500 hover:text-slate-300">Restart</button><button disabled={studyIndex === cards.length - 1} onClick={() => setStudyIndex((index) => index + 1)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-30">Next</button></div></div> : null}
    </div>
  </section>;
}
