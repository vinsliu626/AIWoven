import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireFlashcardUserId } from "@/lib/flashcards/server";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  const userId = await requireFlashcardUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { id } = await context.params;
  const image = await prisma.flashcardImage.findFirst({
    where: { id, card: { set: { userId } } },
    select: { data: true, mimeType: true, fileName: true },
  });
  if (!image) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "content-type": image.mimeType,
      "content-disposition": `inline; filename="${image.fileName.replace(/["\\]/g, "")}"`,
      "cache-control": "private, max-age=3600",
      "x-content-type-options": "nosniff",
    },
  });
}
