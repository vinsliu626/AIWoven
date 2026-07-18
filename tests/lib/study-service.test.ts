import { describe, expect, it } from "vitest";
import { getStudyPlanLimits } from "@/lib/study/limits";
import { studyCardsFromResult } from "@/lib/study/material";
import { sanitizeStudyText, truncateStudyText, validateGeneratedQuizItem } from "@/lib/study/service";
import type { StudyGenerationResult } from "@/lib/study/types";

describe("study limits", () => {
  it("returns conservative limits for basic users", () => {
    const limits = getStudyPlanLimits("basic");
    expect(limits.generationsPerDay).toBe(1);
    expect(limits.maxFileSizeBytes).toBe(2 * 1024 * 1024);
    expect(limits.maxExtractedChars).toBe(8_000);
    expect(limits.maxQuizQuestions).toBe(10);
    expect(limits.allowedDifficulties).toEqual(["easy", "medium"]);
  });

  it("truncates long text near a sentence boundary", () => {
    const longText = `${"Sentence one. ".repeat(400)}Tail`;
    const result = truncateStudyText(longText, 400);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(400);
    expect(result.text.endsWith(".")).toBe(true);
  });

  it("preserves document structure and prioritizes question-rich sections when truncating", () => {
    const source = sanitizeStudyText(
      [
        "Chapter 1 overview\nKey ideas about metabolism and ATP.",
        "Question 1. Explain the relationship between ATP production and oxygen availability.\nQuestion 2. Compare aerobic and anaerobic respiration.",
        "Question 3. Why does mitochondrial membrane structure matter for energy transfer?\nQuestion 4. Apply this to muscle fatigue during sprinting.",
      ].join("\n\n")
    );

    const result = truncateStudyText(source, 260);

    expect(result.truncated).toBe(true);
    expect(result.text).toContain("Question 1.");
    expect(result.text).toContain("Question 2.");
  });
});

describe("generated quiz validation", () => {
  it("requires explanation and a correct answer present in unique options", () => {
    expect(validateGeneratedQuizItem({ type: "multiple_choice", question: "Q?", options: ["A", "B"], answer: "A" })).toBeNull();
    expect(validateGeneratedQuizItem({ type: "multiple_choice", question: "Q?", options: ["A", "A"], answer: "A", explanation: "Because A." })).toBeNull();
    expect(validateGeneratedQuizItem({ type: "multiple_choice", question: "Q?", options: ["A", "B"], answer: "C", explanation: "Because C." })).toBeNull();
  });

  it("accepts a fully explained valid question", () => {
    expect(validateGeneratedQuizItem({ type: "multiple_choice", question: "Q?", options: ["A", "B"], answer: "A", explanation: "The document identifies A." })).toMatchObject({ answer: "A", explanation: "The document identifies A." });
  });
});

describe("reusable study material", () => {
  const meta: StudyGenerationResult["meta"] = {
    selectedModes: ["quiz"],
    generatedCounts: { quiz: 2 },
    truncated: false,
    originalCharCount: 100,
    usedCharCount: 100,
  };

  it("uses generated flashcards as the shared dataset and removes normalized duplicates", () => {
    expect(studyCardsFromResult({
      flashcards: [
        { front: " ATP ", back: "Cellular energy" },
        { front: "atp", back: " cellular energy " },
      ],
      quiz: [{ type: "fill_blank", question: "This quiz item is ignored", answer: "when flashcards exist", explanation: "Flashcards are the primary material." }],
      meta: { ...meta, selectedModes: ["flashcards", "quiz"] },
    })).toEqual([{ frontText: "ATP", backText: "Cellular energy" }]);
  });

  it("derives reusable cards from quiz questions and matching pairs", () => {
    expect(studyCardsFromResult({
      quiz: [
        { type: "fill_blank", question: "Organelle that makes ATP", answer: "Mitochondrion", explanation: "It performs cellular respiration." },
        { type: "matching", prompt: "Match the organelles", pairs: [{ left: "Chloroplast", right: "Photosynthesis" }], explanation: "The document pairs each organelle with its process." },
      ],
      meta,
    })).toEqual([
      { frontText: "Organelle that makes ATP", backText: "Mitochondrion" },
      { frontText: "Chloroplast", backText: "Photosynthesis" },
    ]);
  });
});
