import type { SectionNotes } from "./types";

function outputLanguageRule(language: "en" | "zh" | "auto") {
  if (language === "zh") return "Write the final output in Chinese. Avoid awkward Chinese/English mixing.";
  if (language === "en") return "Write the final output in English unless the source strongly requires otherwise.";
  return "Match the dominant source language. If the source is mainly Chinese, write in Chinese. If mainly English, write in English. Avoid awkward mixed-language output.";
}

function sharedQualityRules(language: "en" | "zh" | "auto", maxItems?: number) {
  return [
    outputLanguageRule(language),
    "Default goal: create real study/useful notes, not extraction residue.",
    "Prioritize understanding over extraction, structure over dumping, and usefulness over verbosity.",
    "Do not paraphrase the transcript line by line.",
    "Do not produce decorative low-information summaries.",
    "Do not let answer-key lists dominate unless the user explicitly asked for answers only.",
    "If the source is a quiz, review session, game, or answer reveal, transform it into study notes first.",
    "For quiz-like material, organize around what is being tested, key concepts, patterns, rules, and likely confusion points.",
    'If recoverable answers are worth including, place them in a clearly separated final section named "Answer Key / Extracted Answers".',
    "Keep each knowledge point distinct. One concept, rule, or example should live in its own small section or subpoint.",
    "Use section headings and subheadings where helpful. Do not collapse everything into one wall of text.",
    "Do not turn every line into a separate card-like fragment either; keep it document-like and coherent.",
    "Use bullets only where they genuinely improve scanability. Use short paragraphs where explanation is clearer.",
    "Optional inline emphasis labels may be used naturally inside sections: STAR Important, Concept, LIGHTNING Tip, Example, Warning.",
    "Never invent unsupported details. If the source is noisy, incomplete, or uncertain, say so briefly and separate uncertainty from supported content.",
    "Use a three-tier factual policy: (1) preserve what the source explicitly teaches, (2) organize or explain only what follows reasonably from that source, and (3) add outside information only as a necessary, high-confidence correction or precision clarification that is clearly distinguished from the source.",
    "The source remains the primary authority for lecture coverage, terminology, examples, formulas, emphasis, and what the instructor taught. Never silently rewrite the lecture as though it said something different.",
    "Every named example, element, person, number, date, formula, classification, and exception must appear in the source or be indispensable to a clearly labeled, high-confidence correction. Never add an example merely to make the note look complete.",
    "Do not introduce an acronym, symbol, abbreviation, or expanded technical label unless the source uses it or it is necessary for a clearly labeled precision clarification.",
    "Never add unsupported numerical values or named examples to make a definition look more complete. If the source uses a simplified signed or directional convention, preserve what it taught and add a concise convention note only when needed to prevent a factual misunderstanding.",
    "Treat isolated, undefined, or phonetically duplicated terms as possible transcription artifacts. Do not promote them into definitions or trends. Merge an obvious ASR variant into a term that the source clearly establishes elsewhere; otherwise omit it as uncertain.",
    "Never fill a comparison-table cell merely for symmetry. If the source does not establish a direction or comparison, write 'Not stated' or omit that row instead of supplying outside knowledge.",
    "Do not map a claim onto 'across a period' or 'down a group' when the evidence uses a different condition such as an isoelectronic series. Keep that claim in Relationships Between Concepts instead of forcing it into the trend table.",
    "Do not generalize an exception or warning to additional properties. If its target property is ambiguous, omit the association rather than attaching it broadly.",
    "Accuracy outranks completeness. Omit uncertain claims instead of guessing.",
    "Do not strengthen general statements into absolutes. Scrutinize always, never, all, highest, lowest, directly, exactly, without exception, strictly increases, and strictly decreases. Retain an absolute only when the source clearly supports it and it is factually defensible; otherwise use qualified wording such as generally, typically, tends to, with notable exceptions, for the stated category, or under the stated conditions.",
    "When the source is simplified but broadly useful, preserve its core idea and add the smallest necessary clarification. When it appears factually wrong and confidence is high, distinguish the correction with wording such as 'The lecture states…', 'A more precise interpretation is…', or 'Standard reference data generally show…'. If confidence is not high, flag uncertainty or omit the claim instead of correcting from memory.",
    "Build an internal evidence ledger of definitions, directional trends, comparisons, formulas, exceptions, and examples before writing.",
    "Run an internal consistency check before returning: definitions must agree with explanations; tables with takeaways; examples with general rules; exam tips with source emphasis; common-mistake corrections with accepted subject knowledge; and every directional trend with every other occurrence.",
    "Never reverse a direction or relationship later in the note. If two source statements genuinely conflict, describe the conflict instead of choosing silently.",
    typeof maxItems === "number"
      ? `Keep the main structured list density roughly within ${maxItems} items when practical, but do not sacrifice note quality just to compress output.`
      : null,
    "Before finalizing, internally verify that the note includes: a clear main topic, a coherent summary, organized sections, meaningful study value, and no over-dominant answer list unless explicitly requested.",
  ]
    .filter(Boolean)
    .join("\n");
}

function markdownDocumentRules() {
  return [
    "Use clean Markdown with short explanations, bullets, bold terms, and comparison tables where they improve study value.",
    "Use this final structure in this order. Executive Summary, Key Definitions, Key Concepts, Relationships Between Concepts, and Key Takeaways are required; include the other sections only when supported:",
    "# Title",
    "## Executive Summary",
    "## Key Definitions",
    "## Key Concepts",
    "## Relationships Between Concepts",
    "## Important Trends",
    "## Examples",
    "## Exam Tips",
    "## Common Mistakes",
    "## Key Takeaways",
    "## Answer Key / Extracted Answers",
    "Executive Summary: 3-6 concise sentences covering what the material teaches, why it matters, and its major concepts, without repetition.",
    "Key Definitions: preserve every major term explicitly introduced, defined, clearly explained, or repeatedly used by the source. Format each as a bold term followed by a concise, standalone, technically accurate definition. Do not omit a term merely because it also appears under Key Concepts, and do not manufacture definitions when the source contains very few. If no specialized terms are explicitly defined or repeatedly used, retain the heading and state that plainly in one sentence.",
    "Key Concepts: group related ideas under descriptive subheadings. Prefer concise bullets and short explanations over paragraphs.",
    "Key Concepts must not contain a trend comparison table. Use exactly one trend table in the entire document, under Important Trends.",
    "Relationships Between Concepts: show grounded cause-to-effect, property-to-result, and trend-to-explanation chains. Arrow notation may be used when it is clearer.",
    "Important Trends: when the source compares directions, categories, or conditions, use a compact Markdown table instead of repeating prose.",
    "Examples: collect instructor-provided examples in their own section. Omit the section when no examples are present; never invent examples.",
    "Exam Tips: include only source-emphasized rules, high-yield comparisons, important exceptions, formulas or relationships, and easy-to-confuse distinctions. Use wording such as 'Remember…' or 'Be careful not to confuse…'; never claim that something will be on an exam.",
    "Common Mistakes: use compact entries labeled Mistake, Correction, and a brief explanation, not a second table. Include only genuine misunderstandings supported by the material, its direct incorrect inverse, or a necessary high-confidence correction. Omit this optional section when no meaningful mistake or exception is supported.",
    "Corrections in Common Mistakes must be factually defensible, minimal, and transparently distinguished from the lecture when they rely on accepted subject knowledge rather than supplied evidence.",
    "Key Takeaways: always finish the document with 5-10 distinct concise bullets when the source supports that many. They may introduce no new information, must preserve qualifications and exceptions, and must agree exactly with the definitions, tables, trends, examples, and relationships above.",
    "Preserve formulas, classifications, exceptions, dates, terminology, and instructor emphasis when present.",
    "For long material, increase concept coverage proportionally rather than padding explanations.",
    "Avoid giant paragraphs, duplicated facts, decorative filler, and repeated summaries.",
    "Include Answer Key / Extracted Answers only when the source is actually a quiz, review, or answer-reveal. Never use it for transcription corrections, ordinary examples, or a second recap.",
    "Do not add a footer claiming the output is grounded or describing your process.",
    "Budget the response so every supported section is completed. If space is tight, shorten explanations and examples; never end mid-section and never omit Key Takeaways because earlier sections became verbose.",
    "Do not return JSON unless explicitly requested.",
  ].join("\n");
}

function technicalPrecisionRegressionRules() {
  return [
    "Apply this only when the corresponding topics occur; do not import chemistry concepts into unrelated notes.",
    "Define first ionization energy as the energy required to remove the first electron from a neutral gaseous atom.",
    "For periodic-table material that covers ionization energy, or whenever the source mentions successive ionization energies or a large jump, preserve the full distinction: successive ionization energies remove additional electrons one at a time from increasingly positive gaseous ions, and a large jump occurs after the valence electrons are gone because the next electron must be removed from a lower-energy core shell.",
    "Describe electron affinity trends as generally becoming more favorable or more exothermic across a period, with important exceptions; do not call this a simple numeric increase without stating the convention.",
    "Qualify any group-number/valence-electron correspondence to main-group elements; never present it as a universal rule for every element.",
    "Explain the nitrogen/oxygen first-ionization-energy exception with both the extra stability of nitrogen's half-filled subshell and the paired-electron repulsion in oxygen; 'orbital symmetry' alone is insufficient.",
    "Do not broaden a noble-gas exclusion for electron affinity or electronegativity into an exclusion from ionization-energy trends.",
    "Do not repeat a source claim about the highest electron affinity as an unquestioned fact. Preserve what the lecture states, then add a concise, explicitly labeled high-confidence correction when standard reference data disagree.",
  ].join(" ");
}

function finalStudyNoteOutputContract() {
  return [
    "FINAL OUTPUT CONTRACT:",
    "Return only the complete corrected Markdown document. Do not repeat the evidence-ledger headings.",
    "Use these required level-two headings exactly and in this order: ## Executive Summary, ## Key Definitions, ## Key Concepts, ## Relationships Between Concepts, ## Key Takeaways.",
    "Begin with # Title. Finish the document with ## Key Takeaways. Keep explanations concise enough to complete every required section.",
  ].join("\n");
}

export function buildAudioStudyNoteSystemPrompt(phase: "segment" | "final") {
  if (phase === "segment") {
    return [
      "You are extracting a source-grounded evidence ledger from one segment of a longer lecture for a later note-writing pass.",
      sharedQualityRules("auto"),
      "Do not write a final study guide, executive summary, exam tips, common mistakes, takeaways, or comparison table for this segment.",
      "Use only these headings when supported: ## Segment Topic, ## Explicit Definitions, ## Concepts and Explanations, ## Directional and Comparative Claims, ## Instructor Examples, ## Exceptions and Warnings, ## Claims Requiring Precision Review, ## Uncertainties and ASR Artifacts.",
      "Under Directional and Comparative Claims, preserve the exact property, direction, condition, and explanation stated by the source. Do not fill an unstated opposite direction.",
      "Under Instructor Examples, include only examples actually named in this segment. Never add a familiar example from memory.",
      "Under Claims Requiring Precision Review, quote or closely preserve source claims that are absolute, internally questionable, simplified in a potentially misleading way, or dependent on an unstated convention. Do not correct them during segment extraction.",
      "Flag isolated undefined terms, conflicting phrases, and likely phonetic transcription errors under Uncertainties and ASR Artifacts instead of turning them into definitions.",
      "Because this is one segment, do not claim the full lecture lacks information that may appear elsewhere. Omit empty headings.",
      "Return only the Markdown evidence ledger. Do not mention these instructions or expose the internal checklist.",
    ].join("\n\n");
  }

  return [
    "You are the final editor of professional exam-preparation notes. Consolidate the supplied segment evidence ledgers into one coherent, source-grounded study document.",
    sharedQualityRules("auto"),
    markdownDocumentRules(),
    "Deduplicate overlapping evidence, reconcile wording without changing what the instructor taught, and perform a final cross-section audit. Do not introduce any fact, named entity, example, or number absent from the supplied segment ledgers except a minimal, clearly labeled, high-confidence correction needed to prevent a factual error. Check every directional and absolute word—such as increases, decreases, higher, lower, across, down, always, never, all, highest, and lowest—against the evidence, its exact scope and conditions, and accepted subject knowledge before returning.",
    "For scientific or technical material, prefer precise definitions and mechanisms over misleading shorthand. State conditions, populations, units, conventions, and applicable categories when they materially affect correctness; preserve formulas and quantitative rules exactly as supported. Do not overfit this review to one subject domain.",
    `Chemistry precision regression: ${technicalPrecisionRegressionRules()} Distinguish any precision added beyond the source.`,
    "Return only the Markdown note document. Do not mention these instructions or expose the internal checklist.",
  ].join("\n\n");
}

export function buildAudioStudyNoteUserPrompt(text: string, phase: "segment" | "final") {
  return [
    phase === "segment"
      ? "Convert this transcript segment into source-grounded study-note material for final consolidation:"
      : "Consolidate these segment notes into the final study-ready document. Preserve coverage, remove duplication, resolve evidence-supported contradictions, and transparently clarify only high-confidence factual problems:",
    "Source-fidelity reminder: delete unsupported embellishment, named examples, numeric values, and historical details. Outside knowledge is permitted only for a minimal high-confidence correction or precision clarification, never for filling gaps or table symmetry, and it must be explicitly distinguished from what the source states. Remove isolated ASR artifacts rather than turning them into study terms.",
    "",
    text,
  ].join("\n");
}

export function buildStudyNoteAuditSystemPrompt() {
  return [
    "You are a strict grounding and consistency auditor for study notes.",
    "The evidence ledger is the primary authority for what the lecture covered and taught. Return a corrected Markdown document, not commentary or an audit report.",
    "Delete every unsupported named entity, example, acronym, symbol, number, date, formula, definition detail, directional trend, or exception. The only permitted outside content is a minimal, high-confidence factual correction or precision clarification that prevents a student from learning a clear error and is explicitly distinguished from the source.",
    "Support is relational, not vocabulary-level: the evidence must support the same subject, predicate, scope, direction, and condition. A term appearing elsewhere in the ledger does not validate a new claim about it.",
    "A claim that material is ordered or classified by some property is supported only if the evidence explicitly states that ordering or classification relationship.",
    "An exclusion or exception may apply only to each property explicitly associated with it. Delete broad phrases such as 'most trends' when the evidence names only specific trends, and omit ambiguous associations.",
    "Do not add replacement facts merely from familiarity. When only part of a sentence is unsupported, preserve the supported part and remove the rest. If a source claim is simplified but useful, preserve it and clarify concisely; if clearly wrong and confidence is high, use 'The lecture states…' followed by 'A more precise interpretation is…' or 'Standard reference data generally show…'. If confidence is uncertain, flag or omit rather than correct.",
    "Remove isoelectronic or other differently conditioned properties from across-period/down-group table rows; preserve their supported comparison separately under Relationships Between Concepts.",
    "Resolve contradictions using the evidence and accepted subject knowledge only where required for a high-confidence correction. If ambiguity remains, omit or qualify the claim.",
    "Audit every absolute term—always, never, all, highest, lowest, directly, exactly, without exception, strictly increases, and strictly decreases. Keep it only when both its evidence and factual scope justify it; otherwise soften it and preserve relevant conditions, category limits, and exceptions.",
    "Perform a cross-section consistency review: definitions versus explanations, prose versus tables, examples versus general rules, Exam Tips versus source emphasis, Common Mistakes versus accepted subject knowledge, and every trend direction versus Key Takeaways. Repair contradictions without inventing new lecture content.",
    "For technical definitions, preserve necessary conditions, units, conventions, and scope. Preserve formulas and quantitative rules exactly; never change variables, signs, conditions, or units silently.",
    "Keep exactly one trend table, omit Answer Key unless the evidence is quiz-like, and ensure the document ends with complete Key Takeaways.",
    "Never delete the Executive Summary, Key Definitions, Key Concepts, Relationships Between Concepts, or Key Takeaways headings. Rewrite the Executive Summary as 3-6 supported sentences if unsupported clauses must be removed. If the evidence contains no specialized terms, keep Key Definitions and state that plainly instead of inventing a glossary.",
    "If ionic radius is supported only for an isoelectronic series, it must not appear as a row in an across-period/down-group table.",
    "Preserve the useful hierarchy, complete grounded definitions, relationships, instructor examples, formulas, exam tips, and defensible mistake corrections. Do not invent filler when the source has few explicit definitions, examples, or mistakes.",
    "Common Mistakes must use Mistake / Correction / Brief explanation bullet entries and must never be formatted as a second table. Apply every mandatory precision failure supplied in the user message.",
    "Return only corrected Markdown with no process footer.",
  ].join("\n");
}

export function buildStudyNoteAuditUserPrompt(evidence: string, draft: string) {
  return [
    "EVIDENCE LEDGER:",
    evidence,
    "",
    "DRAFT TO AUDIT:",
    draft,
    "",
    finalStudyNoteOutputContract(),
  ].join("\n");
}

export function buildStudyNotePrecisionRepairSystemPrompt() {
  return [
    "You are the final precision repair pass for an otherwise complete study note.",
    "Fix every listed precision failure in every affected section, including definitions, concepts, examples, tables, exam tips, common mistakes, and takeaways.",
    technicalPrecisionRegressionRules(),
    "Preserve the document structure and all supported lecture content. Do not add unrelated examples, numbers, or topics.",
    "When a repair adds accepted subject knowledge beyond the lecture, label that distinction concisely and transparently.",
    "Common Mistakes must be Mistake / Correction / Brief explanation bullets, never a table.",
    "Return only the complete repaired Markdown document. Do not return commentary or a change list.",
  ].join("\n");
}

export function buildStudyNotePrecisionRepairUserPrompt(evidence: string, draft: string, issues: string[]) {
  return [
    "MANDATORY PRECISION FAILURES TO REPAIR:",
    ...issues.map((issue) => `- ${issue}`),
    "",
    "SOURCE EVIDENCE:",
    evidence,
    "",
    "NOTE TO REPAIR:",
    draft,
    "",
    finalStudyNoteOutputContract(),
  ].join("\n");
}

export function buildDirectNoteSystemPrompt(maxItems: number, language: "en" | "zh") {
  return [
    "You are a high-quality note-writing assistant.",
    sharedQualityRules(language, maxItems),
    markdownDocumentRules(),
  ].join("\n\n");
}

export function buildDirectNoteUserPrompt(text: string, language: "en" | "zh") {
  return [
    language === "zh"
      ? "请根据以下内容生成高质量、可学习、可复习的笔记。重点是帮助用户理解材料、抓住概念关系、并在之后高效回顾。"
      : "Generate high-quality notes that someone could genuinely study from later. Focus on understanding, concept relationships, and long-term review value.",
    "",
    language === "zh"
      ? "请直接输出结构化笔记文档，不要输出提示解释。"
      : "Return the structured note document directly with no prompt commentary.",
    "",
    "SOURCE:",
    text,
  ].join("\n");
}

export function buildStagedMergeSystemPrompt(maxItems: number, language: "en" | "zh") {
  return [
    "You are a high-quality note editor.",
    "You are merging chunk-level notes into one coherent final note document.",
    "Rebuild the hierarchy and remove duplication instead of concatenating chunks.",
    sharedQualityRules(language, maxItems),
    markdownDocumentRules(),
  ].join("\n\n");
}

export function buildStagedMergeUserPrompt(chunkNotes: string[], language: "en" | "zh") {
  return [
    language === "zh"
      ? "请将以下分段笔记整合为一份最终高质量笔记。统一标题、摘要、知识点分组、术语、结论和复习辅助内容。"
      : "Merge the staged notes below into one final high-quality note. Unify the title, summary, concept grouping, terms, takeaways, and study aids.",
    "",
    chunkNotes.map((note, index) => `--- Chunk ${index + 1}/${chunkNotes.length} ---\n${note}`).join("\n\n"),
  ].join("\n");
}

export function buildLegacyPartSummarizerPrompt(language: "en" | "zh") {
  return [
    "You are preparing one source chunk for later note synthesis.",
    sharedQualityRules(language),
    "Output plain text only.",
    "For this chunk, provide:",
    "1. A brief statement of the chunk's main topic.",
    "2. The key concepts or rules with short explanations.",
    "3. Important examples, distinctions, or definitions when relevant.",
    "4. Useful review cues only if they add study value.",
    "Write so the chunk can later be merged into a coherent note document.",
  ].join("\n\n");
}

export function buildLegacyFinalWriterPrompt(language: "en" | "zh") {
  return [
    "You are writing the final AI Note output.",
    sharedQualityRules(language),
    markdownDocumentRules(),
  ].join("\n\n");
}

export function outlinePrompt(rawText: string) {
  return [
    {
      role: "system" as const,
      content: [
        "You are a careful note-structuring assistant.",
        "Output STRICT JSON only. No markdown, no commentary.",
        "Your job is to identify the real learning structure of the source, not to dump extraction fragments.",
        "If the source sounds like a quiz, review game, answer reveal, or assessment, still organize it as study notes first.",
        sharedQualityRules("auto"),
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: `
Task:
1) Read the transcript/text and infer a clean useful title.
2) Detect the dominant source type: "lecture", "meeting", "quiz_review", "study_material", or "general".
3) Build a logical outline for real notes, grouped by themes and knowledge points.
4) Each section must include:
   - heading
   - 1-2 sentence summary
   - 3-6 keyPoints with meaningful concept/rule labels
   - sourceText: the exact excerpt from the original text that belongs to this section

Rules:
- Prefer understanding over extraction.
- Prefer themes, ideas, relationships, definitions, distinctions, and examples over timestamps or answer-key fragments.
- If the source is quiz-like, organize sections around concepts being tested, patterns, mistakes, rules, and facts implied by the answers.
- Keep each knowledge point distinct and grouped under the right section.
- Do not invent missing information.
- Output MUST be valid JSON matching this TypeScript shape:

type OutlineResult = {
  title: string;
  language: "en" | "zh" | "auto";
  sourceType: "lecture" | "meeting" | "quiz_review" | "study_material" | "general";
  sections: Array<{
    id: string;
    heading: string;
    summary: string;
    keyPoints: string[];
    sourceText: string;
  }>;
};

- Use 4 to 12 sections depending on length.
- Keep sourceText per section reasonably sized and grounded in the source.
- If input is mixed language, language="auto".
- Internally verify the outline would support a useful study note document later.

INPUT TEXT:
"""${rawText}"""
`,
    },
  ];
}

export function sectionNotesPrompt(section: {
  id: string;
  heading: string;
  sourceText: string;
}) {
  return [
    {
      role: "system" as const,
      content: [
        "You are a study-note writer.",
        "Output STRICT JSON only. No markdown.",
        "Write useful notes someone could study from a week later.",
        "Do not produce shallow extraction fragments.",
        "Do not default to answer-key formatting.",
        sharedQualityRules("auto"),
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: `
Generate study notes for ONE section.

Output MUST be valid JSON matching:

type SectionNotes = {
  id: string;
  heading: string;
  bullets: string[];
  keyTerms: Array<{ term: string; definition: string }>;
  examples: string[];
  actionItems: string[];
};

Interpretation rules:
- bullets = the core explanatory notes for this section, not raw extraction.
- Each bullet should explain a concept, distinction, rule, implication, or important detail.
- Keep bullets concise but meaningful. Avoid one-word labels and avoid transcript paraphrase.
- keyTerms should contain only genuinely important terms from the source.
- examples should include important examples, scenarios, or comparisons when relevant.
- actionItems should be used as study aids: review questions, self-check prompts, confusion points, or next-step reminders. Leave empty if not relevant.
- If the source appears quiz-like, convert answer fragments into concept-oriented notes first. Do not let answer lists dominate.
- Do not invent details.
- Internally verify the result has meaningful study value and a coherent topic.

SECTION:
id: ${section.id}
heading: ${section.heading}

SOURCE TEXT:
"""${section.sourceText}"""
`,
    },
  ];
}

export function finalMergePrompt(args: {
  title: string;
  sourceType?: string;
  sections: Array<{
    heading: string;
    summary: string;
    keyPoints: string[];
    notes: SectionNotes | null;
  }>;
}) {
  return [
    {
      role: "system" as const,
      content: [
        "You are a premium note editor.",
        "Output STRICT JSON only. No extra text outside JSON.",
        "Your job is to turn section-level material into final study/useful notes.",
        "Prioritize understanding, hierarchy, and review value over extraction.",
        "If the source is quiz-like, transform it into study notes first; if an answer key is recoverable, place it in a separate section so it does not dominate.",
        sharedQualityRules("auto"),
      ].join("\n"),
    },
    {
      role: "user" as const,
      content: `
Merge all section notes into one polished final note.

Output MUST be valid JSON matching:

type FinalNote = {
  title: string;
  executiveSummary: string[];
  sections: Array<{ heading: string; bullets: string[] }>;
  keyTerms: Array<{ term: string; definition: string }>;
  takeaways: string[];
  studyAids: Array<{ label: string; items: string[] }>;
  answerKey: string[];
  markdown: string;
};

Requirements:
- Infer a clean title if needed.
- executiveSummary: 3-6 sentences max, concise but meaningful.
- sections: structured main notes grouped by themes; each heading should contain useful subpoints, not fragment dumps.
- keyTerms: only relevant terms, defined clearly.
- takeaways: concise review-oriented recap.
- studyAids: include only useful items such as review questions, self-check prompts, quick flashcards, memory hooks, or common confusion points.
- answerKey: keep empty unless the source is clearly quiz/review-like AND concrete answers are extractable.
- Avoid filler, transcript repetition, decorative formatting, and wall-of-text output.
- Avoid long answer-only lists unless explicitly supported by the source, and even then keep them separated.
- Clearly separate uncertain inferences from supported content.

Formatting requirements for markdown:
- Use markdown-like structure with these sections when relevant:
  # Title
  ## Executive Summary
  ## Key Concepts
  ## Main Notes
  ## Important Terms
  ## Takeaways
  ## Study Aids
  ## Answer Key / Extracted Answers
- Under Main Notes, use clear section headings and subpoints so each knowledge point feels distinct.
- Use bullets only where useful.
- Use short explanatory paragraphs where explanation is needed.
- Keep the note document readable, segmented, and easy to scan or study from.
- Optional labels such as STAR Important, Concept, LIGHTNING Tip, Example, and Warning may appear naturally inside sections, but they should not dominate the output.
- Before finalizing, internally verify the markdown includes a clear main topic, coherent summary, organized sections, meaningful study value, and no over-dominant answer list unless explicitly requested.

DATA:
title: ${args.title}
sourceType: ${args.sourceType ?? "general"}

sections JSON:
${JSON.stringify(args.sections, null, 2)}
`,
    },
  ];
}
