"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type CardSide = "front" | "back";

export function StudyFlipCard({ front, back, onReveal, testId = "manual-flashcard" }: { front: ReactNode; back: ReactNode; onReveal?: () => void; testId?: string }) {
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

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const content = (side: CardSide) => side === "front" ? front : back;
  const flip = () => {
    if (animating) return;
    const nextSide: CardSide = flipped ? "front" : "back";
    const duration = reducedMotion ? 140 : 620;
    setReverseSide(nextSide);
    setAnimating(true);
    setRotationTurns((turns) => turns + 1);
    if (!flipped) onReveal?.();
    timers.current.push(window.setTimeout(() => {
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
    data-testid={testId}
    data-side={flipped ? "back" : "front"}
    data-animating={animating ? "true" : "false"}
    data-flip-turn={rotationTurns}
    onClick={flip}
    aria-label={flipped ? "Show question" : "Show answer"}
    aria-pressed={flipped}
    aria-disabled={animating}
    className="manual-flashcard-perspective group block w-full cursor-pointer rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-[#080a0f]"
  >
    <span data-testid={`${testId}-inner`} className={`manual-flashcard-inner block ${animating ? "is-animating" : ""}`} style={{ transform: `rotateX(${rotationTurns * 360}deg)` }}>
      <span className="manual-flashcard-face manual-flashcard-face-front">{content(primarySide)}</span>
      <span aria-hidden="true" className="manual-flashcard-face manual-flashcard-face-back">{content(reverseSide)}</span>
    </span>
  </button>;
}
