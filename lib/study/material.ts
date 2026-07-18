import type { StudyGenerationResult } from "./types";

export type ReusableStudyCard = { frontText: string; backText: string };

function normalizedKey(card: ReusableStudyCard) {
  return `${card.frontText.trim().toLocaleLowerCase()}\u0000${card.backText.trim().toLocaleLowerCase()}`;
}

export function studyCardsFromResult(result: StudyGenerationResult): ReusableStudyCard[] {
  const cards: ReusableStudyCard[] = [];

  for (const card of result.flashcards ?? []) {
    if (card.front.trim() && card.back.trim()) cards.push({ frontText: card.front.trim(), backText: card.back.trim() });
  }

  if (cards.length === 0) {
    for (const item of result.quiz ?? []) {
      if (item.type === "matching") {
        for (const pair of item.pairs) {
          if (pair.left.trim() && pair.right.trim()) cards.push({ frontText: pair.left.trim(), backText: pair.right.trim() });
        }
      } else if (item.question.trim() && item.answer.trim()) {
        cards.push({ frontText: item.question.trim(), backText: item.answer.trim() });
      }
    }
  }

  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = normalizedKey(card);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
