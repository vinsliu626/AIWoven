import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { flashcardSetInclude, requireFlashcardUserId, serializeFlashcardSet } from "@/lib/flashcards/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  cards: z.array(z.object({ frontText: z.string().trim().min(1).max(5000), backText: z.string().trim().min(1).max(5000) })).min(1).max(200),
});

export async function GET() {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const sets = await prisma.flashcardSet.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: flashcardSetInclude,
  });
  return NextResponse.json({ sets: sets.map(serializeFlashcardSet) });
}

export async function POST(request: Request) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FLASHCARD_SET", details: parsed.error.flatten() }, { status: 400 });
  const set = await prisma.flashcardSet.create({
    data: {
      userId,
      title: parsed.data.title,
      cards: { create: parsed.data.cards.map((card, position) => ({ ...card, position })) },
    },
    include: flashcardSetInclude,
  });
  return NextResponse.json({ set: serializeFlashcardSet(set) }, { status: 201 });
}
