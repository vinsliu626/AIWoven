import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type PublicImpactStats = {
  studentsHelped: number;
  studySessionsCompleted: number;
  notesGenerated: number;
  flashcardSetsCreated: number;
  aiToolsAvailable: number;
};

const EMPTY_STATS: PublicImpactStats = {
  studentsHelped: 0,
  studySessionsCompleted: 0,
  notesGenerated: 0,
  flashcardSetsCreated: 0,
  aiToolsAvailable: 6,
};

async function queryPublicImpactStats(): Promise<PublicImpactStats> {
  try {
    const [studentRows, studyRows, noteRows, flashcardRows] = await Promise.all([
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(DISTINCT "user_id") AS count
        FROM "feature_usage_events"
        WHERE "success" = true
          AND "user_id" IS NOT NULL
          AND LOWER("user_id") NOT LIKE '%.test'
          AND "feature_key" IN ('note', 'detect', 'study', 'humanizer', 'converter')
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "feature_usage_events"
        WHERE "success" = true AND "feature_key" = 'study'
          AND "user_id" IS NOT NULL AND LOWER("user_id") NOT LIKE '%.test'
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "feature_usage_events"
        WHERE "success" = true AND "feature_key" = 'note'
          AND "user_id" IS NOT NULL AND LOWER("user_id") NOT LIKE '%.test'
      `),
      prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
        SELECT COUNT(*) AS count FROM "StudySession"
        WHERE 'flashcards' = ANY("selectedModes")
          AND LOWER("userId") NOT LIKE '%.test'
      `),
    ]);

    return {
      studentsHelped: Number(studentRows[0]?.count ?? 0),
      studySessionsCompleted: Number(studyRows[0]?.count ?? 0),
      notesGenerated: Number(noteRows[0]?.count ?? 0),
      flashcardSetsCreated: Number(flashcardRows[0]?.count ?? 0),
      aiToolsAvailable: EMPTY_STATS.aiToolsAvailable,
    };
  } catch (error) {
    console.warn("[analytics.public] aggregate stats unavailable", {
      message: error instanceof Error ? error.message : String(error),
    });
    return EMPTY_STATS;
  }
}

export const getPublicImpactStats = unstable_cache(queryPublicImpactStats, ["aiwoven-public-impact-v3"], {
  revalidate: 300,
});
