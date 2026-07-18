import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { StudyGenerationResult, StudyMode, StudyQuizType } from "./types";
import { studyCardsFromResult } from "./material";

export type StudySessionListItem = {
  id: string;
  title: string;
  fileName: string | null;
  selectedModes: StudyMode[];
  selectedQuizTypes: StudyQuizType[];
  status: string;
  errorSummary: string | null;
  itemCount: number;
  flashcardSetId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function isStudySessionTableMissing(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2021") {
    const table = String((error.meta as { table?: unknown } | undefined)?.table ?? "");
    if (table.includes("StudySession")) return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("StudySession") && message.includes("does not exist");
}

export async function listStudySessions(userId: string): Promise<StudySessionListItem[]> {
  try {
    const rows = await prisma.studySession.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
      select: {
        id: true,
        title: true,
        fileName: true,
        selectedModes: true,
        selectedQuizTypes: true,
        status: true,
        errorSummary: true,
        resultJson: true,
        flashcardSet: { select: { id: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    return rows.map((row) => {
      const result = row.resultJson as StudyGenerationResult | null;
      const selectedModes = (row.selectedModes as StudyMode[]) ?? [];
      const outputType = selectedModes[0];
      const itemCount = outputType === "notes" ? result?.notes?.length ?? 0 : outputType === "quiz" ? studyCardsFromResult(result ?? emptyResult()).length : result?.flashcards?.length ?? 0;
      return {
        id: row.id,
        title: row.title,
        fileName: row.fileName,
        selectedModes,
        selectedQuizTypes: (row.selectedQuizTypes as StudyQuizType[]) ?? [],
        status: row.status,
        errorSummary: row.errorSummary,
        itemCount,
        flashcardSetId: row.flashcardSet?.id ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    });
  } catch (error) {
    if (isStudySessionTableMissing(error)) {
      console.warn("[study.history] StudySession table missing; returning empty history");
      return [];
    }
    throw error;
  }
}

export async function getStudySessionById(userId: string, id: string) {
  try {
    const row = await prisma.studySession.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        fileName: true,
        fileSizeBytes: true,
        mimeType: true,
        selectedModes: true,
        selectedQuizTypes: true,
        resultJson: true,
        status: true,
        errorSummary: true,
        flashcardSet: { select: { id: true } },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!row) return null;
    return {
      ...row,
      selectedModes: (row.selectedModes as StudyMode[]) ?? [],
      selectedQuizTypes: (row.selectedQuizTypes as StudyQuizType[]) ?? [],
      resultJson: row.resultJson as StudyGenerationResult | null,
      flashcardSetId: row.flashcardSet?.id ?? null,
    };
  } catch (error) {
    if (isStudySessionTableMissing(error)) {
      console.warn("[study.history] StudySession table missing; get by id disabled");
      return null;
    }
    throw error;
  }
}

export async function createStudySession(input: {
  userId: string;
  title: string;
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  selectedModes: StudyMode[];
  selectedQuizTypes?: StudyQuizType[];
  result?: StudyGenerationResult;
  status?: "PROCESSING" | "COMPLETED" | "FAILED";
}) {
  try {
    return await prisma.studySession.create({
      data: {
        userId: input.userId,
        title: input.title,
        fileName: input.fileName ?? null,
        fileSizeBytes: input.fileSizeBytes ?? null,
        mimeType: input.mimeType ?? null,
        selectedModes: input.selectedModes,
        selectedQuizTypes: input.selectedQuizTypes ?? [],
        resultJson: input.result ?? Prisma.JsonNull,
        status: input.status ?? (input.result ? "COMPLETED" : "PROCESSING"),
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        selectedModes: true,
        selectedQuizTypes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isStudySessionTableMissing(error)) {
      console.warn("[study.history] StudySession table missing; skipping persistence");
      return null;
    }
    throw error;
  }
}

function emptyResult(): StudyGenerationResult {
  return { meta: { selectedModes: [], generatedCounts: {}, truncated: false, originalCharCount: 0, usedCharCount: 0 } };
}

export async function completeStudySession(input: {
  userId: string;
  id: string;
  title: string;
  result: StudyGenerationResult;
}) {
  const cards = studyCardsFromResult(input.result);
  return prisma.$transaction(async (tx) => {
    const owned = await tx.studySession.findFirst({ where: { id: input.id, userId: input.userId }, select: { id: true } });
    if (!owned) return null;

    const session = await tx.studySession.update({
      where: { id: input.id },
      data: { resultJson: input.result, status: "COMPLETED", errorSummary: null },
      select: { id: true, title: true, fileName: true, selectedModes: true, selectedQuizTypes: true, status: true, createdAt: true, updatedAt: true },
    });

    let flashcardSetId: string | null = null;
    if (cards.length > 0) {
      const set = await tx.flashcardSet.upsert({
        where: { studySessionId: input.id },
        create: {
          userId: input.userId,
          title: input.title,
          studySessionId: input.id,
          cards: { create: cards.map((card, position) => ({ ...card, position })) },
        },
        update: {
          title: input.title,
          cards: { deleteMany: {}, create: cards.map((card, position) => ({ ...card, position })) },
        },
        select: { id: true },
      });
      flashcardSetId = set.id;
    }

    return { ...session, flashcardSetId };
  });
}

export async function failStudySession(userId: string, id: string, errorSummary: string) {
  return prisma.studySession.updateMany({
    where: { id, userId, status: "PROCESSING" },
    data: { status: "FAILED", errorSummary: errorSummary.slice(0, 280) },
  });
}

export async function renameStudySession(userId: string, id: string, title: string) {
  try {
    return await prisma.studySession.updateMany({
      where: { id, userId },
      data: { title },
    });
  } catch (error) {
    if (isStudySessionTableMissing(error)) {
      console.warn("[study.history] StudySession table missing; rename disabled");
      return { count: 0 };
    }
    throw error;
  }
}

export async function deleteStudySession(userId: string, id: string) {
  try {
    return await prisma.studySession.deleteMany({ where: { id, userId } });
  } catch (error) {
    if (isStudySessionTableMissing(error)) {
      console.warn("[study.history] StudySession table missing; delete disabled");
      return { count: 0 };
    }
    throw error;
  }
}
