import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { flashcardSetInclude, requireFlashcardUserId, serializeFlashcardSet } from "@/lib/flashcards/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  title: z.string().trim().min(1).max(120),
  cards: z.array(z.object({ id: z.string().optional(), frontText: z.string().trim().min(1).max(5000), backText: z.string().trim().min(1).max(5000) })).min(1).max(200),
});

async function ownedSet(userId: string, id: string) {
  return prisma.flashcardSet.findFirst({ where: { id, userId }, include: flashcardSetInclude });
}

export async function GET(_request: Request, context: Context) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const set = await ownedSet(userId, id);
  if (!set) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json({ set: serializeFlashcardSet(set) });
}

export async function PATCH(request: Request, context: Context) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const current = await ownedSet(userId, id);
  if (!current) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FLASHCARD_SET", details: parsed.error.flatten() }, { status: 400 });

  const allowedIds = new Set(current.cards.map((card) => card.id));
  if (parsed.data.cards.some((card) => card.id && !allowedIds.has(card.id))) {
    return NextResponse.json({ error: "INVALID_CARD_ID" }, { status: 400 });
  }

  const keepIds = parsed.data.cards.flatMap((card) => card.id ? [card.id] : []);
  await prisma.$transaction(async (tx) => {
    await tx.flashcard.deleteMany({ where: { setId: id, id: { notIn: keepIds } } });
    // Move retained rows out of the final range first to avoid transient unique-position conflicts.
    for (let index = 0; index < keepIds.length; index += 1) {
      await tx.flashcard.update({ where: { id: keepIds[index] }, data: { position: 10000 + index } });
    }
    for (let position = 0; position < parsed.data.cards.length; position += 1) {
      const card = parsed.data.cards[position];
      if (card.id) {
        await tx.flashcard.update({ where: { id: card.id }, data: { frontText: card.frontText, backText: card.backText, position } });
      } else {
        await tx.flashcard.create({ data: { setId: id, frontText: card.frontText, backText: card.backText, position } });
      }
    }
    await tx.flashcardSet.update({ where: { id }, data: { title: parsed.data.title } });
  });
  const updated = await ownedSet(userId, id);
  return NextResponse.json({ set: serializeFlashcardSet(updated!) });
}

export async function DELETE(_request: Request, context: Context) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const set = await prisma.flashcardSet.findFirst({ where: { id, userId }, select: { id: true } });
  if (!set) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  await prisma.flashcardSet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
