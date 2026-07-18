export type FlashcardImageSide = "front" | "back";

export type ManualFlashcard = {
  id: string;
  frontText: string;
  backText: string;
  position: number;
  images: Array<{ id: string; side: FlashcardImageSide; fileName: string; mimeType: string; sizeBytes: number; url: string }>;
};

export type ManualFlashcardSet = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  cards: ManualFlashcard[];
};
