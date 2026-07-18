import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireFlashcardUserId() {
  const session = await getServerSession(authOptions);
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null;
}

export const flashcardSetInclude = {
  cards: {
    orderBy: { position: "asc" as const },
    include: {
      images: {
        select: { id: true, side: true, fileName: true, mimeType: true, sizeBytes: true },
      },
    },
  },
};

export function serializeFlashcardSet<T extends {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  cards: Array<{
    id: string;
    frontText: string;
    backText: string;
    position: number;
    images: Array<{ id: string; side: string; fileName: string; mimeType: string; sizeBytes: number }>;
  }>;
}>(set: T) {
  return {
    ...set,
    createdAt: set.createdAt.toISOString(),
    updatedAt: set.updatedAt.toISOString(),
    cards: set.cards.map((card) => ({
      ...card,
      images: card.images.map((image) => ({
        ...image,
        url: `/api/flashcards/images/${image.id}`,
      })),
    })),
  };
}
