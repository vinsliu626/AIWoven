import type { PublicImpactStats } from "@/lib/analytics/publicStats";

export function hasMeaningfulPublicImpactStats(stats: PublicImpactStats): boolean {
  const hasRecordedActivity = [
    stats.studySessionsCompleted,
    stats.notesGenerated,
    stats.flashcardSetsCreated,
  ].some((value) => value > 0);

  return stats.studentsHelped > 0 && hasRecordedActivity;
}
