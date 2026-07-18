import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFlashcardUserId } from "@/lib/flashcards/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxBytes = 2 * 1024 * 1024;

async function ownedCard(userId: string, cardId: string) {
  return prisma.flashcard.findFirst({ where: { id: cardId, set: { userId } }, select: { id: true } });
}

export async function POST(request: Request, context: Context) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  if (!await ownedCard(userId, id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const form = await request.formData();
  const file = form.get("file");
  const side = form.get("side");
  if (!(file instanceof File) || (side !== "front" && side !== "back")) return NextResponse.json({ error: "INVALID_UPLOAD" }, { status: 400 });
  if (!allowedTypes.has(file.type) || file.size <= 0 || file.size > maxBytes) return NextResponse.json({ error: "INVALID_IMAGE", message: "Use a JPG, PNG, WebP, or GIF image up to 2 MB." }, { status: 400 });
  const data = Buffer.from(await file.arrayBuffer());
  const image = await prisma.flashcardImage.upsert({
    where: { cardId_side: { cardId: id, side } },
    create: { cardId: id, side, fileName: file.name.slice(0, 180), mimeType: file.type, sizeBytes: file.size, data },
    update: { fileName: file.name.slice(0, 180), mimeType: file.type, sizeBytes: file.size, data },
    select: { id: true, side: true, fileName: true, mimeType: true, sizeBytes: true },
  });
  return NextResponse.json({ image: { ...image, url: `/api/flashcards/images/${image.id}` } });
}

export async function DELETE(request: Request, context: Context) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  if (!await ownedCard(userId, id)) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  const side = new URL(request.url).searchParams.get("side");
  if (side !== "front" && side !== "back") return NextResponse.json({ error: "INVALID_SIDE" }, { status: 400 });
  await prisma.flashcardImage.deleteMany({ where: { cardId: id, side } });
  return NextResponse.json({ ok: true });
}
