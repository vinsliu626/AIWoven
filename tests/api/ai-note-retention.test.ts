import { describe, expect, it } from "vitest";

import { AI_NOTE_RETENTION_PROPOSAL, classifyAiNoteRetention } from "@/lib/aiNote/retention";

const NOW = new Date("2026-10-15T12:00:00Z");
const hoursAgo = (hours: number) => new Date(NOW.getTime() - hours * 60 * 60 * 1000);

describe("AI Note retention eligibility (decides only; deletes nothing)", () => {
  it("uses the proposed periods", () => {
    expect(AI_NOTE_RETENTION_PROPOSAL).toEqual({ abandonedSessionHours: 24, stalledJobDays: 7 });
  });

  it("completed notes: processing data is eligible immediately (the note itself is kept)", () => {
    expect(classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(1), job: { stage: "done", updatedAt: hoursAgo(0.5) } }, NOW)).toEqual({
      state: "completed",
      processingDataEligible: true,
      eligibleAt: null,
    });
  });

  it("sessions that never reached finalize: eligible only after 24 h without activity", () => {
    expect(classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(23), job: null }, NOW)).toMatchObject({ state: "in_progress", processingDataEligible: false });
    expect(classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(25), job: null }, NOW)).toMatchObject({ state: "abandoned", processingDataEligible: true });
  });

  it("a long recording that is still uploading is not treated as abandoned", () => {
    expect(classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(30), lastChunkAt: hoursAgo(0.1), job: null }, NOW)).toMatchObject({
      state: "in_progress",
      processingDataEligible: false,
    });
  });

  it("unfinished jobs (failed or interrupted): kept 7 days after the last update so the user can retry", () => {
    for (const stage of ["prep", "asr", "llm", "merge", "failed"]) {
      expect(classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(200), job: { stage, updatedAt: hoursAgo(6 * 24) } }, NOW)).toMatchObject({
        state: "in_progress",
        processingDataEligible: false,
      });
      expect(classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(200), job: { stage, updatedAt: hoursAgo(7 * 24 + 1) } }, NOW)).toMatchObject({
        state: "stalled",
        processingDataEligible: true,
      });
    }
  });

  it("reports when data becomes eligible, and honours a different approved policy", () => {
    const decision = classifyAiNoteRetention({ sessionCreatedAt: hoursAgo(1), job: null }, NOW, { abandonedSessionHours: 2, stalledJobDays: 1 });
    expect(decision.eligibleAt?.toISOString()).toBe(new Date(hoursAgo(1).getTime() + 2 * 60 * 60 * 1000).toISOString());
    expect(decision.processingDataEligible).toBe(false);
  });
});
