/**
 * READ-ONLY report of AI Note processing data by retention state.
 *
 * Counts sessions, stored audio bytes, transcripts, and segment ledgers that
 * would be eligible for deletion under the proposed policy in
 * lib/aiNote/retention.ts. It never deletes or updates anything, and it prints
 * only counts and sizes (no user IDs, audio, or transcript text).
 *
 *   npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/ai-note-retention-report.ts
 */
import { PrismaClient } from "@prisma/client";

import { classifyAiNoteRetention, AI_NOTE_RETENTION_PROPOSAL, type AiNoteRetentionState } from "../lib/aiNote/retention";

const prisma = new PrismaClient({ log: ["error", "warn"] });
const PAGE_SIZE = 500;

type Bucket = { sessions: number; eligibleSessions: number; audioBytes: number; eligibleAudioBytes: number; transcripts: number; ledgers: number };

async function main() {
  const now = new Date();
  const buckets = new Map<AiNoteRetentionState, Bucket>();
  const bucket = (state: AiNoteRetentionState) => {
    if (!buckets.has(state)) buckets.set(state, { sessions: 0, eligibleSessions: 0, audioBytes: 0, eligibleAudioBytes: 0, transcripts: 0, ledgers: 0 });
    return buckets.get(state)!;
  };

  let cursor: string | undefined;
  for (;;) {
    const sessions = await prisma.aiNoteSession.findMany({
      select: { id: true, createdAt: true },
      orderBy: { id: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (sessions.length === 0) break;
    cursor = sessions[sessions.length - 1].id;
    const ids = sessions.map((session) => session.id);

    const [jobs, chunks, transcripts, ledgers] = await Promise.all([
      prisma.aiNoteJob.findMany({ where: { noteId: { in: ids } }, select: { noteId: true, stage: true, updatedAt: true } }),
      prisma.aiNoteChunk.groupBy({ by: ["noteId"], where: { noteId: { in: ids } }, _sum: { size: true }, _max: { createdAt: true } }),
      prisma.aiNoteTranscript.groupBy({ by: ["noteId"], where: { noteId: { in: ids } }, _count: { _all: true } }),
      prisma.aiNoteSummaryPart.groupBy({ by: ["noteId"], where: { noteId: { in: ids } }, _count: { _all: true } }),
    ]);
    const jobBy = new Map(jobs.map((job) => [job.noteId, job]));
    const chunkBy = new Map(chunks.map((row) => [row.noteId, row]));
    const transcriptBy = new Map(transcripts.map((row) => [row.noteId, row._count._all]));
    const ledgerBy = new Map(ledgers.map((row) => [row.noteId, row._count._all]));

    for (const session of sessions) {
      const job = jobBy.get(session.id) ?? null;
      const chunk = chunkBy.get(session.id);
      const decision = classifyAiNoteRetention({ sessionCreatedAt: session.createdAt, lastChunkAt: chunk?._max.createdAt ?? null, job }, now);
      const row = bucket(decision.state);
      const audioBytes = chunk?._sum.size ?? 0;
      row.sessions += 1;
      row.audioBytes += audioBytes;
      row.transcripts += transcriptBy.get(session.id) ?? 0;
      row.ledgers += ledgerBy.get(session.id) ?? 0;
      if (decision.processingDataEligible) {
        row.eligibleSessions += 1;
        row.eligibleAudioBytes += audioBytes;
      }
    }
  }

  console.log(`AI Note retention report (read-only) at ${now.toISOString()}`);
  console.log(`Proposed policy: ${JSON.stringify(AI_NOTE_RETENTION_PROPOSAL)}`);
  if (buckets.size === 0) console.log("No AI Note sessions found.");
  else console.table(
    Object.fromEntries(
      [...buckets.entries()].map(([state, row]) => [
        state,
        { ...row, audioMB: Math.round(row.audioBytes / 1e5) / 10, eligibleAudioMB: Math.round(row.eligibleAudioBytes / 1e5) / 10 },
      ])
    )
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
