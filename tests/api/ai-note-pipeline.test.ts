import { describe, expect, it } from "vitest";
import { AiNoteGenerationError, applySafeStudyNotePrecisionCorrections, assertFinalStudyNoteStructure, ensureOutline, findStudyNotePrecisionIssues, mapGenerationProviderError, mergeStudyNotePrecisionIssues } from "@/lib/aiNote/pipeline";
import { buildAudioStudyNoteSystemPrompt, buildStudyNoteAuditSystemPrompt, buildStudyNotePrecisionRepairSystemPrompt } from "@/lib/aiNote/prompts";

describe("AI Note generation pipeline normalization", () => {
  it("accepts useful model output when optional enum and source fields drift", () => {
    const outline = ensureOutline({
      title: "Electronegativity and Atomic Trends",
      language: "English",
      sourceType: "educational_video",
      sections: [
        {
          id: "atomic-radius",
          heading: "Atomic Radius Trend",
          summary: "Atomic radius decreases across a period.",
          keyPoints: ["Effective nuclear charge increases."],
        },
      ],
    });

    expect(outline.language).toBe("auto");
    expect(outline.sourceType).toBe("general");
    expect(outline.sections[0]).toMatchObject({
      id: "atomic-radius",
      sourceText: "Atomic radius decreases across a period.",
    });
  });

  it("rejects an outline with no usable educational content", () => {
    expect(() => ensureOutline({ title: "Empty", sections: [] })).toThrowError(AiNoteGenerationError);
  });

  it.each([
    ["Groq failed: 401\ninvalid token", "NOTE_GENERATION_AUTH_FAILED", false, 401],
    ["Groq failed: 429\nPlease try again in 1.25s", "NOTE_GENERATION_RATE_LIMITED", true, 429],
    ["request timeout", "NOTE_GENERATION_TIMEOUT", true, undefined],
    ["Groq failed: 503\nupstream unavailable", "NOTE_GENERATION_FAILED", true, 503],
  ])("maps provider failures without weakening retry semantics", (message, code, retryable, status) => {
    const error = mapGenerationProviderError(new Error(message));
    expect(error).toMatchObject({ code, retryable, providerStatus: status });
  });

  it("requires the complete study-note structure and grounded consistency audit", () => {
    const prompt = buildAudioStudyNoteSystemPrompt("final");
    for (const heading of [
      "Executive Summary",
      "Key Definitions",
      "Key Concepts",
      "Relationships Between Concepts",
      "Important Trends",
      "Examples",
      "Exam Tips",
      "Common Mistakes",
      "Key Takeaways",
    ]) {
      expect(prompt).toContain(`## ${heading}`);
    }
    expect(prompt).toContain("internal evidence ledger");
    expect(prompt).toContain("direct incorrect inverse");
    expect(prompt).toContain("Check every directional and absolute word");
    expect(prompt).toContain("never invent examples");
    expect(prompt).toContain("three-tier factual policy");
    expect(prompt).toContain("Never add unsupported numerical values or named examples");
    expect(prompt).toContain("absent from the supplied segment ledgers except");
    expect(prompt).toContain("never omit Key Takeaways");
    expect(prompt).toContain("exactly one trend table");
    expect(prompt).toContain("possible transcription artifacts");
    expect(prompt).toContain("Never fill a comparison-table cell merely for symmetry");
    expect(prompt).toContain("Do not introduce an acronym");
    expect(prompt).toContain("Do not generalize an exception or warning");
    expect(prompt).toContain("only when the source is actually a quiz");
    expect(buildAudioStudyNoteSystemPrompt("segment")).toContain("Claims Requiring Precision Review");
    expect(prompt).toContain("first electron from a neutral gaseous atom");
    expect(prompt).toContain("increasingly positive gaseous ions");
    expect(prompt).toContain("more favorable or more exothermic");
    expect(prompt).toContain("main-group elements");
    expect(prompt).toContain("paired-electron repulsion");
    expect(prompt).toContain("Do not overfit this review to one subject domain");
  });

  it("keeps segment extraction distinct from final consolidation", () => {
    const segmentPrompt = buildAudioStudyNoteSystemPrompt("segment");
    expect(segmentPrompt).toContain("evidence ledger from one segment of a longer lecture");
    expect(segmentPrompt).toContain("## Directional and Comparative Claims");
    expect(segmentPrompt).toContain("## Uncertainties and ASR Artifacts");
    expect(segmentPrompt).toContain("Do not write a final study guide");
    expect(segmentPrompt).not.toContain("Use exactly one trend table");
    expect(buildAudioStudyNoteSystemPrompt("final")).toContain("final editor of professional exam-preparation notes");
  });

  it("captures the provider retry delay for bounded rate-limit recovery", () => {
    const error = mapGenerationProviderError(new Error("Groq failed: 429\nPlease try again in 26.73s"));
    expect(error).toMatchObject({
      code: "NOTE_GENERATION_RATE_LIMITED",
      retryable: true,
      retryAfterMs: 26_730,
    });
  });

  it.each([
    ["Please try again in 864ms", 864],
    ["Please try again in 1m4.5s", 64_500],
  ])("parses provider retry windows expressed as %s", (message, retryAfterMs) => {
    expect(mapGenerationProviderError(new Error(`Groq failed: 429\n${message}`)).retryAfterMs).toBe(retryAfterMs);
  });

  it("audits the final draft against the source ledger without adding replacements", () => {
    const prompt = buildStudyNoteAuditSystemPrompt();
    expect(prompt).toContain("evidence ledger is the primary authority");
    expect(prompt).toContain("Delete every unsupported named entity");
    expect(prompt).toContain("Do not add replacement facts merely from familiarity");
    expect(prompt).toContain("ends with complete Key Takeaways");
    expect(prompt).toContain("Support is relational, not vocabulary-level");
    expect(prompt).toContain("same subject, predicate, scope, direction, and condition");
    expect(prompt).toContain("Never delete the Executive Summary");
    expect(prompt).toContain("must not appear as a row");
    expect(prompt).toContain("Audit every absolute term");
    expect(prompt).toContain("Common Mistakes versus accepted subject knowledge");
    expect(prompt).toContain("Standard reference data generally show");
    expect(prompt).toContain("never change variables, signs, conditions, or units silently");
    expect(prompt).toContain("Common Mistakes must use Mistake / Correction / Brief explanation");
    const repairPrompt = buildStudyNotePrecisionRepairSystemPrompt();
    expect(repairPrompt).toContain("orbital symmetry' alone is insufficient");
    expect(repairPrompt).toContain("never present it as a universal rule for every element");
    expect(repairPrompt).toContain("do not call this a simple numeric increase");
    expect(repairPrompt).toContain("Do not broaden a noble-gas exclusion");
  });

  it("checks precision in the affected section instead of accepting a disclaimer elsewhere", () => {
    const evidence = "Ionization energy and groups with valence electrons are discussed.";
    const note = `# Notes\n\n## Executive Summary\nFor main-group elements, group patterns matter.\n\n## Key Definitions\nIonization energy removes an electron from a neutral atom.\n\n## Key Concepts\nElements in the same group have the same number of valence electrons. Noble gases are excluded from ionization energy trends.\n\n## Relationships Between Concepts\nLinks.\n\n## Key Takeaways\n- Review.`;
    const issues = findStudyNotePrecisionIssues(note, evidence);
    expect(issues.join(" ")).toContain("neutral gaseous atom");
    expect(issues.join(" ")).toContain("main-group elements in every section");
    expect(issues.join(" ")).toContain("noble-gas exclusion");
  });

  it("requires successive-ionization precision for the periodic-table regression", () => {
    const evidence = "The periodic table lecture covers ionization energy and periodic trends.";
    const note = `# Notes\n\n## Executive Summary\nPeriodic trends.\n\n## Key Definitions\n**First ionization energy** – The energy required to remove the first electron from a neutral gaseous atom.\n\n## Key Concepts\nTrends.\n\n## Relationships Between Concepts\nLinks.\n\n## Key Takeaways\n- Review.`;
    const issues = findStudyNotePrecisionIssues(note, evidence).join(" ");
    expect(issues).toContain("increasingly positive gaseous ions");
    expect(issues).toContain("lower-energy core shell");
  });

  it("carries all earlier precision requirements into a later repair pass", () => {
    expect(mergeStudyNotePrecisionIssues(["first ionization", "main-group"], ["first ionization"])).toEqual([
      "first ionization",
      "main-group",
    ]);
  });

  it("safely qualifies universal group claims without changing specific group examples", () => {
    const corrected = applySafeStudyNotePrecisionCorrections([
      "- Elements in the same group have the same number of valence electrons.",
      "- **Group 1** elements each have one valence electron.",
    ].join("\n"));
    expect(corrected).toContain("For main-group elements, elements in the same group");
    expect(corrected).toContain("- **Group 1** elements each have one valence electron.");
  });

  it("preserves sparse and quantitative sources without manufacturing filler", () => {
    const prompt = buildAudioStudyNoteSystemPrompt("final");
    expect(prompt).toContain("do not manufacture definitions when the source contains very few");
    expect(prompt).toContain("retain the heading and state that plainly");
    expect(prompt).toContain("preserve formulas and quantitative rules exactly as supported");
    expect(prompt).toContain("Omit this optional section when no meaningful mistake or exception is supported");
    expect(prompt).toContain("never claim that something will be on an exam");
    expect(buildStudyNoteAuditSystemPrompt()).toContain("If the evidence contains no specialized terms");
  });

  it("detects conditional chemistry regressions and provides a constrained repair pass", () => {
    const evidence = "The lecture discusses ionization energy, successive ionization energies, a large jump, nitrogen and oxygen, groups and valence electrons, and electron affinity.";
    const flawed = `# Notes\n\n## Executive Summary\nSummary\n\n## Key Definitions\nIonization energy removes an electron from an atom.\n\n## Key Concepts\nElements in a group have the same valence electrons. Nitrogen has orbital symmetry. Electron affinity increases.\n\n## Relationships Between Concepts\nA large jump occurs.\n\n## Common Mistakes\n| Mistake | Correction |\n|---|---|\n| Wrong | Right |\n\n## Key Takeaways\n- Review.`;
    const issues = findStudyNotePrecisionIssues(flawed, evidence);
    expect(issues).toHaveLength(7);
    expect(issues.join(" ")).toContain("neutral gaseous atom");
    expect(issues.join(" ")).toContain("increasingly positive gaseous ions");
    expect(issues.join(" ")).toContain("main-group elements");
    expect(issues.join(" ")).toContain("paired-electron repulsion");
    expect(issues.join(" ")).toContain("sign/energy convention");
    expect(issues.join(" ")).toContain("Common Mistakes");
    expect(buildStudyNotePrecisionRepairSystemPrompt()).toContain("Fix every listed precision failure in every affected section");
  });

  it("rejects truncated or reasoning-only final notes", () => {
    expect(() => assertFinalStudyNoteStructure("<think>unfinished reasoning</think>")).toThrowError(AiNoteGenerationError);
    expect(() => assertFinalStudyNoteStructure("# Notes\n\n## Executive Summary\nShort")).toThrowError(AiNoteGenerationError);
  });

  it("accepts a complete final study-note skeleton", () => {
    expect(
      assertFinalStudyNoteStructure(
        "# Notes\n\n## Executive Summary\nSummary\n\n## Key Definitions\nTerms\n\n## Key Concepts\nConcepts\n\n## Relationships Between Concepts\nLinks\n\n## Key Takeaways\n- Review"
      )
    ).toContain("## Key Takeaways");
  });
});
