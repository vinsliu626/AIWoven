import { describe, expect, it } from "vitest";

import type { PublicImpactStats } from "@/lib/analytics/publicStats";
import { hasMeaningfulPublicImpactStats } from "@/lib/analytics/publicStatsDisplay";

const emptyStats: PublicImpactStats = {
  studentsHelped: 0,
  studySessionsCompleted: 0,
  notesGenerated: 0,
  flashcardSetsCreated: 0,
  aiToolsAvailable: 6,
};

describe("public impact display threshold", () => {
  it("hides public impact when aggregate activity is empty", () => {
    expect(hasMeaningfulPublicImpactStats(emptyStats)).toBe(false);
  });

  it("does not treat the available tool count as student activity", () => {
    expect(hasMeaningfulPublicImpactStats({ ...emptyStats, studentsHelped: 1 })).toBe(false);
  });

  it("shows public impact when a real student and activity are present", () => {
    expect(hasMeaningfulPublicImpactStats({ ...emptyStats, studentsHelped: 1, notesGenerated: 1 })).toBe(true);
  });
});
